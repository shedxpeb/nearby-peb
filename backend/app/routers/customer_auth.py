from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import require_pool, transaction, row_to_dict
from ..schemas import LoginRequest, RegisterRequest
from ..security import create_access_token, hash_password, verify_password
from ..security_portal import require_customer
from ..utils import normalize_email, normalize_phone

router = APIRouter(prefix="/api/customer/auth", tags=["customer-auth"])


@router.post("/register")
async def register(payload: RegisterRequest, request: Request):
    """Customer registration - role is forced to CUSTOMER"""
    pool = require_pool(request)
    import asyncpg

    # Normalize phone and email for consistent duplicate checking
    normalized_phone = normalize_phone(payload.phone)
    normalized_email = normalize_email(payload.email)

    try:
        async with transaction(pool) as conn:
            # Check for existing user and get their role if exists
            existing = await conn.fetchrow(
                "SELECT id, phone, email, role FROM users WHERE phone=$1 OR ($2::text IS NOT NULL AND LOWER(email)=$2)",
                normalized_phone, normalized_email
            )

            if existing:
                # Determine which field is duplicate
                if existing["phone"] == normalized_phone and existing["email"] and existing["email"].lower() == normalized_email:
                    raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account with this phone and email already exists."})
                elif existing["phone"] == normalized_phone:
                    if existing["role"] == "CUSTOMER":
                        raise HTTPException(409, {"code": "PHONE_EXISTS", "message": "A customer account with this phone number already exists."})
                    elif existing["role"] == "WORKER":
                        raise HTTPException(409, {"code": "PHONE_EXISTS", "message": "A worker account with this phone number already exists. Use a different phone number for customer registration."})
                    else:
                        raise HTTPException(409, {"code": "PHONE_EXISTS", "message": "An account with this phone number already exists."})
                elif existing["email"] and existing["email"].lower() == normalized_email:
                    if existing["role"] == "CUSTOMER":
                        raise HTTPException(409, {"code": "EMAIL_EXISTS", "message": "A customer account with this email already exists."})
                    elif existing["role"] == "WORKER":
                        raise HTTPException(409, {"code": "EMAIL_EXISTS", "message": "A worker account with this email already exists. Use a different email for customer registration."})
                    else:
                        raise HTTPException(409, {"code": "EMAIL_EXISTS", "message": "An account with this email already exists."})
                else:
                    raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account already exists for this phone or email."})

            # Force role to CUSTOMER
            user = await conn.fetchrow("INSERT INTO users(phone,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,phone,email,role",
                                      normalized_phone, normalized_email, hash_password(payload.password), "CUSTOMER")

            profile = await conn.fetchrow("INSERT INTO customers(user_id,full_name) VALUES($1,$2) RETURNING id,full_name,company_name",
                                         user["id"], payload.full_name)

        token = create_access_token(str(user["id"]), "CUSTOMER")
        return {"success": True, "data": {"token": token, "user": row_to_dict(user), "customer": row_to_dict(profile)}}
    except asyncpg.UniqueViolationError as e:
        # Handle race condition where duplicate check passed but insert failed
        if "phone" in str(e):
            raise HTTPException(409, {"code": "PHONE_EXISTS", "message": "An account with this phone number already exists."})
        elif "email" in str(e):
            raise HTTPException(409, {"code": "EMAIL_EXISTS", "message": "An account with this email address already exists."})
        else:
            raise HTTPException(409, {"code": "USER_EXISTS", "message": "An account already exists."})


@router.post("/login")
async def login(payload: LoginRequest, request: Request):
    """Customer login - validates customer role"""
    pool = require_pool(request)

    # Normalize phone number for consistent lookup
    normalized_phone = normalize_phone(payload.phone)

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT u.*, c.id AS customer_id FROM users u LEFT JOIN customers c ON c.user_id=u.id WHERE u.phone=$1 AND u.is_active=TRUE AND u.role='CUSTOMER'", normalized_phone)
        if not row or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "Phone number or password is incorrect."})
        await conn.execute("UPDATE users SET last_login_at=$2 WHERE id=$1", row["id"], datetime.now(timezone.utc))

    token = create_access_token(str(row["id"]), "CUSTOMER")
    data = {"token": token, "user": {"id": str(row["id"]), "phone": row["phone"], "email": row["email"], "role": "CUSTOMER"}}
    if row["customer_id"]:
        data["customer_id"] = str(row["customer_id"])
    return {"success": True, "data": data}


@router.post("/logout")
async def logout(_: dict = Depends(require_customer)):
    return {"success": True, "data": {"logged_out": True}}


@router.get("/me")
async def me(request: Request, identity: dict = Depends(require_customer)):
    """Get current customer profile"""
    pool = require_pool(request)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT u.id,u.phone,u.email,u.role,c.id AS customer_id,c.full_name,c.company_name
               FROM users u LEFT JOIN customers c ON c.user_id=u.id WHERE u.id=$1""", identity["sub"])
    if not row:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "Account not found."})
    return {"success": True, "data": row_to_dict(row)}


@router.post("/forgot-password")
async def forgot_password(payload: dict):
    return {"success": True, "data": {"message": "If an account exists, recovery instructions will be sent."}}