from datetime import datetime, timedelta, timezone
from math import acos, cos, radians, sin
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import CustomerConfirmationCreate, ExpenseCreate, JobAction, JobCreate, MaterialCreate, ProgressUpdate
from ..security import current_identity
from .workers import worker_id
from .customers import customer_id

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

VALID_TRANSITIONS = {
    "ACCEPTED": {"REQUESTED", "OFFERED"}, "EN_ROUTE": {"ACCEPTED"}, "ARRIVED": {"EN_ROUTE"},
    "IN_PROGRESS": {"ARRIVED", "PAUSED"}, "PAUSED": {"IN_PROGRESS"}, "WAITING_CUSTOMER": {"IN_PROGRESS", "ARRIVED"},
    "COMPLETED": {"IN_PROGRESS", "WAITING_CUSTOMER", "ARRIVED"},
}

CUSTOMER_NOTIFICATIONS = {
    "ACCEPTED": ("WORKER_ASSIGNED", "Worker assigned", "Your service professional has accepted the request."),
    "EN_ROUTE": ("WORKER_EN_ROUTE", "Worker on the way", "Your service professional is en route to your site."),
    "ARRIVED": ("WORKER_ARRIVED", "Worker arrived", "Your service professional has arrived at the site."),
    "IN_PROGRESS": ("WORK_STARTED", "Work started", "Work has started on your service request."),
    "WAITING_CUSTOMER": ("CONFIRMATION_REQUIRED", "Confirmation required", "Work is complete. Please review and confirm."),
    "COMPLETED": ("WORK_COMPLETED", "Job completed", "Your service request has been completed."),
}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    inner = cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) * sin(radians(lat2))
    return 6371.0 * acos(max(-1.0, min(1.0, inner)))


async def owned_job(conn, wid: str, jid: str, for_update: bool = False):
    if for_update:
        # Lock the base row first: FOR UPDATE cannot be applied to the nullable side of an outer join.
        await conn.fetchrow("SELECT id FROM jobs WHERE id=$1 FOR UPDATE", UUID(jid))
    row = await conn.fetchrow("SELECT j.* FROM jobs j LEFT JOIN job_assignments a ON a.job_id=j.id LEFT JOIN job_requests r ON r.job_id=j.id WHERE j.id=$1 AND (a.worker_id=$2 OR r.worker_id=$2)", UUID(jid), UUID(wid))
    if not row:
        raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Job was not found for this worker."})
    return row


