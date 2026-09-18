from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import LoginRequest, RegisterRequest
from ..security import create_access_token, hash_password, verify_password
from ..security_portal import require_worker
from ..utils import normalize_phone

router = APIRouter(prefix="/api/worker/auth", tags=["worker-auth"])


@router.post("/register")
async def register(payload: RegisterRequest, request: Request):
    """Worker registration - role is forced to WORKER"""
    pool = require_pool(request)
    async with transaction(pool) as conn:
        normalized_phone = normalize_phone(payload.phone)
        exists = await conn.fetchval("SELECT 1 FROM users WHERE phone=$1 OR ($2::text IS NOT NULL AND email=$2)", normalized_phone, payload.email)
        if exists:
            raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account already exists for this phone or email."})
        
        # Force role to WORKER
        user = await conn.fetchrow("INSERT INTO users(phone,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,phone,email,role",
                                  normalized_phone, payload.email, hash_password(payload.password), "WORKER")
        
        profile = await conn.fetchrow("INSERT INTO workers(user_id,full_name,primary_trade) VALUES($1,$2,$3) RETURNING id,full_name,primary_trade,status,availability_status",
                                     user["id"], payload.full_name, payload.primary_trade or None)
    
    token = create_access_token(str(user["id"]), "WORKER")
    return {"success": True, "data": {"token": token, "user": row_to_dict(user), "worker": row_to_dict(profile)}}


@router.post("/login")
async def login(payload: LoginRequest, request: Request):
    """Worker login - validates worker role"""
    pool = require_pool(request)
    normalized_phone = normalize_phone(payload.phone)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT u.*, w.id AS worker_id FROM users u LEFT JOIN workers w ON w.user_id=u.id WHERE u.phone=$1 AND u.is_active=TRUE AND u.role='WORKER'", normalized_phone)
        if not row or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Phone number or password is incorrect."})
        await conn.execute("UPDATE users SET last_login_at=$2 WHERE id=$1", row["id"], datetime.now(timezone.utc))
    
    token = create_access_token(str(row["id"]), "WORKER")
    data = {"token": token, "user": {"id": str(row["id"]), "phone": row["phone"], "email": row["email"], "role": "WORKER"}}
    if row["worker_id"]:
        data["worker_id"] = str(row["worker_id"])
    return {"success": True, "data": data}


@router.post("/logout")
async def logout(_: dict = Depends(require_worker)):
    return {"success": True, "data": {"logged_out": True}}


@router.get("/me")
async def me(request: Request, identity: dict = Depends(require_worker)):
    """Get current worker profile"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT u.id,u.phone,u.email,u.role,w.id AS worker_id,w.full_name,w.primary_trade,w.availability_status
               FROM users u LEFT JOIN workers w ON w.user_id=u.id WHERE u.id=$1""", identity["sub"])
    if not row:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "Account not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.post("/forgot-password")
async def forgot_password(payload: dict):
    return {"success": True, "data": {"message": "If an account exists, recovery instructions will be sent."}}