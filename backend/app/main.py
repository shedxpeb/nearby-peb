from contextlib import asynccontextmanager
from pathlib import Path
from collections import defaultdict
from time import time
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from .config import get_settings
from .database import close_pool, open_pool, ping, require_pool
from .security import current_identity
from .routers import admin, artifacts, auth, admin_auth, chat, customer_auth, worker_auth, customers, earnings, jobs, notifications, storage, support, workers, skills

settings = get_settings()
MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"

# Simple in-memory rate limiting (for production, use Redis or shared storage)
# NOTE: This is process-local. With multiple workers, each worker has its own rate limit store.
# For Render deployment with auto-scaling, this is NOT globally effective.
# Recommended: Use --workers 1 for small deployments, or implement Redis/nginx rate limiting.
rate_limit_store = defaultdict(list)
RATE_LIMIT_REQUESTS = 20  # requests
RATE_LIMIT_WINDOW = 60  # seconds


async def run_migrations(pool) -> list[str]:
    applied_now: list[str] = []
    async with pool.acquire() as conn:
        await conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())")
        applied = {row["filename"] for row in await conn.fetch("SELECT filename FROM schema_migrations")}
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in applied:
                continue
            async with conn.transaction():
                await conn.execute(path.read_text())
                await conn.execute("INSERT INTO schema_migrations(filename) VALUES($1)", path.name)
            applied_now.append(path.name)
    return applied_now


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_pool = await open_pool(settings.database_url)
        # In production, migrations should be run separately using run_migrations.py
        # In development, we allow auto-migrations for convenience
        if settings.environment != "production" and app.state.db_pool is not None:
            app.state.migrations_applied = await run_migrations(app.state.db_pool)
    except Exception as exc:
        app.state.db_pool = None
        app.state.db_error = str(exc)
    
    # Local storage is always ready
    app.state.storage_ready = True
    
    yield
    await close_pool(getattr(app.state, "db_pool", None))


app = FastAPI(title="ShedX Worker Portal API", version=settings.app_version, lifespan=lifespan)

# Security middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate limiting middleware for auth endpoints
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Only rate limit authentication endpoints
    if "/auth/" in request.url.path or "/login" in request.url.path or "/register" in request.url.path:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time()
        
        # Clean old entries
        rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if current_time - t < RATE_LIMIT_WINDOW]
        
        # Check if rate limit exceeded
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"success": False, "error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Please try again later."}}
            )
        
        # Add current request
        rate_limit_store[client_ip].append(current_time)
    
    return await call_next(request)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(admin_auth.router)
app.include_router(customer_auth.router)
app.include_router(worker_auth.router)
app.include_router(workers.router)
app.include_router(customers.router)
app.include_router(jobs.router)
app.include_router(chat.router)
app.include_router(artifacts.router)
app.include_router(earnings.router)
app.include_router(notifications.router)
app.include_router(support.router)
app.include_router(storage.router)
app.include_router(skills.router)

# Serve static files for storage
storage_root = Path(settings.storage_root)
if storage_root.exists():
    app.mount("/uploads", StaticFiles(directory=str(storage_root)), name="uploads")


@app.get("/api/health")
async def health(request: Request):
    pool = getattr(request.app.state, "db_pool", None)
    db_error = getattr(request.app.state, "db_error", None)
    return {
        "success": True,
        "data": {
            "api": "ok",
            "database": "connected" if await ping(pool) else "not_configured",
            "storage": "ready" if getattr(request.app.state, "storage_ready", False) else "not_configured",
            "version": settings.app_version,
            "environment": settings.environment
        }
    }

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    # Extract specific validation errors and return user-friendly messages
    errors = []
    for error in exc.errors():
        field = error['loc'][-1] if error['loc'] else 'field'
        message = error['msg']
        errors.append({
            "field": field,
            "message": message
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Please check your input",
                "details": errors
            }
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the full error server-side (in production, this would go to a logging system)
    import traceback
    error_details = traceback.format_exc()
    
    # Return safe error information to client
    if settings.environment == "production":
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An internal server error occurred. Please try again later."
                }
            }
        )
    else:
        # In development, return more details
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": str(exc),
                    "details": error_details
                }
            }
        )


@app.get("/api/health/db")
async def protected_health(request: Request, _: dict = Depends(current_identity)):
    pool = require_pool(request)
    if not await ping(pool):
        raise HTTPException(503, {"code": "DATABASE_UNAVAILABLE", "message": "Database health check failed."})
    return {"success": True, "data": {"database": "connected"}}
