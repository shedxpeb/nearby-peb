# ShedX Worker + Customer Portal — Backend

FastAPI + PostgreSQL (asyncpg) backend serving both portals. The Worker Portal lives at `/`, the Customer Portal at `/customer`.

## Architecture

```
app/
├── main.py            # App assembly, lifespan: DB pool + migrations + static file serving
├── config.py          # pydantic-settings, reads backend/.env
├── database.py        # asyncpg pool, transactions, row serialization
├── security.py        # bcrypt hashing, JWT issue/verify, current_identity (WORKER + CUSTOMER)
├── schemas.py         # Request payloads
├── repositories.py    # Worker/Job read helpers
├── routers/
│   ├── auth.py        # register (role WORKER|CUSTOMER), login, logout, me, forgot-password
│   ├── workers.py     # worker profile, status, skills, service areas, availability
│   ├── customers.py   # customer profile, service sites CRUD, customer job list (tabs + pagination)
│   ├── jobs.py        # job lifecycle: create (customer) + matching, transitions, progress,
│   │                  #   materials, expenses, customer confirmation, cancel, status poll
│   ├── artifacts.py   # tasks, checklist, work photos (role-aware reads)
│   ├── earnings.py    # worker earnings
│   ├── notifications.py # role-aware notifications + unread-count
│   ├── support.py     # role-aware support tickets + messages
│   ├── maps.py        # MapTiler geocode / reverse geocode proxy
│   └── storage.py     # Local file storage: POST /api/storage/upload, GET /api/storage/files/{path}
├── migrations/        # SQL files applied automatically at startup (schema_migrations ledger)
└── scripts/seed_demo.py  # Idempotent demo worker + customer + sites + open jobs
```

## Environment variables (backend/.env)

| Key | Purpose |
|---|---|
| `DATABASE_URL` | **Only required PostgreSQL connection source** (pooled URL works, e.g. Supabase transaction pooler). Empty = API returns 503 `DATABASE_NOT_CONFIGURED`. Preview currently uses local PostgreSQL 15; replace with your own URL. |
| `DIRECT_URL` | Optional direct (non-pooled) connection for future tooling. |
| `JWT_SECRET` | HS256 signing secret for 7-day tokens. |
| `SESSION_SECRET` | Session signing secret. |
| `MAPTILER_API_KEY` | Server-side geocoding proxy key. |
| `STORAGE_PROVIDER` | Storage provider (local, s3, etc.). Default: local. |
| `STORAGE_ROOT` | Local storage directory path. Default: ./storage. |
| `STORAGE_PUBLIC_URL` | Public URL for serving uploaded files. Default: http://localhost:8001/uploads. |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated). Default: http://localhost:8081. |

Frontend (`frontend/.env`, see `frontend/.env.example`): `EXPO_PUBLIC_BACKEND_URL` (API base), `EXPO_PUBLIC_MAPTILER_API_KEY` (static map images). Never put secrets in `EXPO_PUBLIC_*`.

## Database & migrations

Migrations in `migrations/*.sql` run automatically on backend startup, tracked in `schema_migrations` (001 worker portal, 002 seed reference data, 003 customer portal). To use your own PostgreSQL: set `DATABASE_URL` in `backend/.env`, restart the backend — schema is created automatically. Then seed demo data:

```bash
cd /app/backend && python scripts/seed_demo.py
# Worker:   9876543210 / demo123   (Vikas Patel, ONLINE, Ahmedabad region)
# Customer: 9825044321 / demo123   (Rakesh Patel, ABC Manufacturing, Sanand site)
```

## Shared job lifecycle (single `jobs` record for both portals)

`POST /api/jobs` (customer) → `REQUESTED` + worker matching (ONLINE workers, skill match, service-area radius via haversine) → `job_requests` rows → worker `accept` → `ACCEPTED` (+`job_assignments`, other offers `EXPIRED`, worker `BUSY`) → `EN_ROUTE` → `ARRIVED` → `IN_PROGRESS` → worker `complete` → **`WAITING_CUSTOMER`** (customer-owned jobs only; customer-less jobs complete directly) → customer confirmation (rating saved, worker aggregates updated) → `COMPLETED`. Every transition writes `job_status_history` and role-appropriate notifications. Customers can `cancel` only while `REQUESTED`/`OFFERED`.

Ownership is enforced in SQL on every endpoint: customers see only their own jobs/sites/tickets/notifications; workers only jobs they were offered or assigned. Invalid transitions return 409; duplicate accepts return 409.

## Photo storage

Uploads go through `POST /api/storage/upload` (multipart, ≤ 8 MB, images only) into local storage at `shedx-worker-portal/uploads/{user_id}/{uuid}`. Reads go through `GET /api/storage/files/{path}` with `Authorization` header or `?token=` query (needed for `<img>` on web). `storage_objects` table is the existence/ownership registry — the storage service is never probed to verify existence. Files are served via `/uploads` static route.
