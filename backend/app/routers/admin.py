from datetime import datetime, timezone
from json import dumps
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from ..database import require_pool, transaction, row_to_dict
from ..schemas import WorkerCreate
from ..security import hash_password
from ..security_portal import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AssignWorkerRequest(BaseModel):
    worker_id: str = Field(..., description="Worker ID to assign")
    notes: str | None = Field(None, max_length=500, description="Optional assignment notes")


class ReassignWorkerRequest(BaseModel):
    worker_id: str = Field(..., description="New worker ID to assign")
    notes: str | None = Field(None, max_length=500, description="Optional reassignment notes")


@router.get("/jobs")
async def list_jobs(
    request: Request,
    status: str = Query(default="", max_length=30),
    service: str = Query(default="", max_length=120),
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    search: str = Query(default="", max_length=120),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: dict = Depends(require_admin)
):
    """List all customer service requests with filters"""
    pool = require_pool(request)
    params: list = []
    conditions = []
    
    if status:
        conditions.append("j.status = ${}::varchar")
        params.append(status)
    
    if service:
        conditions.append("j.service_type ILIKE ${}")
        params.append(f"%{service}%")
    
    if search:
        conditions.append("(j.title ILIKE ${} OR j.job_number ILIKE ${} OR c.full_name ILIKE ${} OR cs.site_name ILIKE ${})")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param, search_param])
    
    if date_from:
        conditions.append("j.created_at >= ${}::timestamptz")
        params.append(date_from)
    
    if date_to:
        conditions.append("j.created_at <= ${}::timestamptz")
        params.append(date_to)
    
    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)
    
    # Add parameters for LIMIT and OFFSET
    params.extend([limit, offset])
    
    async with pool.acquire() as conn:
        total_query = f"SELECT COUNT(*) FROM jobs j LEFT JOIN customers c ON c.id=j.customer_id LEFT JOIN customer_sites cs ON cs.id=j.site_id LEFT JOIN users u ON u.id=c.user_id {where_clause}"
        total = await conn.fetchval(total_query, *params[:-2])
        
        data_query = f"""
            SELECT j.*, c.full_name AS customer_name, c.company_name, u.phone AS customer_phone, u.email AS customer_email,
                   cs.site_name, cs.address_line, cs.city, cs.state, cs.contact_name AS site_contact_name, cs.contact_phone AS site_contact_phone,
                   w.full_name AS worker_name, w.primary_trade, uw.phone AS worker_phone, w.rating_avg AS worker_rating,
                   ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at AS assignment_completed_at
            FROM jobs j 
            LEFT JOIN customers c ON c.id=j.customer_id 
            LEFT JOIN users u ON u.id=c.user_id
            LEFT JOIN customer_sites cs ON cs.id=j.site_id
            LEFT JOIN job_assignments ja ON ja.job_id=j.id
            LEFT JOIN workers w ON w.id=ja.worker_id
            LEFT JOIN users uw ON uw.id=w.user_id
            {where_clause} 
            ORDER BY j.created_at DESC LIMIT ${len(params)-1} OFFSET ${len(params)}
        """
        rows = await conn.fetch(data_query, *params)
    
    return {"success": True, "data": {"total": total, "items": [row_to_dict(x) for x in rows]}}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request, _: dict = Depends(require_admin)):
    """Get detailed information about a specific job"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        job = await conn.fetchrow(
            """SELECT j.*, c.full_name AS customer_name, c.company_name, u.phone AS customer_phone, u.email AS customer_email,
                   cs.site_name, cs.address_line, cs.city, cs.state, cs.postal_code, cs.latitude, cs.longitude,
                   cs.contact_name AS site_contact_name, cs.contact_phone AS site_contact_phone, cs.notes AS site_notes,
                   w.full_name AS worker_name, w.primary_trade, uw.phone AS worker_phone, uw.email AS worker_email,
                   w.rating_avg, w.rating_count, w.profile_photo_url,
                   ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at AS assignment_completed_at
            FROM jobs j 
            LEFT JOIN customers c ON c.id=j.customer_id 
            LEFT JOIN users u ON u.id=c.user_id
            LEFT JOIN customer_sites cs ON cs.id=j.site_id
            LEFT JOIN job_assignments ja ON ja.job_id=j.id
            LEFT JOIN workers w ON w.id=ja.worker_id
            LEFT JOIN users uw ON uw.id=w.user_id
            WHERE j.id=$1""", UUID(job_id))
        
        if not job:
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        
        data = row_to_dict(job)
        
        # Get attachments
        data["attachments"] = [row_to_dict(x) for x in await conn.fetch("SELECT * FROM job_attachments WHERE job_id=$1 ORDER BY created_at", UUID(job_id))]
        
        # Get assignment history
        data["assignment_history"] = [row_to_dict(x) for x in await conn.fetch(
            """SELECT ja.*, w.full_name AS worker_name, w.primary_trade, u.phone AS worker_phone
               FROM job_assignments ja 
               JOIN workers w ON w.id=ja.worker_id 
               JOIN users u ON u.id=w.user_id
               WHERE ja.job_id=$1 ORDER BY ja.assigned_at DESC""", UUID(job_id))]
        
        # Get status history
        data["status_history"] = [row_to_dict(x) for x in await conn.fetch(
            """SELECT jsh.*, w.full_name AS worker_name
               FROM job_status_history jsh 
               LEFT JOIN workers w ON w.id=jsh.worker_id
               WHERE jsh.job_id=$1 ORDER BY jsh.created_at DESC""", UUID(job_id))]
    
    return {"success": True, "data": data}


@router.get("/workers")
async def list_workers(
    request: Request,
    search: str = Query(default="", max_length=120),
    skill: str = Query(default="", max_length=160),
    service_area: str = Query(default="", max_length=160),
    availability: str = Query(default="", max_length=20),
    profile_complete: str = Query(default=""),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: dict = Depends(require_admin)
):
    """List all workers with filters"""
    pool = require_pool(request)
    params: list = []
    conditions = ["w.deleted_at IS NULL"]
    
    if search:
        conditions.append("(w.full_name ILIKE ${} OR u.phone ILIKE ${} OR w.primary_trade ILIKE ${})")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])
    
    if skill:
        conditions.append("EXISTS (SELECT 1 FROM worker_skills ws JOIN skills s ON s.id=ws.skill_id WHERE ws.worker_id=w.id AND s.name ILIKE ${})")
        params.append(f"%{skill}%")
    
    if service_area:
        conditions.append("EXISTS (SELECT 1 FROM worker_service_areas wsa JOIN service_areas sa ON sa.id=wsa.service_area_id WHERE wsa.worker_id=w.id AND (sa.name ILIKE ${} OR sa.city ILIKE ${}))")
        area_param = f"%{service_area}%"
        params.extend([area_param, area_param])
    
    if availability:
        conditions.append("w.availability_status = ${}::varchar")
        params.append(availability)
    
    if profile_complete:
        if profile_complete == "true":
            conditions.append("w.status = 'ACTIVE'")
        elif profile_complete == "false":
            conditions.append("w.status != 'ACTIVE'")
    
    where_clause = "WHERE " + " AND ".join(conditions)
    params.extend([limit, offset])
    
    async with pool.acquire() as conn:
        total_query = f"SELECT COUNT(*) FROM workers w JOIN users u ON u.id=w.user_id {where_clause}"
        total = await conn.fetchval(total_query, *params[:-2])

        data_query = f"""
            SELECT w.*, u.phone, u.email,
                   (SELECT COUNT(*) FROM job_assignments WHERE worker_id=w.id AND completed_at IS NOT NULL) AS completed_jobs_count,
                   (SELECT COUNT(*) FROM job_assignments WHERE worker_id=w.id AND completed_at IS NULL) AS active_assignments_count
            FROM workers w
            JOIN users u ON u.id=w.user_id
            {where_clause}
            ORDER BY w.created_at DESC LIMIT ${len(params)-1} OFFSET ${len(params)}
        """
        rows = await conn.fetch(data_query, *params)
    
    return {"success": True, "data": {"total": total, "items": [row_to_dict(x) for x in rows]}}


@router.post("/workers")
async def create_worker(payload: WorkerCreate, request: Request, _: dict = Depends(require_admin)):
    """Create a new worker account"""
    pool = require_pool(request)
    async with transaction(pool) as conn:
        # Create user account with ON CONFLICT to prevent race condition
        # Check both phone and email uniqueness
        try:
            user = await conn.fetchrow(
                """INSERT INTO users(phone, email, password_hash, role)
                   VALUES($1, $2, $3, $4)
                   RETURNING id, phone, email, role""",
                payload.phone, payload.email, hash_password(payload.password), "WORKER"
            )
        except asyncpg.UniqueViolationError as e:
            # Determine which field caused the violation
            if "phone" in str(e):
                raise HTTPException(409, {"code": "PHONE_EXISTS", "message": "An account already exists for this phone number."})
            elif "email" in str(e):
                raise HTTPException(409, {"code": "EMAIL_EXISTS", "message": "An account already exists for this email address."})
            else:
                raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account already exists for this phone or email."})

        # Create worker profile
        worker = await conn.fetchrow(
            """INSERT INTO workers(user_id, full_name, primary_trade, years_experience, professional_bio,
                                  previous_company, emergency_contact_name, emergency_contact_number,
                                  preferred_work_type, languages, status, availability_status)
               VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', 'OFFLINE')
               RETURNING id, full_name, primary_trade, status, availability_status""",
            user["id"], payload.full_name, payload.primary_trade, payload.years_experience,
            payload.professional_bio, payload.previous_company, payload.emergency_contact_name,
            payload.emergency_contact_number, payload.preferred_work_type, payload.languages
        )

        # Insert skills if provided
        if payload.skills:
            for skill_name in payload.skills:
                skill_id = await conn.fetchval(
                    "SELECT id FROM skills WHERE name=$1 AND is_active=TRUE",
                    skill_name
                )
                if skill_id:
                    await conn.execute(
                        "INSERT INTO worker_skills(worker_id, skill_id) VALUES($1, $2) ON CONFLICT DO NOTHING",
                        worker["id"], skill_id
                    )

        # Insert service areas if provided
        if payload.service_areas:
            for area_name in payload.service_areas:
                area_id = await conn.fetchval(
                    "SELECT id FROM service_areas WHERE name=$1 LIMIT 1",
                    area_name
                )
                if area_id:
                    await conn.execute(
                        "INSERT INTO worker_service_areas(worker_id, service_area_id, radius_km) VALUES($1, $2, $3) ON CONFLICT DO NOTHING",
                        worker["id"], area_id, payload.service_area_radius_km
                    )

    return {"success": True, "data": {"user": row_to_dict(user), "worker": row_to_dict(worker)}}


@router.get("/workers/{worker_id}")
async def get_worker(worker_id: str, request: Request, _: dict = Depends(require_admin)):
    """Get detailed information about a specific worker"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        worker = await conn.fetchrow(
            """SELECT w.*, u.phone, u.email,
               (SELECT COUNT(*) FROM job_assignments WHERE worker_id=w.id AND completed_at IS NOT NULL) AS completed_jobs_count,
               (SELECT COUNT(*) FROM job_assignments WHERE worker_id=w.id AND completed_at IS NULL) AS active_assignments_count
            FROM workers w
            JOIN users u ON u.id=w.user_id
            WHERE w.id=$1 AND w.deleted_at IS NULL""", UUID(worker_id))

        if not worker:
            raise HTTPException(404, {"code": "WORKER_NOT_FOUND", "message": "Worker not found."})

        data = row_to_dict(worker)

        # Get skills
        data["skills"] = [row_to_dict(x) for x in await conn.fetch(
            """SELECT ws.*, s.name AS skill_name, s.category
               FROM worker_skills ws
               JOIN skills s ON s.id=ws.skill_id
               WHERE ws.worker_id=$1""", UUID(worker_id))]

        # Get service areas
        data["service_areas"] = [row_to_dict(x) for x in await conn.fetch(
            """SELECT wsa.*, sa.name AS area_name, sa.city, sa.state, sa.latitude, sa.longitude
               FROM worker_service_areas wsa
               JOIN service_areas sa ON sa.id=wsa.service_area_id
               WHERE wsa.worker_id=$1""", UUID(worker_id))]

        # Get availability
        data["availability"] = [row_to_dict(x) for x in await conn.fetch(
            """SELECT * FROM worker_availability WHERE worker_id=$1 ORDER BY day_of_week""", UUID(worker_id))]

        # Get current assignments
        data["current_assignments"] = [row_to_dict(x) for x in await conn.fetch(
            """SELECT ja.*, j.job_number, j.title, j.service_type, j.status, j.scheduled_at
               FROM job_assignments ja
               JOIN jobs j ON j.id=ja.job_id
               WHERE ja.worker_id=$1 AND ja.completed_at IS NULL
               ORDER BY ja.assigned_at DESC""", UUID(worker_id))]

    return {"success": True, "data": data}


