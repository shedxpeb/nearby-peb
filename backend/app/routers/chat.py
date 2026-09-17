from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import ChatMessageCreate
from ..security import current_identity
from ..security_portal import require_customer, require_worker
from .workers import worker_id
from .customers import customer_id

router = APIRouter(prefix="/api/jobs", tags=["chat"])


async def get_or_create_conversation(conn, job_id, customer_id, worker_id):
    """Get existing conversation or create one for the job"""
    # Pass values directly - asyncpg handles UUID conversion natively
    conversation = await conn.fetchrow(
        "SELECT * FROM job_conversations WHERE job_id=$1", job_id
    )
    if not conversation:
        # Verify job has assignment
        assignment = await conn.fetchrow(
            "SELECT * FROM job_assignments WHERE job_id=$1 AND worker_id=$2",
            job_id, worker_id
        )
        if not assignment:
            raise HTTPException(404, {"code": "NO_ASSIGNMENT", "message": "Job has no assigned worker."})
        
        conversation = await conn.fetchrow(
            """INSERT INTO job_conversations(job_id, customer_id, worker_id)
               VALUES($1, $2, $3) RETURNING *""",
            job_id, customer_id, worker_id
        )
    return conversation


@router.get("/{job_id}/conversation")
async def get_conversation(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    """Get or create conversation for a job"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            # Verify customer owns the job
            job = await conn.fetchrow(
                "SELECT id, customer_id FROM jobs WHERE id=$1 AND customer_id=$2",
                job_id, cid
            )
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
            
            # Get assignment to find worker
            assignment = await conn.fetchrow(
                "SELECT worker_id FROM job_assignments WHERE job_id=$1", job_id
            )
            if not assignment:
                raise HTTPException(404, {"code": "NO_ASSIGNMENT", "message": "Job has no assigned worker."})
            
            conversation = await get_or_create_conversation(conn, job_id, cid, assignment["worker_id"])
            
            # Get worker details
            worker = await conn.fetchrow(
                """SELECT w.id, w.full_name, w.profile_photo_url, w.primary_trade, u.phone
                   FROM workers w JOIN users u ON u.id=w.user_id WHERE w.id=$1""",
                assignment["worker_id"]
            )
            data = row_to_dict(conversation)
            data["worker"] = row_to_dict(worker)
            
        else:  # WORKER
            wid = await worker_id(request, identity)
            # Verify worker is assigned to the job
            assignment = await conn.fetchrow(
                "SELECT job_id, worker_id FROM job_assignments WHERE job_id=$1 AND worker_id=$2",
                job_id, wid
            )
            if not assignment:
                raise HTTPException(404, {"code": "NOT_ASSIGNED", "message": "You are not assigned to this job."})
            
            # Get job to find customer
            job = await conn.fetchrow(
                "SELECT id, customer_id FROM jobs WHERE id=$1", job_id
            )
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
            
            conversation = await get_or_create_conversation(conn, job_id, job["customer_id"], wid)
            
            # Get customer details
            customer = await conn.fetchrow(
                """SELECT c.id, c.full_name, c.company_name, u.phone
                   FROM customers c JOIN users u ON u.id=c.user_id WHERE c.id=$1""",
                job["customer_id"]
            )
            data = row_to_dict(conversation)
            data["customer"] = row_to_dict(customer)
    
    return {"success": True, "data": data}


@router.get("/{job_id}/messages")
async def get_messages(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    """Get messages for a job conversation"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            # Verify customer owns the job
            job = await conn.fetchrow(
                "SELECT id FROM jobs WHERE id=$1 AND customer_id=$2",
                job_id, cid
            )
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        else:  # WORKER
            wid = await worker_id(request, identity)
            # Verify worker is assigned to the job
            assignment = await conn.fetchrow(
                "SELECT job_id FROM job_assignments WHERE job_id=$1 AND worker_id=$2",
                job_id, wid
            )
            if not assignment:
                raise HTTPException(404, {"code": "NOT_ASSIGNED", "message": "You are not assigned to this job."})
        
        # Get conversation
        conversation = await conn.fetchrow(
            "SELECT id FROM job_conversations WHERE job_id=$1", job_id
        )
        if not conversation:
            return {"success": True, "data": {"messages": []}}
        
        # Get messages
        messages = await conn.fetch(
            """SELECT jm.*, 
               CASE 
                 WHEN c.full_name IS NOT NULL THEN c.full_name
                 WHEN w.full_name IS NOT NULL THEN w.full_name
                 ELSE 'Unknown'
               END as sender_name,
               u.role as sender_role
               FROM job_messages jm
               LEFT JOIN users u ON u.id=jm.sender_user_id
               LEFT JOIN customers c ON c.user_id=jm.sender_user_id
               LEFT JOIN workers w ON w.user_id=jm.sender_user_id
               WHERE jm.conversation_id=$1
               ORDER BY jm.created_at ASC""",
            conversation["id"]
        )
        
        # Mark messages as read for the current user
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            await conn.execute(
                """UPDATE job_messages SET read_at=$1
                   WHERE conversation_id=$2 AND sender_role='WORKER' AND read_at IS NULL""",
                datetime.now(timezone.utc), conversation["id"]
            )
        else:  # WORKER
            wid = await worker_id(request, identity)
            await conn.execute(
                """UPDATE job_messages SET read_at=$1
                   WHERE conversation_id=$2 AND sender_role='CUSTOMER' AND read_at IS NULL""",
                datetime.now(timezone.utc), conversation["id"]
            )
    
    return {"success": True, "data": {"messages": [row_to_dict(m) for m in messages]}}


@router.post("/{job_id}/messages")
async def send_message(job_id: str, payload: ChatMessageCreate, request: Request, identity: dict = Depends(current_identity)):
    """Send a message in a job conversation"""
    pool = require_pool(request)
    async with transaction(pool) as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            # Verify customer owns the job
            job = await conn.fetchrow(
                "SELECT id, customer_id FROM jobs WHERE id=$1 AND customer_id=$2",
                job_id, cid
            )
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
            
            # Get assignment to find worker
            assignment = await conn.fetchrow(
                "SELECT worker_id FROM job_assignments WHERE job_id=$1", job_id
            )
            if not assignment:
                raise HTTPException(404, {"code": "NO_ASSIGNMENT", "message": "Job has no assigned worker."})
            
            conversation = await get_or_create_conversation(conn, job_id, cid, assignment["worker_id"])
            # Get user_id from customer_id
            customer_user = await conn.fetchrow("SELECT user_id FROM customers WHERE id=$1", cid)
            sender_user_id = customer_user["user_id"]
            sender_role = "CUSTOMER"
            notify_recipient_id = assignment["worker_id"]
            notify_recipient_role = "worker"
            
        else:  # WORKER
            wid = await worker_id(request, identity)
            # Verify worker is assigned to the job
            assignment = await conn.fetchrow(
                "SELECT job_id, worker_id FROM job_assignments WHERE job_id=$1 AND worker_id=$2",
                job_id, wid
            )
            if not assignment:
                raise HTTPException(404, {"code": "NOT_ASSIGNED", "message": "You are not assigned to this job."})
            
            # Get job to find customer
            job = await conn.fetchrow(
                "SELECT id, customer_id FROM jobs WHERE id=$1", job_id
            )
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
            
            conversation = await get_or_create_conversation(conn, job_id, job["customer_id"], wid)
            # Get user_id from worker_id
            worker_user = await conn.fetchrow("SELECT user_id FROM workers WHERE id=$1", wid)
            sender_user_id = worker_user["user_id"]
            sender_role = "WORKER"
            notify_recipient_id = job["customer_id"]
            notify_recipient_role = "customer"
        
        # Create message
        message = await conn.fetchrow(
            """INSERT INTO job_messages(conversation_id, sender_user_id, sender_role, message_text)
               VALUES($1, $2, $3, $4) RETURNING *""",
            conversation["id"], sender_user_id, sender_role, payload.message_text
        )
        
        # Update conversation timestamp
        await conn.execute(
            "UPDATE job_conversations SET updated_at=NOW() WHERE id=$1",
            conversation["id"]
        )
        
        # Create notification for recipient
        if notify_recipient_role == "worker":
            await conn.execute(
                """INSERT INTO notifications(worker_id, type, title, message, entity_type, entity_id)
                   VALUES($1, 'CUSTOMER_MESSAGE', 'New message', $2, 'JOB', $3)""",
                notify_recipient_id, f"New message from customer.", job_id
            )
        else:
            await conn.execute(
                """INSERT INTO notifications(customer_id, type, title, message, entity_type, entity_id)
                   VALUES($1, 'CUSTOMER_MESSAGE', 'New message', $2, 'JOB', $3)""",
                notify_recipient_id, f"New message from your service professional.", job_id
            )
    
    return {"success": True, "data": row_to_dict(message)}
