# ShedX Nearby - Standalone Setup Guide

This project has been converted to a fully standalone application with no dependencies on Emergent services.

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+
- Yarn

## Local Setup

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE shedx;
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Edit .env with your configuration
# Notable variables:
# - DATABASE_URL: PostgreSQL connection string
# - JWT_SECRET: Generate a secure random secret
# - SESSION_SECRET: Generate a secure random secret
# - MAPTILER_API_KEY: Your MapTiler API key
```

Generate secure secrets:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file from example
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Edit .env with your configuration
# EXPO_PUBLIC_BACKEND_URL: http://localhost:8001
# EXPO_PUBLIC_MAPTILER_API_KEY: Your MapTiler API key
```

### 4. Start Services

**Start PostgreSQL:** Ensure your PostgreSQL server is running.

**Start Backend:**
```bash
cd backend
.venv\Scripts\activate  # Windows
python server.py
```

The backend will:
- Connect to PostgreSQL
- Run migrations automatically
- Create storage directories
- Start on http://localhost:8001

**Start Frontend:**
```bash
cd frontend
yarn start
```

### 5. Seed Demo Data (Optional)

```bash
cd backend
python scripts/seed_demo.py
```

This creates:
- Worker: 9876543210 / demo123
- Customer: 9825044321 / demo123

## Project Structure

```
nearby-peb/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   └── storage.py    # Local file storage
│   ├── migrations/            # PostgreSQL migrations
│   ├── storage/              # Local file storage directory
│   ├── .env.example          # Environment template
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── app/
│   ├── src/
│   ├── .env.example          # Environment template
│   └── package.json
└── .gitignore               # Updated for standalone setup
```

## Storage Configuration

The application now uses local filesystem storage:

- **Storage Provider:** local
- **Storage Root:** ./storage (relative to backend)
- **Public URL:** http://localhost:8001/uploads
- **Database Tracking:** storage_objects table

Files are stored at: `storage/shedx-worker-portal/uploads/{user_id}/{uuid}.{ext}`

## Environment Variables

### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `SESSION_SECRET`: Session signing secret
- `MAPTILER_API_KEY`: MapTiler API key
- `STORAGE_PROVIDER`: Storage provider (local)
- `STORAGE_ROOT`: Local storage directory
- `STORAGE_PUBLIC_URL`: Public URL for uploads
- `ALLOWED_ORIGINS`: CORS origins

### Frontend (.env)
- `EXPO_PUBLIC_BACKEND_URL`: Backend API URL
- `EXPO_PUBLIC_MAPTILER_API_KEY`: MapTiler API key

## Security Notes

⚠️ **IMPORTANT:** 
- Generate new JWT_SECRET and SESSION_SECRET for production
- Rotate any previously exposed API keys
- Never commit .env files
- Use strong PostgreSQL passwords in production

## Migration from Emergent

The following Emergent dependencies have been removed:
- ❌ Emergent Object Storage → ✅ Local filesystem storage
- ❌ EMERGENT_LLM_KEY → ✅ Not required
- ❌ Emergent internal packages → ✅ Standard PyPI packages
- ❌ Emergent preview URLs → ✅ localhost configuration
- ❌ Emergent bundle identifiers → ✅ com.shedx.nearbypeb

## Testing

Run backend tests:
```bash
cd backend
pytest
```

Run frontend tests:
```bash
cd frontend
yarn test
```

## Production Deployment

For production deployment:
1. Set strong secrets
2. Use production PostgreSQL
3. Configure proper CORS origins
4. Use cloud storage (S3, etc.) if needed
5. Set up proper file serving for uploads
6. Enable HTTPS
7. Configure proper logging

## Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check storage directory permissions

**Frontend can't connect to backend:**
- Verify EXPO_PUBLIC_BACKEND_URL
- Check CORS configuration
- Ensure backend is running

**Storage issues:**
- Check STORAGE_ROOT directory exists
- Verify file permissions
- Check STORAGE_PUBLIC_URL configuration

## Support

For issues or questions, refer to:
- README_BACKEND.md for backend architecture
- frontend/README.md for frontend setup
- Individual module documentation