from typing import Any
from uuid import UUID
import asyncpg
from .database import row_to_dict


class WorkerRepository:
    @staticmethod
    async def by_user(conn: asyncpg.Connection, user_id: str) -> dict[str, Any] | None:
        row = await conn.fetchrow("""
            SELECT w.*, u.phone, u.email,
                   (SELECT COUNT(*) FROM job_assignments WHERE worker_id=w.id AND completed_at IS NOT NULL) AS completed_jobs_count,
                   (SELECT COUNT(*) FROM job_assignments WHERE worker_id=w.id AND completed_at IS NULL) AS active_assignments_count
            FROM workers w 
            JOIN users u ON u.id=w.user_id 
            WHERE w.user_id=$1 AND w.deleted_at IS NULL
        """, UUID(user_id))
        return row_to_dict(row)

    @staticmethod
    async def by_id(conn: asyncpg.Connection, worker_id: str) -> dict[str, Any] | None:
        return row_to_dict(await conn.fetchrow("SELECT * FROM workers WHERE id=$1 AND deleted_at IS NULL", UUID(worker_id)))


class JobRepository:
    @staticmethod
    async def requests(conn: asyncpg.Connection, worker_id: str) -> list[dict[str, Any]]:
        rows = await conn.fetch("""SELECT j.*, jr.id AS request_id, jr.distance_km, jr.status AS request_status
          FROM job_requests jr JOIN jobs j ON j.id=jr.job_id WHERE jr.worker_id=$1 AND jr.status IN ('PENDING','VIEWED') ORDER BY j.scheduled_at NULLS LAST""", UUID(worker_id))
        return [row_to_dict(row) for row in rows]

    @staticmethod
    async def get_for_worker(conn: asyncpg.Connection, worker_id: str, job_id: str) -> dict[str, Any] | None:
        row = await conn.fetchrow("""SELECT j.* FROM jobs j LEFT JOIN job_assignments a ON a.job_id=j.id
          LEFT JOIN job_requests r ON r.job_id=j.id WHERE j.id=$1 AND (a.worker_id=$2 OR r.worker_id=$2)""", UUID(job_id), UUID(worker_id))
        return row_to_dict(row)