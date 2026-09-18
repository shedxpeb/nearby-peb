import os
import shutil
from pathlib import Path
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response, FileResponse
from jose import JWTError, jwt
from ..config import get_settings
from ..database import require_pool
from ..security import current_identity

router = APIRouter(prefix="/api/storage", tags=["storage"])

APP_NAME = "shedx-worker-portal"
MAX_BYTES = 8 * 1024 * 1024

# Local storage configuration
_settings = get_settings()
STORAGE_ROOT = Path(_settings.storage_root)
STORAGE_PUBLIC_URL = _settings.storage_public_url

# Ensure storage directories exist
UPLOADS_DIR = STORAGE_ROOT / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _generate_safe_filename(original_filename: str) -> str:
    """Generate a safe filename from the original filename."""
    if not original_filename:
        return f"{uuid4().hex}.bin"
    
    # Extract extension
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "bin"
    ext = "".join(c for c in ext if c.isalnum())[:5] or "bin"
    
    # Generate safe base name
    return f"{uuid4().hex}.{ext}"


def _validate_file_type(content_type: str) -> bool:
    """Validate that the file is an image."""
    if not content_type:
        return False
    return content_type.startswith("image/")


def _get_file_path(path: str) -> Path:
    """Get the full filesystem path for a storage path."""
    # Security: ensure the path is within STORAGE_ROOT
    file_path = STORAGE_ROOT / path
    try:
        file_path.resolve().relative_to(STORAGE_ROOT.resolve())
    except ValueError:
        raise HTTPException(400, {"code": "INVALID_PATH", "message": "Invalid file path."})
    return file_path


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Store a file in local storage."""
    file_path = _get_file_path(path)
    
    # Ensure parent directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write file
    try:
        with open(file_path, "wb") as f:
            f.write(data)
    except IOError as e:
        raise HTTPException(500, {"code": "STORAGE_WRITE_FAILED", "message": f"Failed to write file: {str(e)}"})
    
    # Generate public URL
    public_url = f"{STORAGE_PUBLIC_URL}/{path}"
    
    return {
        "path": path,
        "size": len(data),
        "content_type": content_type,
        "url": public_url
    }


async def get_object(path: str) -> tuple[bytes, str]:
    """Retrieve a file from local storage."""
    file_path = _get_file_path(path)
    
    if not file_path.exists():
        raise HTTPException(404, {"code": "OBJECT_NOT_FOUND", "message": "File was not found."})
    
    try:
        with open(file_path, "rb") as f:
            data = f.read()
    except IOError as e:
        raise HTTPException(500, {"code": "STORAGE_READ_FAILED", "message": f"Failed to read file: {str(e)}"})
    
    return data, "application/octet-stream"


async def delete_object(path: str) -> bool:
    """Delete a file from local storage."""
    file_path = _get_file_path(path)
    
    if not file_path.exists():
        return False
    
    try:
        file_path.unlink()
        return True
    except IOError:
        return False


@router.post("/upload")
async def upload(request: Request, file: UploadFile, identity: dict = Depends(current_identity)):
    """Upload a file to local storage."""
    data = await file.read()
    if not data:
        raise HTTPException(400, {"code": "EMPTY_FILE", "message": "The uploaded file is empty."})
    
    if len(data) > MAX_BYTES:
        raise HTTPException(413, {"code": "FILE_TOO_LARGE", "message": "Files up to 8 MB are supported."})
    
    content_type = file.content_type or "application/octet-stream"
    if not _validate_file_type(content_type):
        raise HTTPException(400, {"code": "UNSUPPORTED_FILE", "message": "Only image uploads are supported."})
    
    # Generate safe filename and path
    ext = (file.filename or "photo.jpg").rsplit(".", 1)[-1].lower()[:5]
    if not ext.isalnum():
        ext = "jpg"
    
    filename = _generate_safe_filename(file.filename or f"photo.{ext}")
    path = f"{APP_NAME}/uploads/{identity['sub']}/{filename}"
    
    # Store file
    result = await put_object(path, data, content_type)
    
    # Record in database
    async with require_pool(request).acquire() as conn:
        await conn.execute(
            "INSERT INTO storage_objects(owner_user_id,path,content_type,size_bytes) VALUES($1,$2,$3,$4)",
            UUID(identity["sub"]), path, content_type, len(data)
        )
    
    return {
        "success": True,
        "data": {
            "path": path,
            "size": len(data),
            "content_type": content_type,
            "url": result["url"]
        }
    }


@router.get("/files/{path:path}")
async def download(path: str, request: Request, token: str | None = Query(default=None)):
    """Download a file from local storage."""
    auth = request.headers.get("authorization", "")
    raw = token or (auth[7:] if auth.lower().startswith("bearer ") else "")
    
    if not raw:
        raise HTTPException(401, {"code": "UNAUTHORIZED", "message": "Authentication required."})
    
    try:
        jwt.decode(raw, _settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, {"code": "INVALID_SESSION", "message": "Session is invalid or expired."})
    
    # Verify file exists in database
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow("SELECT content_type FROM storage_objects WHERE path=$1", path)
    
    if not row:
        raise HTTPException(404, {"code": "OBJECT_NOT_FOUND", "message": "File was not found."})
    
    # Serve file from local storage
    file_path = _get_file_path(path)
    if not file_path.exists():
        raise HTTPException(404, {"code": "OBJECT_NOT_FOUND", "message": "File was not found on disk."})
    
    return FileResponse(
        file_path,
        media_type=row["content_type"] or "application/octet-stream",
        headers={"Cache-Control": "private, max-age=3600"}
    )


@router.delete("/files/{path:path}")
async def delete_file(path: str, request: Request, identity: dict = Depends(current_identity)):
    """Delete a file from local storage."""
    # Verify ownership
    async with require_pool(request).acquire() as conn:
        row = await conn.fetchrow(
            "SELECT owner_user_id FROM storage_objects WHERE path=$1", path
        )
    
    if not row:
        raise HTTPException(404, {"code": "OBJECT_NOT_FOUND", "message": "File was not found."})
    
    if str(row["owner_user_id"]) != identity["sub"]:
        raise HTTPException(403, {"code": "FORBIDDEN", "message": "You do not own this file."})
    
    # Delete from storage
    await delete_object(path)
    
    # Delete from database
    async with require_pool(request).acquire() as conn:
        await conn.execute("DELETE FROM storage_objects WHERE path=$1", path)
    
    return {"success": True, "message": "File deleted successfully"}