from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import get_settings
from .database import close_pool, open_pool, ping, require_pool
from .security import current_identity
from .routers import admin, artifacts, auth, admin_auth, chat, customer_auth, worker_auth, customers, earnings, jobs, notifications, storage, support, workers, skills

settings = get_settings()
MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


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
        if app.state.db_pool is not None:
            app.state.migrations_applied = await run_migrations(app.state.db_pool)
    except Exception as exc:
        app.state.db_pool = None
        app.state.db_error = str(exc)
    
    # Local storage is always ready
    app.state.storage_ready = True
    
    yield
    await close_pool(getattr(app.state, "db_pool", None))


app = FastAPI(title="ShedX Worker Portal API", version=settings.app_version, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

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
    return {"success": True, "data": {"api": "ok", "database": "connected" if await ping(pool) else "not_configured", "storage": "ready" if getattr(request.app.state, "storage_ready", False) else "not_configured", "version": settings.app_version}}


@app.get("/api/health/db")
async def protected_health(request: Request, _: dict = Depends(current_identity)):
    pool = require_pool(request)
    if not await ping(pool):
        raise HTTPException(503, {"code": "DATABASE_UNAVAILABLE", "message": "Database health check failed."})
    return {"success": True, "data": {"database": "connected"}}
