from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import LoginRequest, RegisterRequest
from ..security import create_access_token, current_identity, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(payload: RegisterRequest, request: Request):
    pool = require_pool(request)
    async with transaction(pool) as conn:
        exists = await conn.fetchval("SELECT 1 FROM users WHERE phone=$1 OR ($2::text IS NOT NULL AND email=$2)", payload.phone, payload.email)
        if exists:
            raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account already exists for this phone or email."})
        user = await conn.fetchrow("INSERT INTO users(phone,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,phone,email,role", payload.phone, payload.email, hash_password(payload.password), payload.role)
        if payload.role == "CUSTOMER":
            profile = await conn.fetchrow("INSERT INTO customers(user_id,full_name) VALUES($1,$2) RETURNING id,full_name,company_name", user["id"], payload.full_name)
        else:
            profile = await conn.fetchrow("INSERT INTO workers(user_id,full_name,primary_trade) VALUES($1,$2,$3) RETURNING id,full_name,primary_trade,status,availability_status", user["id"], payload.full_name, payload.primary_trade or None)
    token = create_access_token(str(user["id"]), user["role"])
    profile_key = "customer" if payload.role == "CUSTOMER" else "worker"
    return {"success": True, "data": {"token": token, "user": row_to_dict(user), profile_key: row_to_dict(profile)}}


@router.post("/login")
async def login(payload: LoginRequest, request: Request):
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT u.*, w.id AS worker_id, c.id AS customer_id FROM users u LEFT JOIN workers w ON w.user_id=u.id LEFT JOIN customers c ON c.user_id=u.id WHERE u.phone=$1 AND u.is_active=TRUE", payload.phone)
        if not row or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Phone number or password is incorrect."})
        await conn.execute("UPDATE users SET last_login_at=$2 WHERE id=$1", row["id"], datetime.now(timezone.utc))
    token = create_access_token(str(row["id"]), row["role"])
    data = {"token": token, "user": {"id": str(row["id"]), "phone": row["phone"], "email": row["email"], "role": row["role"]}}
    if row["worker_id"]:
        data["worker_id"] = str(row["worker_id"])
    if row["customer_id"]:
        data["customer_id"] = str(row["customer_id"])
    return {"success": True, "data": data}


@router.post("/logout")
async def logout(_: dict = Depends(current_identity)):
    return {"success": True, "data": {"logged_out": True}}


@router.get("/me")
async def me(request: Request, identity: dict = Depends(current_identity)):
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT u.id,u.phone,u.email,u.role,w.id AS worker_id,w.full_name,w.primary_trade,w.availability_status,
               c.id AS customer_id,c.full_name AS customer_name,c.company_name
               FROM users u LEFT JOIN workers w ON w.user_id=u.id LEFT JOIN customers c ON c.user_id=u.id WHERE u.id=$1""", identity["sub"])
    if not row:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "Account not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.post("/forgot-password")
async def forgot_password(payload: dict):
    return {"success": True, "data": {"message": "If an account exists, recovery instructions will be sent."}}