@router.post("/jobs/{job_id}/assign-worker")
async def assign_worker(job_id: str, payload: AssignWorkerRequest, request: Request, identity: dict = Depends(require_admin)):
    """Assign a worker to a job"""
    pool = require_pool(request)
    async with transaction(pool) as conn:
        # Verify job exists and is in assignable state
        job = await conn.fetchrow("SELECT * FROM jobs WHERE id=$1 FOR UPDATE", UUID(job_id))
        if not job:
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        
        if job["status"] not in ("REQUESTED", "OFFERED"):
            raise HTTPException(409, {"code": "INVALID_JOB_STATE", "message": f"Job is in {job['status']} state and cannot be assigned."})
        
        # Verify worker exists and is active
        worker = await conn.fetchrow("SELECT * FROM workers WHERE id=$1 AND status='ACTIVE' AND deleted_at IS NULL FOR UPDATE", UUID(payload.worker_id))
        if not worker:
            raise HTTPException(404, {"code": "WORKER_NOT_FOUND", "message": "Worker not found or not active."})
        
        # Check for existing assignment
        existing = await conn.fetchval("SELECT 1 FROM job_assignments WHERE job_id=$1", UUID(job_id))
        if existing:
            raise HTTPException(409, {"code": "ALREADY_ASSIGNED", "message": "Job already has an active assignment."})
        
        now = datetime.now(timezone.utc)
        
        # Create assignment
        assignment = await conn.fetchrow(
            """INSERT INTO job_assignments(job_id, worker_id, assigned_at, assigned_by_admin, assignment_notes) 
               VALUES($1, $2, $3, $4, $5) RETURNING *""", 
            UUID(job_id), UUID(payload.worker_id), now, UUID(identity["sub"]), payload.notes)
        
        # Update job status
        updated_job = await conn.fetchrow(
            "UPDATE jobs SET status='ASSIGNED', updated_at=NOW() WHERE id=$1 RETURNING *", 
            UUID(job_id))
        
        # Record status history
        metadata = {"assigned_by_admin": identity["sub"], "notes": payload.notes}
        await conn.execute(
            """INSERT INTO job_status_history(job_id, worker_id, old_status, new_status, reason, metadata)
               VALUES($1, $2, $3, $4, $5, $6::jsonb)""", 
            UUID(job_id), UUID(payload.worker_id), job["status"], "ASSIGNED", 
            f"Assigned by admin", 
            dumps(metadata))
        
        # Create notification for customer
        if job["customer_id"]:
            await conn.execute(
                """INSERT INTO notifications(customer_id, type, title, message, entity_type, entity_id)
                   VALUES($1, 'WORKER_ASSIGNED', 'Worker assigned', $2, 'JOB', $3)""", 
                job["customer_id"], 
                f"A service professional has been assigned to your request {job['job_number']}.", 
                UUID(job_id))
        
        # Create notification for worker
        await conn.execute(
            """INSERT INTO notifications(worker_id, type, title, message, entity_type, entity_id)
               VALUES($1, 'ADMIN_ASSIGNMENT', 'New assignment', $2, 'JOB', $3)""", 
            UUID(payload.worker_id), 
            f"You have been assigned to service request {job['job_number']}. Admin will contact you with details.", 
            UUID(job_id))
    
    return {"success": True, "data": {"job": row_to_dict(updated_job), "assignment": row_to_dict(assignment)}}


