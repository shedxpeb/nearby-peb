from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from ..database import require_pool, transaction, row_to_dict
from ..security import current_identity
from .workers import worker_id
from .customers import customer_id
from .jobs import owned_job

router = APIRouter(prefix="/api/jobs", tags=["work-artifacts"])


class CompletionUpdate(BaseModel):
    is_completed: bool


class PhotoCreate(BaseModel):
    photo_type: str = Field(pattern="^(BEFORE|DURING|AFTER)$")
    file_url: str = Field(min_length=1, max_length=2000)
    thumbnail_url: str | None = None
    caption: str | None = None


async def ensure(conn, request: Request, identity: dict, job_id: str):
    return await owned_job(conn, await worker_id(request, identity), job_id)


async def ensure_can_view(conn, request: Request, identity: dict, job_id: str):
    """Workers must own the job; customers must own the request."""
    if identity.get("role") == "CUSTOMER":
        cid = await customer_id(request, identity)
        owns = await conn.fetchval("SELECT 1 FROM jobs WHERE id=$1 AND customer_id=$2", UUID(job_id), UUID(cid))
        if not owns:
            raise HTTPException(404, {"code": "JOB_NOT_FOUND", "message": "Service request not found."})
        return None
    return await ensure(conn, request, identity, job_id)


@router.put("/{job_id}/tasks/{task_id}")
async def update_task(job_id: str, task_id: str, payload: CompletionUpdate, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        await ensure(conn, request, identity, job_id)
        row = await conn.fetchrow("UPDATE job_tasks SET is_completed=$3,completed_at=CASE WHEN $3 THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1 AND job_id=$2 RETURNING *", UUID(task_id), UUID(job_id), payload.is_completed)
    if not row: raise HTTPException(404, {"code": "TASK_NOT_FOUND", "message": "Task not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.put("/{job_id}/checklist/{item_id}")
async def update_checklist(job_id: str, item_id: str, payload: CompletionUpdate, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        await ensure(conn, request, identity, job_id)
        row = await conn.fetchrow("UPDATE job_checklists SET is_completed=$3,completed_at=CASE WHEN $3 THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1 AND job_id=$2 RETURNING *", UUID(item_id), UUID(job_id), payload.is_completed)
    if not row: raise HTTPException(404, {"code": "CHECKLIST_NOT_FOUND", "message": "Checklist item not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.put("/{job_id}/materials/{material_id}")
async def update_material(job_id: str, material_id: str, payload: dict, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        await ensure(conn, request, identity, job_id)
        row = await conn.fetchrow("UPDATE job_materials SET quantity=COALESCE($3,quantity),unit_rate=COALESCE($4,unit_rate),notes=COALESCE($5,notes),updated_at=NOW() WHERE id=$1 AND job_id=$2 RETURNING *", UUID(material_id), UUID(job_id), payload.get("quantity"), payload.get("unit_rate"), payload.get("notes"))
    if not row: raise HTTPException(404, {"code": "MATERIAL_NOT_FOUND", "message": "Job material not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.delete("/{job_id}/materials/{material_id}")
async def delete_material(job_id: str, material_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        await ensure(conn, request, identity, job_id)
        await conn.execute("DELETE FROM job_materials WHERE id=$1 AND job_id=$2", UUID(material_id), UUID(job_id))
    return {"success": True, "data": {"deleted": True}}


@router.put("/{job_id}/expenses/{expense_id}")
async def update_expense(job_id: str, expense_id: str, payload: dict, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        wid = await worker_id(request, identity); await owned_job(conn, wid, job_id)
        row = await conn.fetchrow("UPDATE job_expenses SET category=COALESCE($4,category),description=COALESCE($5,description),amount=COALESCE($6,amount),receipt_url=COALESCE($7,receipt_url),updated_at=NOW() WHERE id=$1 AND job_id=$2 AND worker_id=$3 RETURNING *", UUID(expense_id), UUID(job_id), UUID(wid), payload.get("category"), payload.get("description"), payload.get("amount"), payload.get("receipt_url"))
    if not row: raise HTTPException(404, {"code": "EXPENSE_NOT_FOUND", "message": "Job expense not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.delete("/{job_id}/expenses/{expense_id}")
async def delete_expense(job_id: str, expense_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        wid = await worker_id(request, identity); await owned_job(conn, wid, job_id)
        await conn.execute("DELETE FROM job_expenses WHERE id=$1 AND job_id=$2 AND worker_id=$3", UUID(expense_id), UUID(job_id), UUID(wid))
    return {"success": True, "data": {"deleted": True}}


@router.get("/{job_id}/photos")
async def photos(job_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with require_pool(request).acquire() as conn:
        await ensure_can_view(conn, request, identity, job_id)
        rows = await conn.fetch("SELECT * FROM work_photos WHERE job_id=$1 ORDER BY created_at", UUID(job_id))
    return {"success": True, "data": [row_to_dict(x) for x in rows]}


@router.post("/{job_id}/photos")
async def add_photo(job_id: str, payload: PhotoCreate, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        wid = await worker_id(request, identity); await owned_job(conn, wid, job_id)
        row = await conn.fetchrow("INSERT INTO work_photos(job_id,worker_id,photo_type,file_url,thumbnail_url,caption,uploaded_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *", UUID(job_id), UUID(wid), payload.photo_type, payload.file_url, payload.thumbnail_url, payload.caption, datetime.now(timezone.utc))
    return {"success": True, "data": row_to_dict(row)}


@router.delete("/{job_id}/photos/{photo_id}")
async def delete_photo(job_id: str, photo_id: str, request: Request, identity: dict = Depends(current_identity)):
    async with transaction(require_pool(request)) as conn:
        wid = await worker_id(request, identity); await owned_job(conn, wid, job_id)
        await conn.execute("DELETE FROM work_photos WHERE id=$1 AND job_id=$2 AND worker_id=$3", UUID(photo_id), UUID(job_id), UUID(wid))
    return {"success": True, "data": {"deleted": True}}
