from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
import asyncpg
from fastapi import HTTPException, Request
from .config import is_placeholder_database


async def open_pool(database_url: str) -> asyncpg.Pool | None:
    if is_placeholder_database(database_url):
        return None
    return await asyncpg.create_pool(database_url, min_size=1, max_size=5, command_timeout=15)


async def close_pool(pool: asyncpg.Pool | None) -> None:
    if pool:
        await pool.close()


def require_pool(request: Request) -> asyncpg.Pool:
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail={"code": "DATABASE_NOT_CONFIGURED", "message": "DATABASE_URL is not configured."})
    return pool


@asynccontextmanager
async def transaction(pool: asyncpg.Pool) -> AsyncIterator[asyncpg.Connection]:
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn


async def ping(pool: asyncpg.Pool | None) -> bool:
    if pool is None:
        return False
    try:
        return await pool.fetchval("SELECT 1") == 1
    except Exception:
        return False


def row_to_dict(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    result = dict(row)
    for key, value in list(result.items()):
        if hasattr(value, "isoformat"):
            result[key] = value.isoformat()
        elif hasattr(value, "__float__") and value.__class__.__name__ == "Decimal":
            result[key] = float(value)
    return result