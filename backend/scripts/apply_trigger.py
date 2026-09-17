"""Apply the completed_jobs_count trigger to the database."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def apply_trigger():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Read the migration file
        with open('migrations/006_worker_completed_jobs_trigger.sql', 'r') as f:
            sql = f.read()
        
        print("Applying completed_jobs_count trigger...")
        await conn.execute(sql)
        print("Trigger applied successfully!")
        
        # Verify the trigger is working
        print("\nVerifying trigger...")
        result = await conn.fetchval('''
            SELECT COUNT(*) 
            FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_completed_jobs'
        ''')
        
        if result > 0:
            print("Trigger verified: trigger_update_completed_jobs exists")
        else:
            print("WARNING: Trigger not found after creation")
        
        # Check updated completed_jobs_count values
        print("\nCurrent completed_jobs_count values:")
        workers = await conn.fetch('''
            SELECT w.id, w.full_name, w.completed_jobs_count,
                   (SELECT COUNT(*) FROM job_assignments ja WHERE ja.worker_id = w.id AND ja.completed_at IS NOT NULL) as actual_count
            FROM workers w
            WHERE w.deleted_at IS NULL
        ''')
        
        for w in workers:
            match = "MATCH" if w['completed_jobs_count'] == w['actual_count'] else "MISMATCH"
            print(f"  {w['full_name']}: DB={w['completed_jobs_count']}, Actual={w['actual_count']} [{match}]")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_trigger())