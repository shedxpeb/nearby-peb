# ShedX Worker Portal backend

## Architecture

- FastAPI entrypoint: `backend/server.py` → `backend/app/main.py`
- PostgreSQL schema: `backend/migrations/001_worker_portal.sql`
- Development seed: `backend/migrations/002_seed.sql`
- Database access: `asyncpg` pool with transaction helpers in `backend/app/database.py`
- Auth: bearer JWTs, worker-only protected routes in `backend/app/security.py`
- Resource routers: auth, worker, jobs, work artifacts, earnings, notifications, support, maps
- Frontend access: `frontend/src/services/api.ts` and typed domain service modules

## Environment

Copy `backend/.env.example` to `backend/.env`. `DATABASE_URL` is intentionally blank in this workspace until a Supabase pooled URL is supplied. Never place `DATABASE_URL`, JWT secrets, or direct database credentials in frontend variables.

`EXPO_PUBLIC_MAPTILER_API_KEY` is public by design and should be a restricted MapTiler key. The backend `MAPTILER_API_KEY` is used for geocoding proxy calls. Both values are optional at startup; maps show a clear configuration state when missing.

## Database setup

Run the migrations in order against PostgreSQL/Supabase:

```bash
psql "$DATABASE_URL" -f backend/migrations/001_worker_portal.sql
psql "$DATABASE_URL" -f backend/migrations/002_seed.sql
```

The schema uses UUID keys, foreign keys, indexes, status constraints, timestamps, soft deletion for identity records, and update triggers. Job transition endpoints use transactions and write `job_status_history` records.

## Start commands

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001

cd frontend
yarn start
```

With no database URL, `/api/health` remains available and reports `database: not_configured`; protected data APIs intentionally return `503 DATABASE_NOT_CONFIGURED` rather than silently writing fake data.

## API overview

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Worker: `/api/worker/profile`, `/api/worker/status`, `/api/worker/skills`, `/api/worker/service-areas`, `/api/worker/availability`
- Jobs: `/api/jobs/requests`, `/api/jobs/{id}`, accept/decline/en-route/arrived/start/pause/resume/complete
- Work: tasks, checklist, progress, materials, expenses, photos, customer confirmation under `/api/jobs/{id}`
- Finance: `/api/earnings`, `/api/earnings/summary`, `/api/payouts`
- Notifications: `/api/notifications`
- Support: `/api/support/tickets`
- Maps: `/api/maps/health`, `/api/maps/geocode`, `/api/maps/reverse`

All successful responses use `{ "success": true, "data": ... }`; failures use FastAPI HTTP status codes with structured `code` and `message` details.

## MapTiler and photo storage

MapTiler static tiles/geocoding are accessed through environment-backed services and always show attribution. Photo endpoints store URLs only; the upload/storage seam is ready for Supabase Storage, S3, or Cloudinary without storing binary data in PostgreSQL.