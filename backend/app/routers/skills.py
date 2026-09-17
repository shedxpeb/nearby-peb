from fastapi import APIRouter, Request
from ..database import require_pool, row_to_dict

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("")
async def list_skills(request: Request):
    """Get all active skills available for selection"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name, category, is_active FROM skills WHERE is_active = TRUE ORDER BY name")
    return {"success": True, "data": [row_to_dict(x) for x in rows]}
