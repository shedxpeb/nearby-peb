import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def find_jobs():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    # Find jobs
    jobs = await conn.fetch(
        '''SELECT id, job_number, status, customer_id
           FROM jobs
           ORDER BY created_at DESC
           LIMIT 5'''
    )

    print(f'Recent jobs:')
    for job in jobs:
        print(f'  Job ID: {job["id"]}')
        print(f'  Job number: {job["job_number"]}')
        print(f'  Status: {job["status"]}')
        print(f'  Customer ID: {job["customer_id"]}')
        print()

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(find_jobs())