async def transition(request: Request, identity: dict, jid: str, target: str, reason: str | None = None, force_complete: bool = False, wid_override: str | None = None):
    wid = wid_override or await worker_id(request, identity)
    pool = require_pool(request)
    async with transaction(pool) as conn:
        if wid_override:
            job = await conn.fetchrow("SELECT * FROM jobs WHERE id=$1 FOR UPDATE", UUID(jid))
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Job was not found."})
        else:
            job = await owned_job(conn, wid, jid, True)
        current = job["status"]
        # Customer-created jobs hand off to WAITING_CUSTOMER for confirmation before COMPLETED.
        actual = target
        if target == "COMPLETED" and job["customer_id"] and not force_complete and current != "WAITING_CUSTOMER":
            actual = "WAITING_CUSTOMER"
        if actual not in VALID_TRANSITIONS or current not in VALID_TRANSITIONS[actual]:
            raise HTTPException(409, {"code": "INVALID_JOB_TRANSITION", "message": f"Cannot move job from {current} to {actual}."})
        now = datetime.now(timezone.utc)
        if target == "ACCEPTED":
            request_row = await conn.fetchrow("SELECT * FROM job_requests WHERE job_id=$1 AND worker_id=$2 AND status IN ('PENDING','VIEWED') FOR UPDATE", UUID(jid), UUID(wid))
            if not request_row or (request_row["offer_expires_at"] and request_row["offer_expires_at"] < now):
                raise HTTPException(409, {"code": "OFFER_EXPIRED", "message": "This job offer is no longer available."})
            await conn.execute("UPDATE job_requests SET status='ACCEPTED' WHERE id=$1", request_row["id"])
            await conn.execute("UPDATE job_requests SET status='EXPIRED' WHERE job_id=$1 AND worker_id<>$2 AND status IN ('PENDING','VIEWED')", UUID(jid), UUID(wid))
            await conn.execute("INSERT INTO job_assignments(job_id,worker_id,accepted_at) VALUES($1,$2,$3) ON CONFLICT(job_id) DO UPDATE SET worker_id=EXCLUDED.worker_id,accepted_at=EXCLUDED.accepted_at,updated_at=NOW()", UUID(jid), UUID(wid), now)
            await conn.execute("UPDATE workers SET availability_status='BUSY',updated_at=NOW() WHERE id=$1 AND availability_status='ONLINE'", UUID(wid))
        if actual == "IN_PROGRESS":
            await conn.execute("UPDATE job_assignments SET started_at=COALESCE(started_at,$2),updated_at=NOW() WHERE job_id=$1 AND worker_id=$3", UUID(jid), now, UUID(wid))
        if target == "COMPLETED":
            incomplete = await conn.fetchval("SELECT COUNT(*) FROM job_checklists WHERE job_id=$1 AND is_required=TRUE AND is_completed=FALSE", UUID(jid))
            if incomplete:
                raise HTTPException(409, {"code": "CHECKLIST_INCOMPLETE", "message": "Complete all required checklist items first."})
            await conn.execute("UPDATE job_assignments SET completed_at=$2,updated_at=NOW() WHERE job_id=$1 AND worker_id=$3", UUID(jid), now, UUID(wid))
        updated = await conn.fetchrow("UPDATE jobs SET status=$2::varchar,completed_at=CASE WHEN $2::text='COMPLETED' THEN $3 ELSE completed_at END,updated_at=NOW() WHERE id=$1 RETURNING *", UUID(jid), actual, now)
        await conn.execute("INSERT INTO job_status_history(job_id,worker_id,old_status,new_status,reason) VALUES($1,$2,$3,$4,$5)", UUID(jid), UUID(wid), current, actual, reason)
        WORKER_NOTIFICATIONS = {
            "ACCEPTED": ("JOB_ACCEPTED", "Job accepted", f"You accepted {updated['title']}."),
            "WAITING_CUSTOMER": ("SYSTEM", "Awaiting customer confirmation", f"{updated['title']} is awaiting customer confirmation."),
            "COMPLETED": ("JOB_COMPLETED", "Job completed", f"{updated['title']} is now completed."),
        }
        if actual in WORKER_NOTIFICATIONS:
            ntype, ntitle, nmessage = WORKER_NOTIFICATIONS[actual]
            await conn.execute("INSERT INTO notifications(worker_id,type,title,message,entity_type,entity_id) VALUES($1,$2,$3,$4,'JOB',$5)", UUID(wid), ntype, ntitle, nmessage, UUID(jid))
        if actual in ("WAITING_CUSTOMER", "COMPLETED"):
            await conn.execute("UPDATE workers SET availability_status='ONLINE',updated_at=NOW() WHERE id=$1 AND availability_status='BUSY'", UUID(wid))
        if job["customer_id"] and actual in CUSTOMER_NOTIFICATIONS:
            ntype, ntitle, nmessage = CUSTOMER_NOTIFICATIONS[actual]
            await conn.execute("INSERT INTO notifications(customer_id,type,title,message,entity_type,entity_id) VALUES($1,$2,$3,$4,'JOB',$5)", job["customer_id"], ntype, ntitle, f"{updated['title']} — {nmessage}", UUID(jid))
    return row_to_dict(updated)


