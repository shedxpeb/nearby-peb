from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import StatusUpdate, WorkerUpdate
from ..security import current_identity
from ..security_portal import require_worker
from ..repositories import WorkerRepository

router = APIRouter(prefix="/api/worker", tags=["worker"])


class SkillsUpdate(__import__("pydantic").BaseModel):
    skills: list[str]


class AreasUpdate(__import__("pydantic").BaseModel):
    areas: list[str]
    radius_km: float = 10


class AvailabilityUpdate(__import__("pydantic").BaseModel):
    days: list[dict]


async def worker_id(request: Request, identity: dict) -> str:
    pool = require_pool(request)
    async with pool.acquire() as conn:
        worker = await WorkerRepository.by_user(conn, identity["sub"])
    if not worker:
        raise HTTPException(404, {"code": "WORKER_NOT_FOUND", "message": "Worker profile not found."})
    return str(worker["id"])


@router.get("/profile")
async def profile(request: Request, identity: dict = Depends(require_worker)):
    pool = require_pool(request)
    async with pool.acquire() as conn:
        worker = await WorkerRepository.by_user(conn, identity["sub"])
    if not worker:
        raise HTTPException(404, {"code": "WORKER_NOT_FOUND", "message": "Worker profile not found."})
    return {"success": True, "data": worker}


@router.put("/profile")
async def update_profile(payload: WorkerUpdate, request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity); values = payload.model_dump(exclude_none=True)
    if not values:
        return await profile(request, identity)
    sets = [f"{key}=${i + 2}" for i, key in enumerate(values)]
    async with transaction(require_pool(request)) as conn:
        row = await conn.fetchrow(f"UPDATE workers SET {', '.join(sets)} WHERE id=$1 RETURNING *", wid, *values.values())
    return {"success": True, "data": row_to_dict(row)}


@router.get("/status")
async def status(request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow("SELECT id,availability_status,status FROM workers WHERE id=$1", wid)
    return {"success": True, "data": row_to_dict(row)}


@router.put("/status")
async def update_status(payload: StatusUpdate, request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        row = await conn.fetchrow("UPDATE workers SET availability_status=$2 WHERE id=$1 RETURNING id,availability_status,status", wid, payload.status)
    return {"success": True, "data": row_to_dict(row)}


@router.get("/skills")
async def skills(request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT s.id,s.name,s.category,ws.experience_years FROM worker_skills ws JOIN skills s ON s.id=ws.skill_id WHERE ws.worker_id=$1 AND s.is_active=TRUE ORDER BY s.name", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.put("/skills")
async def update_skills(payload: SkillsUpdate, request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await conn.execute("DELETE FROM worker_skills WHERE worker_id=$1", wid)
        for name in payload.skills:
            skill_id = await conn.fetchval("SELECT id FROM skills WHERE name=$1 AND is_active=TRUE", name)
            if skill_id:
                await conn.execute("INSERT INTO worker_skills(worker_id,skill_id) VALUES($1,$2) ON CONFLICT DO NOTHING", wid, skill_id)
        rows = await conn.fetch("SELECT s.id,s.name,s.category,ws.experience_years FROM worker_skills ws JOIN skills s ON s.id=ws.skill_id WHERE ws.worker_id=$1 ORDER BY s.name", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/service-areas")
async def service_areas(request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT sa.*,wsa.radius_km FROM worker_service_areas wsa JOIN service_areas sa ON sa.id=wsa.service_area_id WHERE wsa.worker_id=$1 ORDER BY sa.name", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.put("/service-areas")
async def update_service_areas(payload: AreasUpdate, request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await conn.execute("DELETE FROM worker_service_areas WHERE worker_id=$1", wid)
        for name in payload.areas:
            area_id = await conn.fetchval("SELECT id FROM service_areas WHERE name=$1 LIMIT 1", name)
            if area_id:
                await conn.execute("INSERT INTO worker_service_areas(worker_id,service_area_id,radius_km) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", wid, area_id, payload.radius_km)
        rows = await conn.fetch("SELECT sa.*,wsa.radius_km FROM worker_service_areas wsa JOIN service_areas sa ON sa.id=wsa.service_area_id WHERE wsa.worker_id=$1 ORDER BY sa.name", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/availability")
async def availability(request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT * FROM worker_availability WHERE worker_id=$1 ORDER BY day_of_week", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.put("/availability")
async def update_availability(payload: AvailabilityUpdate, request: Request, identity: dict = Depends(require_worker)):
    wid = await worker_id(request, identity)
    async with transaction(require_pool(request)) as conn:
        await conn.execute("DELETE FROM worker_availability WHERE worker_id=$1", wid)
        for item in payload.days:
            await conn.execute("INSERT INTO worker_availability(worker_id,day_of_week,start_time,end_time,is_available) VALUES($1,$2,$3,$4,$5)", wid, item.get("day_of_week", 0), item.get("start_time", "09:00"), item.get("end_time", "18:00"), item.get("is_available", True))
        rows = await conn.fetch("SELECT * FROM worker_availability WHERE worker_id=$1 ORDER BY day_of_week", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}