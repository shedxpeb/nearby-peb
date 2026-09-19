"""Seed skills data for PEB services.

Usage:
    cd backend && python scripts/seed_skills.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg
from app.config import get_settings, is_placeholder_database

PEB_SKILLS = [
    ("Roof Panel Repair", "Structural"),
    ("Wall Cladding Repair", "Structural"),
    ("Structure Repair", "Structural"),
    ("Gutter & Downpipe Repair", "Waterproofing"),
    ("General Maintenance", "General"),
    ("Inspection & Assessment", "Inspection"),
    ("Rafter Repair", "Structural"),
    ("Purlin Replacement", "Structural"),
    ("Skylight Repair", "Structural"),
    ("Door & Shutter Repair", "Access"),
    ("Foundation Repair", "Structural"),
    ("Electrical Work", "Services"),
    ("Plumbing Work", "Services"),
    ("Fire Safety Inspection", "Safety"),
    ("Load Testing", "Inspection"),
    ("Rust Treatment", "Maintenance"),
    ("Painting & Coating", "Finishing"),
    ("Leak Detection", "Waterproofing"),
    ("Fastener Replacement", "Structural"),
    ("Beam Repair", "Structural"),
    ("Column Repair", "Structural"),
]


async def main() -> None:
    settings = get_settings()
    if is_placeholder_database(settings.database_url):
        print("DATABASE_URL is not configured. Set it in backend/.env first.")
        sys.exit(1)

    conn = await asyncpg.connect(settings.database_url)
    try:
        async with conn.transaction():
            # Check if skills already exist
            existing = await conn.fetchval("SELECT COUNT(*) FROM skills")
            if existing > 0:
                print(f"Skills already exist ({existing} records). Skipping seed.")
                return

            # Insert PEB skills
            for name, category in PEB_SKILLS:
                await conn.execute(
                    "INSERT INTO skills(name, category, is_active) VALUES($1, $2, TRUE)",
                    name, category
                )

            print(f"Successfully seeded {len(PEB_SKILLS)} PEB skills.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())