@router.post("")
async def create_job(payload: JobCreate, request: Request, identity: dict = Depends(current_identity)):
    cid = await customer_id(request, identity)
    pool = require_pool(request)
    async with transaction(pool) as conn:
        customer = await conn.fetchrow("SELECT c.*, u.phone FROM customers c JOIN users u ON u.id=c.user_id WHERE c.id=$1", UUID(cid))
        site = await conn.fetchrow("SELECT * FROM customer_sites WHERE id=$1 AND customer_id=$2 AND is_active=TRUE", UUID(payload.site_id), UUID(cid))
        if not site:
            raise HTTPException(404, {"code": "SITE_NOT_FOUND", "message": "Service site not found."})
        skill_id = await conn.fetchval("SELECT id FROM skills WHERE name=$1 AND is_active=TRUE", payload.service_type)
        next_number = await conn.fetchval("SELECT COALESCE(MAX((substring(job_number from 7))::int),1000)+1 FROM jobs WHERE job_number LIKE 'SDX-J-%'")
        number = f"SDX-J-{next_number}"
        job = await conn.fetchrow(
            """INSERT INTO jobs(job_number,title,service_type,description,problem_description,customer_id,site_id,customer_name,company_name,customer_phone,
               site_name,address_line,city,state,postal_code,latitude,longitude,scheduled_at,priority,status,required_skill_id)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'REQUESTED',$20) RETURNING *""",
            number, payload.title, payload.service_type, payload.notes, payload.problem_description, UUID(cid), site["id"],
            customer["contact_person"] or customer["full_name"], customer["company_name"], customer["phone"],
            site["site_name"], site["address_line"], site["city"], site["state"], site["postal_code"],
            site["latitude"], site["longitude"], payload.scheduled_at, payload.priority, skill_id)
        for url in payload.photo_urls:
            await conn.execute("INSERT INTO job_attachments(job_id,customer_id,file_url) VALUES($1,$2,$3)", job["id"], UUID(cid), url)
        matched: list[tuple[str, float]] = []
        lat, lng = (float(site["latitude"]), float(site["longitude"])) if site["latitude"] is not None and site["longitude"] is not None else (None, None)
        if lat is not None and lng is not None:
            rows = await conn.fetch(
                """SELECT w.id, wsa.radius_km, sa.latitude, sa.longitude FROM workers w
                   JOIN worker_service_areas wsa ON wsa.worker_id=w.id JOIN service_areas sa ON sa.id=wsa.service_area_id
                   WHERE w.status='ACTIVE' AND w.availability_status='ONLINE' AND w.deleted_at IS NULL
                   AND ($1::uuid IS NULL OR EXISTS(SELECT 1 FROM worker_skills ws WHERE ws.worker_id=w.id AND ws.skill_id=$1))""", skill_id)
            best: dict[str, float] = {}
            for row in rows:
                distance = haversine_km(lat, lng, float(row["latitude"]), float(row["longitude"]))
                if distance <= float(row["radius_km"]):
                    key = str(row["id"])
                    best[key] = min(best.get(key, 99999), distance)
            matched = sorted(best.items(), key=lambda item: item[1])
        elif site["city"]:
            rows = await conn.fetch(
                """SELECT DISTINCT w.id FROM workers w JOIN worker_service_areas wsa ON wsa.worker_id=w.id JOIN service_areas sa ON sa.id=wsa.service_area_id
                   WHERE w.status='ACTIVE' AND w.availability_status='ONLINE' AND w.deleted_at IS NULL AND sa.city ILIKE $2
                   AND ($1::uuid IS NULL OR EXISTS(SELECT 1 FROM worker_skills ws WHERE ws.worker_id=w.id AND ws.skill_id=$1))""", skill_id, site["city"])
            matched = [(str(row["id"]), 0.0) for row in rows]
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        for wid, distance in matched:
            await conn.execute("INSERT INTO job_requests(job_id,worker_id,distance_km,estimated_payout,offer_expires_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(job_id,worker_id) DO NOTHING", job["id"], UUID(wid), round(distance, 2), job["estimated_payout"], expires)
            await conn.execute("INSERT INTO notifications(worker_id,type,title,message,entity_type,entity_id) VALUES($1,'NEW_JOB_REQUEST','New job request',$2,'JOB',$3)", UUID(wid), f"{job['title']} near {site['site_name'] or site['city'] or 'your area'}.", job["id"])
        await conn.execute("INSERT INTO notifications(customer_id,type,title,message,entity_type,entity_id) VALUES($1,'REQUEST_CREATED','Request created',$2,'JOB',$3)", UUID(cid), f"{job['title']} was created and is being matched with nearby professionals.", job["id"])
    return {"success": True, "data": {"job": row_to_dict(job), "matched_workers": len(matched)}}


