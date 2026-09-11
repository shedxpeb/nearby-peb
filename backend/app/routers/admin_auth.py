from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import LoginRequest, RegisterRequest
from ..security import create_access_token, hash_password, verify_password
from ..security_portal import require_admin

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


@router.post("/register")
async def register(payload: RegisterRequest, request: Request):
    """Admin registration - role is forced to ADMIN"""
    pool = require_pool(request)
    async with transaction(pool) as conn:
        exists = await conn.fetchval("SELECT 1 FROM users WHERE phone=$1 OR ($2::text IS NOT NULL AND email=$2)", payload.phone, payload.email)
        if exists:
            raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account already exists for this phone or email."})
        
        # Force role to ADMIN
        user = await conn.fetchrow("INSERT INTO users(phone,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,phone,email,role", 
                                  payload.phone, payload.email, hash_password(payload.password), "ADMIN")
    
    token = create_access_token(str(user["id"]), "ADMIN")
    return {"success": True, "data": {"token": token, "user": row_to_dict(user)}}


@router.post("/login")
async def login(payload: LoginRequest, request: Request):
    """Admin login - validates admin role"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT u.* FROM users u WHERE u.phone=$1 AND u.is_active=TRUE AND u.role='ADMIN'", payload.phone)
        if not row or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Phone number or password is incorrect."})
        await conn.execute("UPDATE users SET last_login_at=$2 WHERE id=$1", row["id"], datetime.now(timezone.utc))
    
    token = create_access_token(str(row["id"]), "ADMIN")
    data = {"token": token, "user": {"id": str(row["id"]), "phone": row["phone"], "email": row["email"], "role": "ADMIN"}}
    return {"success": True, "data": data}


@router.post("/logout")
async def logout(_: dict = Depends(require_admin)):
    return {"success": True, "data": {"logged_out": True}}


@router.get("/me")
async def me(request: Request, identity: dict = Depends(require_admin)):
    """Get current admin profile"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT u.id,u.phone,u.email,u.role
               FROM users u WHERE u.id=$1 AND u.role='ADMIN'""", identity["sub"])
    if not row:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "Account not found."})
    return {"success": True, "data": row_to_dict(row)}