@router.post("/jobs/{job_id}/reassign-worker")
async def reassign_worker(job_id: str, payload: ReassignWorkerRequest, request: Request, identity: dict = Depends(require_admin)):
    """Reassign a job to a different worker"""
    pool = require_pool(request)
    async with transaction(pool) as conn:
        # Verify job exists
        job = await conn.fetchrow("SELECT * FROM jobs WHERE id=$1 FOR UPDATE", UUID(job_id))
        if not job:
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        
        # Get current assignment
        current_assignment = await conn.fetchrow("SELECT * FROM job_assignments WHERE job_id=$1 FOR UPDATE", UUID(job_id))
        if not current_assignment:
            raise HTTPException(409, {"code": "NO_ASSIGNMENT", "message": "Job has no current assignment to reassign."})
        
        # Verify new worker exists and is active
        new_worker = await conn.fetchrow("SELECT * FROM workers WHERE id=$1 AND status='ACTIVE' AND deleted_at IS NULL FOR UPDATE", UUID(payload.worker_id))
        if not new_worker:
            raise HTTPException(404, {"code": "WORKER_NOT_FOUND", "message": "Worker not found or not active."})
        
        if str(current_assignment["worker_id"]) == payload.worker_id:
            raise HTTPException(409, {"code": "SAME_WORKER", "message": "Cannot reassign to the same worker."})
        
        now = datetime.now(timezone.utc)
        old_worker_id = current_assignment["worker_id"]
        
        # Mark previous assignment as completed (for history)
        await conn.execute(
            "UPDATE job_assignments SET completed_at=$1, updated_at=NOW() WHERE id=$2", 
            now, current_assignment["id"])
        
        # Create new assignment
        new_assignment = await conn.fetchrow(
            """INSERT INTO job_assignments(job_id, worker_id, assigned_at, assigned_by_admin, assignment_notes) 
               VALUES($1, $2, $3, $4, $5) RETURNING *""", 
            UUID(job_id), UUID(payload.worker_id), now, UUID(identity["sub"]), payload.notes)
        
        # Update job status back to ASSIGNED
        updated_job = await conn.fetchrow(
            "UPDATE jobs SET status='ASSIGNED', updated_at=NOW() WHERE id=$1 RETURNING *", 
            UUID(job_id))
        
        # Record status history
        metadata = {"assigned_by_admin": identity["sub"], "previous_worker_id": str(old_worker_id), "notes": payload.notes}
        await conn.execute(
            """INSERT INTO job_status_history(job_id, worker_id, old_status, new_status, reason, metadata)
               VALUES($1, $2, $3, $4, $5, $6::jsonb)""", 
            UUID(job_id), UUID(payload.worker_id), job["status"], "ASSIGNED", 
            f"Reassigned by admin", 
            dumps(metadata))
        
        # Create notification for customer
        if job["customer_id"]:
            await conn.execute(
                """INSERT INTO notifications(customer_id, type, title, message, entity_type, entity_id)
                   VALUES($1, 'WORKER_ASSIGNED', 'Worker reassigned', $2, 'JOB', $3)""", 
                job["customer_id"], 
                f"Your service request {job['job_number']} has been reassigned to a different professional.", 
                UUID(job_id))
        
        # Create notification for new worker
        await conn.execute(
            """INSERT INTO notifications(worker_id, type, title, message, entity_type, entity_id)
               VALUES($1, 'ADMIN_REASSIGNMENT', 'New assignment', $2, 'JOB', $3)""", 
            UUID(payload.worker_id), 
            f"You have been assigned to service request {job['job_number']}. Admin will contact you with details.", 
            UUID(job_id))
    
    return {"success": True, "data": {"job": row_to_dict(updated_job), "assignment": row_to_dict(new_assignment)}}


