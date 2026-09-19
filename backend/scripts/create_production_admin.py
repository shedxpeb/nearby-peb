"""Create admin account in production database.

This script reads DATABASE_URL from environment variables for security.
Usage:
    DATABASE_URL=postgresql://user:pass@host:5432/dbname python scripts/create_production_admin.py
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg
from app.config import get_settings, is_placeholder_database
from app.security import hash_password

ADMIN = {
    "phone": "1234567896",
    "email": "admin@shedx.demo",
    "password": "admin123"
}


async def main() -> None:
    settings = get_settings()
    if is_placeholder_database(settings.database_url):
        print("❌ ERROR: DATABASE_URL is not configured.")
        print("Set DATABASE_URL environment variable before running this script.")
        sys.exit(1)

    print(f"Connecting to database...")
    conn = await asyncpg.connect(settings.database_url)
    try:
        async with conn.transaction():
            # Check if admin already exists
            uid = await conn.fetchval("SELECT id FROM users WHERE phone=$1", ADMIN["phone"])
            if uid:
                print(f"✅ Admin already exists with phone: {ADMIN['phone']}")
                print(f"Login at: https://nearby-peb-admin.vercel.app/login")
                return

            # Create admin user
            uid = (await conn.fetchrow(
                "INSERT INTO users(phone,email,password_hash,role,is_active) VALUES($1,$2,$3,'ADMIN',TRUE) RETURNING id",
                ADMIN["phone"], ADMIN["email"], hash_password(ADMIN["password"])
            ))["id"]

            print("✅ Admin account created successfully!")
            print(f"Phone: {ADMIN['phone']}")
            print(f"Email: {ADMIN['email']}")
            print(f"Login at: https://nearby-peb-admin.vercel.app/login")
            print(f"\n⚠️  IMPORTANT: Change the admin password after first login!")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())