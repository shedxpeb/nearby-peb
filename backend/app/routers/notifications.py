from fastapi import APIRouter, Depends, Request
from uuid import UUID
from ..database import require_pool, row_to_dict
from ..security import current_identity
from .workers import worker_id
from .customers import customer_id

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


async def owner_column(request: Request, identity: dict) -> tuple[str, UUID]:
    if identity.get("role") == "CUSTOMER":
        return "customer_id", UUID(await customer_id(request, identity))
    return "worker_id", UUID(await worker_id(request, identity))


@router.get("/unread-count")
async def unread_count(request: Request, identity: dict = Depends(current_identity)):
    column, oid = await owner_column(request, identity)
    async with require_pool(request).acquire() as conn:
        count = await conn.fetchval(f"SELECT COUNT(*) FROM notifications WHERE {column}=$1 AND is_read=FALSE", oid)
    return {"success": True, "data": {"unread": count}}


@router.get("")
async def list_notifications(request: Request, identity: dict = Depends(current_identity)):
    column, oid = await owner_column(request, identity)
    async with require_pool(request).acquire() as conn:
        rows = await conn.fetch(f"SELECT * FROM notifications WHERE {column}=$1 ORDER BY created_at DESC LIMIT 100", oid)
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, request: Request, identity: dict = Depends(current_identity)):
    column, oid = await owner_column(request, identity)
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow(f"UPDATE notifications SET is_read=TRUE,read_at=NOW() WHERE id=$1 AND {column}=$2 RETURNING *", UUID(notification_id), oid)
    return {"success": True, "data": row_to_dict(row)}


@router.post("/read-all")
async def mark_all_read(request: Request, identity: dict = Depends(current_identity)):
    column, oid = await owner_column(request, identity)
    async with require_pool(request).acquire() as conn:
        await conn.execute(f"UPDATE notifications SET is_read=TRUE,read_at=NOW() WHERE {column}=$1 AND is_read=FALSE", oid)
    return {"success": True, "data": {"updated": True}}