@router.get("/dashboard")
async def dashboard(request: Request, _: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        # New requests (REQUESTED status)
        new_requests = await conn.fetchval("SELECT COUNT(*) FROM jobs WHERE status='REQUESTED'")

        # Unassigned requests (REQUESTED or OFFERED without assignment)
        unassigned = await conn.fetchval(
            """SELECT COUNT(*) FROM jobs j
               WHERE j.status IN ('REQUESTED', 'OFFERED')
               AND NOT EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id=j.id AND ja.completed_at IS NULL)""")

        # Assigned requests
        assigned = await conn.fetchval(
            """SELECT COUNT(*) FROM jobs j
               WHERE j.status='ASSIGNED'
               AND EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id=j.id AND ja.completed_at IS NULL)""")

        # Total workers
        total_workers = await conn.fetchval("SELECT COUNT(*) FROM workers WHERE deleted_at IS NULL")

        # Active workers (status = ACTIVE)
        active_workers = await conn.fetchval("SELECT COUNT(*) FROM workers WHERE status='ACTIVE' AND deleted_at IS NULL")

        # Available workers (availability_status = ONLINE)
        available_workers = await conn.fetchval("SELECT COUNT(*) FROM workers WHERE status='ACTIVE' AND availability_status='ONLINE' AND deleted_at IS NULL")

        # Completed jobs
        completed = await conn.fetchval("SELECT COUNT(*) FROM jobs WHERE status='COMPLETED'")

        # Recent requests
        recent_requests = [row_to_dict(x) for x in await conn.fetch(
            """SELECT j.*, c.full_name AS customer_name, cs.site_name
               FROM jobs j
               LEFT JOIN customers c ON c.id=j.customer_id
               LEFT JOIN customer_sites cs ON cs.id=j.site_id
               ORDER BY j.created_at DESC LIMIT 5""")]

        # Recent assignments
        recent_assignments = [row_to_dict(x) for x in await conn.fetch(
            """SELECT ja.*, j.job_number, j.title, j.service_type, w.full_name AS worker_name, c.full_name AS customer_name
               FROM job_assignments ja
               JOIN jobs j ON j.id=ja.job_id
               JOIN workers w ON w.id=ja.worker_id
               LEFT JOIN customers c ON c.id=j.customer_id
               ORDER BY ja.assigned_at DESC LIMIT 5""")]

    return {
        "success": True,
        "data": {
            "statistics": {
                "new_requests": new_requests,
                "unassigned": unassigned,
                "assigned": assigned,
                "completed": completed,
                "total_workers": total_workers,
                "active_workers": active_workers,
                "available_workers": available_workers
            },
            "recent_requests": recent_requests,
            "recent_assignments": recent_assignments
        }
    }


@router.get("/skills")
async def get_skills(request: Request, _: dict = Depends(require_admin)):
    """Get all available skills for worker creation"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        skills = await conn.fetch(
            "SELECT id, name, category FROM skills WHERE is_active = TRUE ORDER BY name"
        )
    return {"success": True, "data": [row_to_dict(s) for s in skills]}


@router.get("/service-areas")
async def get_service_areas(request: Request, _: dict = Depends(require_admin)):
    """Get all available service areas for worker creation"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        areas = await conn.fetch(
            "SELECT id, name, city, state FROM service_areas ORDER BY name"
        )
    return {"success": True, "data": [row_to_dict(a) for a in areas]}