@router.get("")
async def list_jobs(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT DISTINCT j.* FROM jobs j LEFT JOIN job_requests r ON r.job_id=j.id LEFT JOIN job_assignments a ON a.job_id=j.id WHERE r.worker_id=$1 OR a.worker_id=$1 ORDER BY j.scheduled_at NULLS LAST", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/requests")
async def requests(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT j.*,r.id AS request_id,r.distance_km,r.status AS request_status FROM job_requests r JOIN jobs j ON j.id=r.job_id WHERE r.worker_id=$1 AND r.status IN ('PENDING','VIEWED') ORDER BY j.scheduled_at NULLS LAST", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/active")
async def active(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow("SELECT j.* FROM jobs j JOIN job_assignments a ON a.job_id=j.id WHERE a.worker_id=$1 AND j.status IN ('ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS','PAUSED','WAITING_CUSTOMER') ORDER BY j.updated_at DESC LIMIT 1", wid)
    return {"success": True, "data": row_to_dict(row)}


@router.get("/history")
async def history(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT j.* FROM jobs j JOIN job_assignments a ON a.job_id=j.id WHERE a.worker_id=$1 AND j.status IN ('COMPLETED','CANCELLED','DISPUTED') ORDER BY j.completed_at DESC NULLS LAST", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/{job_id}")
async def get_job(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    pool = require_pool(request)
    async with pool.acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            row = await conn.fetchrow(
                """SELECT j.*, cs.site_name AS site_name_ref, cs.contact_name AS site_contact_name, cs.contact_phone AS site_contact_phone
                   FROM jobs j LEFT JOIN customer_sites cs ON cs.id=j.site_id WHERE j.id=$1 AND j.customer_id=$2""", UUID(job_id), UUID(cid))
            if not row:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
            data = row_to_dict(row)
            worker = await conn.fetchrow(
                """SELECT w.id, w.full_name, w.profile_photo_url, w.primary_trade, w.years_experience, w.rating_avg, w.rating_count, u.phone
                   FROM job_assignments ja JOIN workers w ON w.id=ja.worker_id JOIN users u ON u.id=w.user_id WHERE ja.job_id=$1""", UUID(job_id))
            data["worker"] = row_to_dict(worker)
            data["attachments"] = [row_to_dict(x) for x in await conn.fetch("SELECT * FROM job_attachments WHERE job_id=$1 ORDER BY created_at", UUID(job_id))]
            data["photos"] = [row_to_dict(x) for x in await conn.fetch("SELECT * FROM work_photos WHERE job_id=$1 ORDER BY created_at", UUID(job_id))]
            data["materials"] = [row_to_dict(x) for x in await conn.fetch("SELECT jm.*, m.name, m.unit FROM job_materials jm JOIN materials m ON m.id=jm.material_id WHERE jm.job_id=$1", UUID(job_id))]
            data["progress"] = row_to_dict(await conn.fetchrow("SELECT * FROM work_progress WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1", UUID(job_id)))
            data["confirmation"] = row_to_dict(await conn.fetchrow("SELECT * FROM customer_confirmations WHERE job_id=$1", UUID(job_id)))
            data["timeline"] = [row_to_dict(x) for x in await conn.fetch("SELECT old_status,new_status,reason,created_at FROM job_status_history WHERE job_id=$1 ORDER BY created_at", UUID(job_id))]
            return {"success": True, "data": data}
        row = await owned_job(conn, await worker_id(request, identity), job_id)
        data = row_to_dict(row)
        data["attachments"] = [row_to_dict(x) for x in await conn.fetch("SELECT * FROM job_attachments WHERE job_id=$1 ORDER BY created_at", UUID(job_id))]
    return {"success": True, "data": data}


@router.get("/{job_id}/status")
async def job_status(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    pool = require_pool(request)
    async with pool.acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            job = await conn.fetchrow("SELECT id,status,updated_at FROM jobs WHERE id=$1 AND customer_id=$2", UUID(job_id), UUID(cid))
        else:
            job_row = await owned_job(conn, await worker_id(request, identity), job_id)
            job = {"id": job_row["id"], "status": job_row["status"], "updated_at": job_row["updated_at"]}
        if not job:
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        worker = await conn.fetchrow("SELECT w.full_name, w.profile_photo_url, w.primary_trade, w.rating_avg FROM job_assignments ja JOIN workers w ON w.id=ja.worker_id WHERE ja.job_id=$1", UUID(job_id))
        progress = await conn.fetchrow("SELECT progress_percent,status,current_task,created_at FROM work_progress WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1", UUID(job_id))
    return {"success": True, "data": {**row_to_dict(job), "worker": row_to_dict(worker), "progress": row_to_dict(progress)}}


@router.post("/{job_id}/view")
async def view_job(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await conn.execute("UPDATE job_requests SET status='VIEWED' WHERE job_id=$1 AND worker_id=$2 AND status='PENDING'", UUID(job_id), UUID(wid))
    return {"success": True, "data": {"viewed": True}}


@router.post("/{job_id}/accept")
async def accept(job_id: str, request: Request, payload: JobAction | None = None, identity: dict = Depends(current_identity)):
    return {"success": True, "data": await transition(request, identity, job_id, "ACCEPTED", payload.reason if payload else None)}


@router.post("/{job_id}/decline")
async def decline(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await conn.execute("UPDATE job_requests SET status='DECLINED' WHERE job_id=$1 AND worker_id=$2 AND status IN ('PENDING','VIEWED')", UUID(job_id), UUID(wid))
    return {"success": True, "data": {"declined": True}}


@router.post("/{job_id}/cancel")
async def cancel(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    cid = await customer_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        job = await conn.fetchrow("SELECT * FROM jobs WHERE id=$1 AND customer_id=$2 FOR UPDATE", UUID(job_id), UUID(cid))
        if not job:
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        if job["status"] not in ("REQUESTED", "OFFERED"):
            raise HTTPException(409, {"code": "INVALID_JOB_TRANSITION", "message": f"Cannot cancel a request in {job['status']} state."})
        updated = await conn.fetchrow("UPDATE jobs SET status='CANCELLED',cancelled_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *", UUID(job_id))
        await conn.execute("UPDATE job_requests SET status='CANCELLED',updated_at=NOW() WHERE job_id=$1 AND status IN ('PENDING','VIEWED')", UUID(job_id))
        await conn.execute("INSERT INTO job_status_history(job_id,old_status,new_status,reason) VALUES($1,$2,'CANCELLED',$3)", UUID(job_id), job["status"], "customer_cancelled")
    return {"success": True, "data": row_to_dict(updated)}


for endpoint, target in [("en-route", "EN_ROUTE"), ("arrived", "ARRIVED"), ("start", "IN_PROGRESS"), ("pause", "PAUSED"), ("resume", "IN_PROGRESS"), ("complete", "COMPLETED")]:
    async def handler(job_id: str, request: Request, payload: JobAction | None = None, identity: dict = Depends(current_identity), _target=target):
        return {"success": True, "data": await transition(request, identity, job_id, _target, payload.reason if payload else None)}
    router.add_api_route("/{job_id}/" + endpoint, handler, methods=["POST"], name="job_" + endpoint.replace("-", "_"))


@router.get("/{job_id}/progress")
async def get_progress(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            owns = await conn.fetchval("SELECT 1 FROM jobs WHERE id=$1 AND customer_id=$2", UUID(job_id), UUID(cid))
            if not owns:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        else:
            await owned_job(conn, await worker_id(request, identity), job_id)
        rows = await conn.fetch("SELECT * FROM work_progress WHERE job_id=$1 ORDER BY created_at DESC", UUID(job_id))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.post("/{job_id}/progress")
async def create_progress(job_id: str, payload: ProgressUpdate, request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await owned_job(conn, wid, job_id)
        row = await conn.fetchrow("INSERT INTO work_progress(job_id,worker_id,progress_percent,status,current_task,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", UUID(job_id), UUID(wid), payload.progress_percent, payload.status, payload.current_task, payload.notes)
    return {"success": True, "data": row_to_dict(row)}


@router.get("/{job_id}/materials")
async def materials(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            owns = await conn.fetchval("SELECT 1 FROM jobs WHERE id=$1 AND customer_id=$2", UUID(job_id), UUID(cid))
            if not owns:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        else:
            await owned_job(conn, await worker_id(request, identity), job_id)
        rows = await conn.fetch("SELECT jm.*,m.name,m.unit FROM job_materials jm JOIN materials m ON m.id=jm.material_id WHERE jm.job_id=$1", UUID(job_id))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.post("/{job_id}/materials")
async def add_material(job_id: str, payload: MaterialCreate, request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await owned_job(conn, wid, job_id)
        row = await conn.fetchrow("INSERT INTO job_materials(job_id,material_id,quantity,unit_rate,notes) VALUES($1,$2,$3,$4,$5) RETURNING *", UUID(job_id), UUID(payload.material_id), payload.quantity, payload.unit_rate, payload.notes)
    return {"success": True, "data": row_to_dict(row)}


@router.get("/{job_id}/expenses")
async def expenses(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT * FROM job_expenses WHERE job_id=$1 AND worker_id=$2 ORDER BY created_at DESC", UUID(job_id), UUID(await worker_id(request, identity)))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.post("/{job_id}/expenses")
async def add_expense(job_id: str, payload: ExpenseCreate, request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await owned_job(conn, wid, job_id)
        row = await conn.fetchrow("INSERT INTO job_expenses(job_id,worker_id,category,description,amount,receipt_url) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *", UUID(job_id), UUID(wid), payload.category, payload.description, payload.amount, payload.receipt_url)
    return {"success": True, "data": row_to_dict(row)}


@router.get("/{job_id}/checklist")
async def checklist(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        await owned_job(conn, await worker_id(request, identity), job_id); rows = await conn.fetch("SELECT * FROM job_checklists WHERE job_id=$1 ORDER BY created_at", UUID(job_id))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/{job_id}/tasks")
async def tasks(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        await owned_job(conn, await worker_id(request, identity), job_id); rows = await conn.fetch("SELECT * FROM job_tasks WHERE job_id=$1 ORDER BY sort_order", UUID(job_id))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/{job_id}/customer-confirmation")
async def confirmation(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        if identity.get("role") == "CUSTOMER":
            cid = await customer_id(request, identity)
            owns = await conn.fetchval("SELECT 1 FROM jobs WHERE id=$1 AND customer_id=$2", UUID(job_id), UUID(cid))
            if not owns:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        else:
            await owned_job(conn, await worker_id(request, identity), job_id)
        row = await conn.fetchrow("SELECT * FROM customer_confirmations WHERE job_id=$1", UUID(job_id))
    return {"success": True, "data": row_to_dict(row)}


@router.post("/{job_id}/customer-confirmation")
async def save_confirmation(job_id: str, payload: CustomerConfirmationCreate, request: Request, identity: dict = Depends(current_identity)):
    pool = require_pool(request)
    if identity.get("role") == "CUSTOMER":
        cid = await customer_id(request, identity)
        wid: str | None = None
        async with transaction(pool) as conn:
            job = await conn.fetchrow("SELECT * FROM jobs WHERE id=$1 AND customer_id=$2 FOR UPDATE", UUID(job_id), UUID(cid))
            if not job:
                raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
            existing = await conn.fetchval("SELECT 1 FROM customer_confirmations WHERE job_id=$1", UUID(job_id))
            if job["status"] != "WAITING_CUSTOMER" and not (job["status"] == "COMPLETED" and not existing):
                raise HTTPException(409, {"code": "INVALID_CONFIRMATION_STATE", "message": "Confirmation is available once work is complete."})
            assignment = await conn.fetchrow("SELECT worker_id FROM job_assignments WHERE job_id=$1", UUID(job_id))
            wid = str(assignment["worker_id"]) if assignment else None
            row = await conn.fetchrow(
                "INSERT INTO customer_confirmations(job_id,customer_name,rating,signature_url,comments,approved_at) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(job_id) DO UPDATE SET customer_name=EXCLUDED.customer_name,rating=EXCLUDED.rating,signature_url=EXCLUDED.signature_url,comments=EXCLUDED.comments,approved_at=NOW(),updated_at=NOW() RETURNING *",
                UUID(job_id), payload.customer_name, payload.rating, payload.signature_url, payload.comments)
            if wid:
                await conn.execute("INSERT INTO ratings(job_id,worker_id,rating,review) VALUES($1,$2,$3,$4) ON CONFLICT(job_id) DO UPDATE SET rating=EXCLUDED.rating,review=EXCLUDED.review,updated_at=NOW()", UUID(job_id), UUID(wid), payload.rating, payload.comments)
                await conn.execute("UPDATE workers SET rating_count=(SELECT COUNT(*) FROM ratings WHERE worker_id=$1),rating_avg=COALESCE((SELECT AVG(rating) FROM ratings WHERE worker_id=$1),0) WHERE id=$1", UUID(wid))
        completed = None
        if job["status"] == "WAITING_CUSTOMER" and wid:
            completed = await transition(request, identity, job_id, "COMPLETED", "customer_confirmed", force_complete=True, wid_override=wid)
        return {"success": True, "data": {"confirmation": row_to_dict(row), "job": completed}}
    wid = await worker_id(request, identity)
    async with transaction(pool) as conn:
        job = await owned_job(conn, wid, job_id, True)
        if job["status"] not in ("IN_PROGRESS", "WAITING_CUSTOMER", "ARRIVED"):
            raise HTTPException(409, {"code": "INVALID_CONFIRMATION_STATE", "message": "Customer confirmation is not available for this job state."})
        row = await conn.fetchrow("INSERT INTO customer_confirmations(job_id,customer_name,rating,signature_url,comments,approved_at) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(job_id) DO UPDATE SET customer_name=EXCLUDED.customer_name,rating=EXCLUDED.rating,signature_url=EXCLUDED.signature_url,comments=EXCLUDED.comments,approved_at=NOW(),updated_at=NOW() RETURNING *", UUID(job_id), payload.customer_name, payload.rating, payload.signature_url, payload.comments)
        await conn.execute("INSERT INTO ratings(job_id,worker_id,rating,review) VALUES($1,$2,$3,$4) ON CONFLICT(job_id) DO UPDATE SET rating=EXCLUDED.rating,review=EXCLUDED.review,updated_at=NOW()", UUID(job_id), UUID(wid), payload.rating, payload.comments)
        await conn.execute("UPDATE workers SET rating_count=(SELECT COUNT(*) FROM ratings WHERE worker_id=$1),rating_avg=COALESCE((SELECT AVG(rating) FROM ratings WHERE worker_id=$1),0) WHERE id=$1", UUID(wid))
    completed = await transition(request, identity, job_id, "COMPLETED", "customer_confirmation", force_complete=True)
    return {"success": True, "data": {"confirmation": row_to_dict(row), "job": completed}}
