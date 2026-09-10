from urllib.parse import quote
import httpx
from fastapi import APIRouter, HTTPException, Query
from ..config import get_settings

router = APIRouter(prefix="/api/maps", tags=["maps"])


@router.get("/health")
async def maps_health():
    configured = bool(get_settings().maptiler_api_key)
    return {"success": True, "data": {"provider": "maptiler", "configured": configured, "message": "ready" if configured else "Map API key is not configured."}}


async def maptiler(path: str, params: dict):
    key = get_settings().maptiler_api_key
    if not key:
        raise HTTPException(503, {"code": "MAP_NOT_CONFIGURED", "message": "Map API key is not configured."})
    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.get(f"https://api.maptiler.com{path}", params={**params, "key": key})
    if response.status_code >= 400:
        raise HTTPException(502, {"code": "MAP_PROVIDER_ERROR", "message": "Map provider request failed."})
    return response.json()


@router.get("/geocode")
async def geocode(q: str = Query(min_length=2, max_length=200), limit: int = Query(5, ge=1, le=10), language: str = "en"):
    return {"success": True, "data": await maptiler(f"/geocoding/{quote(q, safe='')}.json", {"limit": limit, "language": language})}


@router.get("/reverse")
async def reverse(lon: float, lat: float, language: str = "en"):
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise HTTPException(400, {"code": "INVALID_COORDINATES", "message": "Invalid longitude/latitude."})
    return {"success": True, "data": await maptiler(f"/geocoding/{lon},{lat}.json", {"limit": 1, "language": language})}