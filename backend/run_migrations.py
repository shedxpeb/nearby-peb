#!/usr/bin/env python3
"""
Production migration script for ShedX Nearby.

This script should be run ONCE before starting the application in production.
It runs all pending database migrations and exits.

DO NOT run this script from multiple processes simultaneously.
"""
import asyncio
import sys
from pathlib import Path
import asyncpg
from app.config import get_settings

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


async def run_migrations():
    """Run all pending database migrations."""
    settings = get_settings()
    
    if not settings.database_url:
        print("ERROR: DATABASE_URL environment variable is not set")
        sys.exit(1)
    
    print(f"Connecting to database...")
    conn = await asyncpg.connect(settings.database_url)
    
    try:
        print("Creating schema_migrations table if not exists...")
        await conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations(filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())")
        
        print("Checking for pending migrations...")
        applied = {row["filename"] for row in await conn.fetch("SELECT filename FROM schema_migrations")}
        
        pending = []
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name not in applied:
                pending.append(path)
        
        if not pending:
            print("No pending migrations to apply.")
            return
        
        print(f"Found {len(pending)} pending migration(s):")
        for path in pending:
            print(f"  - {path.name}")
        
        print("\nApplying migrations...")
        for path in pending:
            print(f"  Applying {path.name}...")
            sql = path.read_text()
            
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute("INSERT INTO schema_migrations(filename) VALUES($1)", path.name)
            
            print(f"  ✓ {path.name} applied successfully")
        
        print(f"\n✓ All {len(pending)} migration(s) applied successfully.")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(run_migrations())
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
