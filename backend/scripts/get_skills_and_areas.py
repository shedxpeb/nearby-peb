"""Get available skills and service areas for the admin form selectors."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def get_skills_and_areas():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Get all active skills
        skills = await conn.fetch('''
            SELECT id, name, category
            FROM skills
            WHERE is_active = TRUE
            ORDER BY name
        ''')
        
        print("=== Available Skills ===")
        for skill in skills:
            print(f"  {skill['name']} (Category: {skill['category'] or 'N/A'})")
        
        # Get all service areas
        areas = await conn.fetch('''
            SELECT id, name, city, state
            FROM service_areas
            ORDER BY name
        ''')
        
        print("\n=== Available Service Areas ===")
        for area in areas:
            print(f"  {area['name']} ({area['city']}, {area['state']})")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(get_skills_and_areas())