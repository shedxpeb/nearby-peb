from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import MessageCreate, TicketCreate
from ..security import current_identity
from .workers import worker_id
from .customers import customer_id

router = APIRouter(prefix="/api/support", tags=["support"])


async def owner(request: Request, identity: dict) -> tuple[str, UUID, str, str]:
    """Returns (ticket column, owner uuid, sender type, raw id string) for the caller's role."""
    if identity.get("role") == "CUSTOMER":
        cid = await customer_id(request, identity)
        return "customer_id", UUID(cid), "CUSTOMER", cid
    wid = await worker_id(request, identity)
    return "worker_id", UUID(wid), "WORKER", wid


async def owns_job(conn, role_column: str, owner_id: UUID, job_id: str) -> bool:
    if role_column == "customer_id":
        return bool(await conn.fetchval("SELECT 1 FROM jobs WHERE id=$1 AND customer_id=$2", UUID(job_id), owner_id))
    return bool(await conn.fetchval(
        "SELECT 1 FROM jobs j LEFT JOIN job_assignments a ON a.job_id=j.id LEFT JOIN job_requests r ON r.job_id=j.id WHERE j.id=$1 AND (a.worker_id=$2 OR r.worker_id=$2)",
        UUID(job_id), owner_id))


@router.get("/tickets")
async def tickets(request: Request, identity: dict = Depends(current_identity)):
    column, oid, _, _ = await owner(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch(f"SELECT * FROM support_tickets WHERE {column}=$1 ORDER BY created_at DESC", oid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/tickets/{ticket_id}")
async def ticket(ticket_id: str, request: Request, identity: dict = Depends(current_identity)):
    column, oid, _, _ = await owner(request, identity)
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow(f"SELECT * FROM support_tickets WHERE id=$1 AND {column}=$2", UUID(ticket_id), oid)
        if not row: raise HTTPException(404, {"code": "TICKET_NOT_FOUND", "message": "Support ticket not found."})
        messages = await conn.fetch("SELECT * FROM support_messages WHERE ticket_id=$1 ORDER BY created_at", UUID(ticket_id))
    data = row_to_dict(row); data["messages"] = [row_to_dict(x) for x in messages]
    return {"success": True, "data": data}


@router.post("/tickets")
async def create_ticket(payload: TicketCreate, request: Request, identity: dict = Depends(current_identity)):
    column, oid, _, raw_id = await owner(request, identity)
    async with transaction(require_pool(request)) as conn:
        if payload.job_id and not await owns_job(conn, column, oid, payload.job_id):
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Job was not found for this account."})
        number = f"SDX-{await conn.fetchval('SELECT COALESCE(MAX((substring(ticket_number from 5))::int),1000)+1 FROM support_tickets')}"
        row = await conn.fetchrow(
            f"INSERT INTO support_tickets(ticket_number,{column},job_id,category,priority,subject,description) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
            number, oid, UUID(payload.job_id) if payload.job_id else None, payload.category, payload.priority, payload.subject, payload.description)
    return {"success": True, "data": row_to_dict(row)}


@router.post("/tickets/{ticket_id}/messages")
async def message(ticket_id: str, payload: MessageCreate, request: Request, identity: dict = Depends(current_identity)):
    column, oid, sender, raw_id = await owner(request, identity)
    async with transaction(require_pool(request)) as conn:
        owns = await conn.fetchval(f"SELECT 1 FROM support_tickets WHERE id=$1 AND {column}=$2", UUID(ticket_id), oid)
        if not owns: raise HTTPException(404, {"code": "TICKET_NOT_FOUND", "message": "Support ticket not found."})
        row = await conn.fetchrow("INSERT INTO support_messages(ticket_id,sender_type,sender_id,message,attachment_url) VALUES($1,$2,$3,$4,$5) RETURNING *", UUID(ticket_id), sender, UUID(raw_id), payload.message, payload.attachment_url)
    return {"success": True, "data": row_to_dict(row)}
