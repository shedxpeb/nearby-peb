"""Delete the test worker created via SQL to allow Admin UI creation test."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def delete_test_worker():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Delete the test worker created via SQL
        worker_name = 'Worker Data Verification'
        
        print(f"Deleting test worker: {worker_name}")
        
        async with conn.transaction():
            # Get worker ID
            worker = await conn.fetchrow(
                "SELECT id, user_id FROM workers WHERE full_name = $1 AND deleted_at IS NULL",
                worker_name
            )
            
            if not worker:
                print(f"Worker '{worker_name}' not found")
                return
            
            worker_id = worker['id']
            user_id = worker['user_id']
            
            # Delete junction table records
            await conn.execute("DELETE FROM worker_skills WHERE worker_id = $1", worker_id)
            await conn.execute("DELETE FROM worker_service_areas WHERE worker_id = $1", worker_id)
            await conn.execute("DELETE FROM worker_availability WHERE worker_id = $1", worker_id)
            
            # Delete worker profile
            await conn.execute("DELETE FROM workers WHERE id = $1", worker_id)
            
            # Delete user
            await conn.execute("DELETE FROM users WHERE id = $1", user_id)
            
            print(f"Deleted worker: {worker_name}")
            print(f"Worker ID: {worker_id}")
            print(f"User ID: {user_id}")
        
        print("\nTest worker deleted successfully.")
        print("You can now create a new worker through the Admin UI.")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(delete_test_worker())