@router.get("/customers")
async def list_customers(
    request: Request,
    search: str = Query(default="", max_length=120),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: dict = Depends(require_admin)
):
    """List all customers with search"""
    pool = require_pool(request)
    params: list = []
    conditions = []
    
    if search:
        conditions.append("(c.full_name ILIKE ${} OR c.company_name ILIKE ${} OR u.phone ILIKE ${})")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    
    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    params.extend([limit, offset])
    
    async with pool.acquire() as conn:
        # Get total count
        count_query = f"SELECT COUNT(*) FROM customers c JOIN users u ON u.id=c.user_id WHERE c.deleted_at IS NULL AND {where_clause}"
        total = await conn.fetchval(count_query, *params[:-2])
        
        # Get customers with stats
        query = f"""
            SELECT c.id, c.user_id, c.full_name, c.company_name, c.contact_person,
                   c.preferred_communication, c.created_at, u.phone, u.email,
                   (SELECT COUNT(*) FROM jobs WHERE customer_id=c.id) as total_jobs,
                   (SELECT COUNT(*) FROM jobs WHERE customer_id=c.id AND status='COMPLETED') as completed_jobs,
                   (SELECT COUNT(*) FROM jobs WHERE customer_id=c.id AND status IN ('REQUESTED', 'ASSIGNED', 'IN_PROGRESS')) as active_jobs
            FROM customers c
            JOIN users u ON u.id=c.user_id
            WHERE c.deleted_at IS NULL AND {where_clause}
            ORDER BY c.created_at DESC
            LIMIT $1 OFFSET $2
        """
        customers = [row_to_dict(x) for x in await conn.fetch(query, params[-2], params[-1])]
    
    return {
        "success": True,
        "data": {
            "items": customers,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, request: Request, _: dict = Depends(require_admin)):
    """Get customer details with job history and sites"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        # Get customer profile
        customer = await conn.fetchrow(
            """SELECT c.*, u.phone, u.email
               FROM customers c
               JOIN users u ON u.id=c.user_id
               WHERE c.id=$1 AND c.deleted_at IS NULL""",
            UUID(customer_id)
        )
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        customer_data = row_to_dict(customer)
        
        # Get customer sites
        sites = [row_to_dict(x) for x in await conn.fetch(
            "SELECT * FROM customer_sites WHERE customer_id=$1 AND is_active=TRUE ORDER BY site_name",
            UUID(customer_id)
        )]
        
        # Get job history
        jobs = [row_to_dict(x) for x in await conn.fetch(
            """SELECT j.*, cs.site_name
               FROM jobs j
               LEFT JOIN customer_sites cs ON cs.id=j.site_id
               WHERE j.customer_id=$1
               ORDER BY j.created_at DESC""",
            UUID(customer_id)
        )]
        
        customer_data["sites"] = sites
        customer_data["job_history"] = jobs
    
    return {"success": True, "data": customer_data}