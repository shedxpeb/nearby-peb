import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_job_assignment():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    job_id = 'e521d7b4-b58f-4b2d-8d39-09d501d7d775'
    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'

    # Check job assignments
    assignments = await conn.fetch(
        '''SELECT ja.id, ja.job_id, ja.worker_id, ja.assigned_at
           FROM job_assignments ja
           WHERE ja.job_id = $1''',
        job_id
    )

    print(f'Job {job_id} assignments:')
    if assignments:
        for assign in assignments:
            print(f'  Assignment ID: {assign["id"]}')
            print(f'  Worker ID: {assign["worker_id"]}')
            print(f'  Assigned at: {assign["assigned_at"]}')
            print(f'  Matches test worker: {assign["worker_id"] == worker_id}')
    else:
        print('  No assignments found')

    # Check job status
    job = await conn.fetchrow(
        '''SELECT id, job_number, status, customer_id
           FROM jobs
           WHERE id = $1''',
        job_id
    )

    if job:
        print(f'\nJob status: {job["status"]}')
        print(f'Job number: {job["job_number"]}')
        print(f'Customer ID: {job["customer_id"]}')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(check_job_assignment())
