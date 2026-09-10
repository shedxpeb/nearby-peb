from fastapi import APIRouter, Depends, Request
from ..database import require_pool, row_to_dict
from ..security import current_identity
from .workers import worker_id

router = APIRouter(prefix="/api", tags=["earnings"])


@router.get("/earnings")
async def earnings(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT e.*,j.title,j.company_name FROM earnings e JOIN jobs j ON j.id=e.job_id WHERE e.worker_id=$1 ORDER BY e.earned_at DESC", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/earnings/summary")
async def summary(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow("SELECT COALESCE(SUM(net_amount),0) AS total,COUNT(*) AS completed_jobs,COALESCE(SUM(net_amount) FILTER (WHERE status='PENDING'),0) AS pending,COALESCE(SUM(net_amount) FILTER (WHERE status='PAID'),0) AS paid FROM earnings WHERE worker_id=$1", wid)
    return {"success": True, "data": row_to_dict(row)}


@router.get("/earnings/recent")
async def recent(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT * FROM earnings WHERE worker_id=$1 ORDER BY earned_at DESC LIMIT 10", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.get("/payouts")
async def payouts(request: Request, identity: dict = Depends(current_identity)):
    wid = await worker_id(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch("SELECT * FROM payouts WHERE worker_id=$1 ORDER BY created_at DESC", wid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}