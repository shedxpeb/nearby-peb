"""Fix the LALO worker emergency contact field swap issue."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_lalo_worker():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Get the LALO worker
        worker = await conn.fetchrow('''
            SELECT id, full_name, emergency_contact_name, emergency_contact_number
            FROM workers
            WHERE full_name = 'LALO' AND deleted_at IS NULL
        ''')
        
        if not worker:
            print("Worker LALO not found")
            return
        
        print(f"Found worker: {worker['full_name']}")
        print(f"  Current Emergency Contact Name: {worker['emergency_contact_name']}")
        print(f"  Current Emergency Contact Number: {worker['emergency_contact_number']}")
        
        # Check if emergency_contact_name looks like a phone number (all digits)
        if worker['emergency_contact_name'] and worker['emergency_contact_name'].isdigit():
            print("\nWARNING: emergency_contact_name contains only digits (appears to be a phone number)")
            print("WARNING: This indicates the fields were swapped during creation")

            # Swap the values
            new_name = worker['emergency_contact_number'] or "Unknown"
            new_number = worker['emergency_contact_name']

            print(f"\nFixing by swapping:")
            print(f"  New Emergency Contact Name: {new_name}")
            print(f"  New Emergency Contact Number: {new_number}")

            await conn.execute('''
                UPDATE workers
                SET emergency_contact_name = $1,
                    emergency_contact_number = $2
                WHERE id = $3
            ''', new_name, new_number, worker['id'])

            print("\nWorker data fixed successfully")
        else:
            print("\nEmergency contact fields appear correct (no swap detected)")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_lalo_worker())