"""Inspect actual worker data in the database to diagnose data inconsistencies."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def inspect_worker_data():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Get all workers with their details
        workers = await conn.fetch('''
            SELECT w.id, w.full_name, w.primary_trade, w.years_experience,
                   w.emergency_contact_name, w.emergency_contact_number,
                   w.professional_bio, w.languages, w.preferred_work_type,
                   w.previous_company,
                   u.phone, u.email, w.rating_avg, w.rating_count, w.completed_jobs_count,
                   w.status, w.availability_status, w.created_at
            FROM workers w
            JOIN users u ON u.id = w.user_id
            WHERE w.deleted_at IS NULL
            ORDER BY w.created_at DESC
        ''')
        
        print(f"\n=== Total workers: {len(workers)} ===\n")
        
        for worker in workers:
            print(f"Worker ID: {worker['id']}")
            print(f"  Name: {worker['full_name']}")
            print(f"  Phone: {worker['phone']}")
            print(f"  Email: {worker['email']}")
            print(f"  Primary Trade: {worker['primary_trade']}")
            print(f"  Years Experience: {worker['years_experience']}")
            print(f"  Previous Company: {worker['previous_company']}")
            print(f"  Professional Bio: {worker['professional_bio']}")
            print(f"  Emergency Contact Name: {worker['emergency_contact_name']}")
            print(f"  Emergency Contact Number: {worker['emergency_contact_number']}")
            print(f"  Preferred Work Type: {worker['preferred_work_type']}")
            print(f"  Languages: {worker['languages']}")
            print(f"  Rating: {worker['rating_avg']} ({worker['rating_count']} ratings)")
            print(f"  Completed Jobs: {worker['completed_jobs_count']}")
            print(f"  Status: {worker['status']}")
            print(f"  Availability: {worker['availability_status']}")
            print(f"  Created At: {worker['created_at']}")
            
            # Get skills
            skills = await conn.fetch('''
                SELECT s.name, s.category
                FROM worker_skills ws
                JOIN skills s ON s.id = ws.skill_id
                WHERE ws.worker_id = $1
            ''', worker['id'])
            print(f"  Skills: {[s['name'] for s in skills] if skills else 'None'}")
            
            # Get service areas
            areas = await conn.fetch('''
                SELECT sa.name, sa.city, sa.state
                FROM worker_service_areas wsa
                JOIN service_areas sa ON sa.id = wsa.service_area_id
                WHERE wsa.worker_id = $1
            ''', worker['id'])
            print(f"  Service Areas: {[a['name'] for a in areas] if areas else 'None'}")
            
            # Get current assignments
            assignments = await conn.fetch('''
                SELECT COUNT(*) as count
                FROM job_assignments
                WHERE worker_id = $1 AND completed_at IS NULL
            ''', worker['id'])
            print(f"  Current Assignments: {assignments[0]['count']}")
            print()
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(inspect_worker_data())