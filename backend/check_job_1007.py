import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_job_1007():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    job_id = '31d2b07c-8c9c-4cd5-930d-77746ed07008'

    # Check job assignments
    assignments = await conn.fetch(
        '''SELECT ja.id, ja.job_id, ja.worker_id, ja.assigned_at
           FROM job_assignments ja
           WHERE ja.job_id = $1''',
        job_id
    )

    print(f'Job {job_id} (SDX-J-1007) assignments:')
    if assignments:
        for assign in assignments:
            print(f'  Assignment ID: {assign["id"]}')
            print(f'  Worker ID: {assign["worker_id"]}')
            print(f'  Assigned at: {assign["assigned_at"]}')
    else:
        print('  No assignments found')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(check_job_1007())
