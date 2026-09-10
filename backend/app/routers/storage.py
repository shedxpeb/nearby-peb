import os
from uuid import UUID, uuid4
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from jose import JWTError, jwt
from ..config import get_settings
from ..database import require_pool
from ..security import current_identity

router = APIRouter(prefix="/api/storage", tags=["storage"])

APP_NAME = "shedx-worker-portal"
MAX_BYTES = 8 * 1024 * 1024
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
_storage_key: str | None = None


async def init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    emergent_key = get_settings().emergent_llm_key
    if not emergent_key:
        raise HTTPException(503, {"code": "STORAGE_NOT_CONFIGURED", "message": "Object storage is not configured."})
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key})
    if resp.status_code >= 400:
        raise HTTPException(503, {"code": "STORAGE_UNAVAILABLE", "message": "Object storage is unavailable."})
    _storage_key = resp.json()["storage_key"]
    return _storage_key


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = await init_storage()
    for attempt in range(2):
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, content=data)
        if resp.status_code == 503 and attempt == 0:
            _storage_key = None
            key = await init_storage()
            continue
        if resp.status_code == 402:
            raise HTTPException(402, {"code": "STORAGE_QUOTA", "message": "Storage quota reached. Please try again later."})
        if resp.status_code >= 400:
            raise HTTPException(502, {"code": "STORAGE_WRITE_FAILED", "message": "Could not store the uploaded file."})
        return resp.json()
    raise HTTPException(503, {"code": "STORAGE_UNAVAILABLE", "message": "Object storage is unavailable."})


async def get_object(path: str) -> tuple[bytes, str]:
    global _storage_key
    key = await init_storage()
    for attempt in range(2):
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key})
        if resp.status_code == 503 and attempt == 0:
            _storage_key = None
            key = await init_storage()
            continue
        if resp.status_code >= 400:
            raise HTTPException(404, {"code": "OBJECT_NOT_FOUND", "message": "File was not found."})
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    raise HTTPException(503, {"code": "STORAGE_UNAVAILABLE", "message": "Object storage is unavailable."})


@router.post("/upload")
async def upload(request: Request, file: UploadFile, identity: dict = Depends(current_identity)):
    data = await file.read()
    if not data:
        raise HTTPException(400, {"code": "EMPTY_FILE", "message": "The uploaded file is empty."})
    if len(data) > MAX_BYTES:
        raise HTTPException(413, {"code": "FILE_TOO_LARGE", "message": "Files up to 8 MB are supported."})
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("image/"):
        raise HTTPException(400, {"code": "UNSUPPORTED_FILE", "message": "Only image uploads are supported."})
    ext = (file.filename or "photo.jpg").rsplit(".", 1)[-1].lower()[:5]
    if not ext.isalnum():
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{identity['sub']}/{uuid4().hex}.{ext}"
    await put_object(path, data, content_type)
    async with require_pool(request).acquire() as conn:
        await conn.execute("INSERT INTO storage_objects(owner_user_id,path,content_type,size_bytes) VALUES($1,$2,$3,$4)", UUID(identity["sub"]), path, content_type, len(data))
    return {"success": True, "data": {"path": path, "size": len(data), "content_type": content_type}}


@router.get("/files/{path:path}")
async def download(path: str, request: Request, token: str | None = Query(default=None)):
    auth = request.headers.get("authorization", "")
    raw = token or (auth[7:] if auth.lower().startswith("bearer ") else "")
    if not raw:
        raise HTTPException(401, {"code": "UNAUTHORIZED", "message": "Authentication required."})
    try:
        jwt.decode(raw, get_settings().jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, {"code": "INVALID_SESSION", "message": "Session is invalid or expired."})
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow("SELECT content_type FROM storage_objects WHERE path=$1", path)
    if not row:
        raise HTTPException(404, {"code": "OBJECT_NOT_FOUND", "message": "File was not found."})
    data, content_type = await get_object(path)
    return Response(content=data, media_type=row["content_type"] or content_type, headers={"Cache-Control": "private, max-age=3600"})
