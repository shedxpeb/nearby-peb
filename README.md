# Nearby-PEB

A service marketplace application connecting customers with skilled workers for PEB (Pre-Engineered Building) maintenance and repair services.

## Architecture

- **Backend:** FastAPI + PostgreSQL
- **Admin Frontend:** React + Vite
- **Mobile Frontend:** React Native/Expo

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+

### Local Development

```bash
# Database
CREATE DATABASE shedx;

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
copy .env.example .env  # Windows
# Edit .env with your configuration
python -m uvicorn app.main:app --reload

# Admin Frontend
cd admin-frontend
npm install
npm run dev

# Mobile Frontend
cd frontend
npm install
npx expo start
```

### Seed Demo Data

```bash
cd backend
python scripts/seed_demo.py
# Worker: 9876543210 / demo123
# Customer: 9825044321 / demo123
```

## Environment Variables

### Backend (.env)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (generate with `secrets.token_urlsafe(48)`) |
| `SESSION_SECRET` | Session signing secret |
| `API_BASE_URL` | Backend API URL |
| `APP_BASE_URL` | Frontend URL |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `STORAGE_PUBLIC_URL` | Public URL for uploads |
| `STORAGE_PROVIDER` | Storage provider (default: local) |
| `STORAGE_ROOT` | Local storage directory (default: ./storage) |

### Admin Frontend (.env)

- `VITE_API_BASE_URL` - Backend API URL

### Mobile Frontend (.env)

- `EXPO_PUBLIC_BACKEND_URL` - Backend API URL
- `EXPO_PUBLIC_MAPTILER_API_KEY` - MapTiler API key

## Backend Architecture

```
app/
├── main.py            # App assembly, lifespan: DB pool + migrations
├── config.py          # pydantic-settings, reads backend/.env
├── database.py        # asyncpg pool, transactions
├── security.py        # bcrypt hashing, JWT issue/verify
├── schemas.py         # Request payloads
├── repositories.py    # Worker/Job read helpers
├── routers/
│   ├── auth.py        # register, login, logout, me
│   ├── workers.py     # worker profile, status, skills
│   ├── customers.py   # customer profile, sites, jobs
│   ├── jobs.py        # job lifecycle, matching, transitions
│   ├── artifacts.py   # tasks, checklist, work photos
│   ├── earnings.py    # worker earnings
│   ├── notifications.py # notifications, unread count
│   ├── support.py     # support tickets, messages
│   ├── maps.py        # MapTiler geocode proxy
│   └── storage.py     # Local file storage
├── migrations/        # SQL migrations
└── scripts/seed_demo.py  # Demo data
```

## Database & Migrations

Migrations in `migrations/*.sql` run automatically on backend startup, tracked in `schema_migrations` table.

To run migrations explicitly:
```bash
cd backend
python run_migrations.py
```

## Storage

- **Provider:** Local filesystem
- **Root:** `./storage` (relative to backend)
- **Public URL:** Configured via `STORAGE_PUBLIC_URL`
- **Database Tracking:** `storage_objects` table

## Testing

```bash
# Backend tests
cd backend
pytest

# Admin build
cd admin-frontend
npm run build
```

## Production Deployment

### Environment Variables

Generate secure secrets:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Backend

- Set production `DATABASE_URL`
- Set strong `JWT_SECRET` and `SESSION_SECRET`
- Configure production `ALLOWED_ORIGINS`
- Run migrations before starting

### Frontends

- Admin: Set `VITE_API_BASE_URL` (build-time variable)
- Mobile: Set `EXPO_PUBLIC_BACKEND_URL` (build-time variable)

## Security Notes

- Generate new JWT_SECRET and SESSION_SECRET for production
- Never commit .env files
- Use strong PostgreSQL passwords
- Configure proper CORS origins
- Enable HTTPS in production

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check storage directory permissions

**Frontend can't connect:**
- Verify API base URL environment variable
- Check CORS configuration
- Ensure backend is running
