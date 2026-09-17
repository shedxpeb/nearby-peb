from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import CustomerUpdate, SiteCreate
from ..security import current_identity
from ..security_portal import require_customer

router = APIRouter(prefix="/api/customer", tags=["customer"])

TAB_STATUSES = {
    "ACTIVE": ("REQUESTED", "OFFERED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "PAUSED", "WAITING_CUSTOMER"),
    "COMPLETED": ("COMPLETED",),
    "CANCELLED": ("CANCELLED",),
    "DISPUTED": ("DISPUTED",),
}


async def current_customer(request: Request, identity: dict) -> dict:
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT c.*, u.phone, u.email FROM customers c JOIN users u ON u.id=c.user_id WHERE c.user_id=$1 AND c.deleted_at IS NULL", identity["sub"])
    if not row:
        raise HTTPException(404, {"code": "CUSTOMER_NOT_FOUND", "message": "Customer profile not found."})
    return row_to_dict(row)


async def customer_id(request: Request, identity: dict) -> str:
    return str((await current_customer(request, identity))["id"])


@router.get("/profile")
async def profile(request: Request, identity: dict = Depends(require_customer)):
    return {"success": True, "data": await current_customer(request, identity)}


@router.put("/profile")
async def update_profile(payload: CustomerUpdate, request: Request, identity: dict = Depends(require_customer)):
    customer = await current_customer(request, identity)
    values = payload.model_dump(exclude_none=True)
    if not values:
        return {"success": True, "data": customer}
    sets = [f"{key}=${i + 2}" for i, key in enumerate(values)]
    async with transaction(require_pool(request)) as conn:
        row = await conn.fetchrow(f"UPDATE customers SET {', '.join(sets)} WHERE id=$1 RETURNING *", UUID(str(customer["id"])), *values.values())
    data = row_to_dict(row); data["phone"] = customer["phone"]; data["email"] = customer["email"]
    return {"success": True, "data": data}


@router.get("/sites")
async def sites(request: Request, identity: dict = Depends(require_customer)):
    cid = await customer_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT * FROM customer_sites WHERE customer_id=$1 AND is_active=TRUE ORDER BY created_at DESC", UUID(cid))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.post("/sites")
async def create_site(payload: SiteCreate, request: Request, identity: dict = Depends(require_customer)):
    cid = await customer_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        row = await conn.fetchrow(
            "INSERT INTO customer_sites(customer_id,site_name,address_line,city,state,postal_code,latitude,longitude,contact_name,contact_phone,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
            UUID(cid), payload.site_name, payload.address_line, payload.city, payload.state, payload.postal_code,
            payload.latitude, payload.longitude, payload.contact_name, payload.contact_phone, payload.notes)
    return {"success": True, "data": row_to_dict(row)}


async def owned_site(conn, cid: str, site_id: str):
    row = await conn.fetchrow("SELECT * FROM customer_sites WHERE id=$1 AND customer_id=$2 AND is_active=TRUE", UUID(site_id), UUID(cid))
    if not row:
        raise HTTPException(404, {"code": "SITE_NOT_FOUND", "message": "Service site not found."})
    return row


@router.put("/sites/{site_id}")
async def update_site(site_id: str, payload: SiteCreate, request: Request, identity: dict = Depends(require_customer)):
    cid = await customer_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await owned_site(conn, cid, site_id)
        row = await conn.fetchrow(
            "UPDATE customer_sites SET site_name=$3,address_line=$4,city=$5,state=$6,postal_code=$7,latitude=$8,longitude=$9,contact_name=$10,contact_phone=$11,notes=$12,updated_at=NOW() WHERE id=$1 AND customer_id=$2 RETURNING *",
            UUID(site_id), UUID(cid), payload.site_name, payload.address_line, payload.city, payload.state, payload.postal_code,
            payload.latitude, payload.longitude, payload.contact_name, payload.contact_phone, payload.notes)
    return {"success": True, "data": row_to_dict(row)}


@router.delete("/sites/{site_id}")
async def delete_site(site_id: str, request: Request, identity: dict = Depends(require_customer)):
    cid = await customer_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await owned_site(conn, cid, site_id)
        await conn.execute("UPDATE customer_sites SET is_active=FALSE,updated_at=NOW() WHERE id=$1", UUID(site_id))
    return {"success": True, "data": {"deleted": True}}


@router.get("/jobs")
async def my_jobs(request: Request, tab: str = "ACTIVE", q: str = Query(default="", max_length=120), limit: int = Query(default=10, ge=1, le=50), offset: int = Query(default=0, ge=0), identity: dict = Depends(require_customer)):
    cid = await customer_id(request, identity)
    statuses = TAB_STATUSES.get(tab.upper(), TAB_STATUSES["ACTIVE"])
    params: list = [UUID(cid)]
    status_list = list(statuses)
    search = ""
    if q.strip():
        params.append(f"%{q.strip()}%")
        search = " AND (j.title ILIKE $2 OR j.service_type ILIKE $2 OR cs.site_name ILIKE $2)"
    where = f"WHERE j.customer_id=$1 AND j.status = ANY(${len(params) + 1}::varchar[]){search}"
    params.append(status_list)
    async with require_pool(request).acquire() as conn:
        total = await conn.fetchval(f"SELECT COUNT(*) FROM jobs j LEFT JOIN customer_sites cs ON cs.id=j.site_id {where}", *params)
        rows = await conn.fetch(
            f"""SELECT j.*, cs.site_name AS site_name_ref, w.full_name AS worker_name, w.rating_avg AS worker_rating, w.profile_photo_url AS worker_photo,
                   ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at AS assignment_completed_at
                FROM jobs j LEFT JOIN customer_sites cs ON cs.id=j.site_id
                LEFT JOIN job_assignments ja ON ja.job_id=j.id LEFT JOIN workers w ON w.id=ja.worker_id
                {where} ORDER BY j.created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}""",
            *params, limit, offset)
    return {"success": True, "data": {"total": total, "items": [row_to_dict(x) for x in rows]}}
