import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def create_job_assignment():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    job_id = '31d2b07c-8c9c-4cd5-930d-77746ed07008'  # SDX-J-1007
    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'

    # Create job assignment
    assignment_id = await conn.fetchval(
        '''INSERT INTO job_assignments (job_id, worker_id, assigned_at)
           VALUES ($1, $2, NOW())
           RETURNING id''',
        job_id, worker_id
    )

    print(f'Job assignment created:')
    print(f'  Assignment ID: {assignment_id}')
    print(f'  Job ID: {job_id}')
    print(f'  Worker ID: {worker_id}')

    # Update job status to ASSIGNED
    await conn.execute(
        '''UPDATE jobs SET status = 'ASSIGNED' WHERE id = $1''',
        job_id
    )

    print(f'Job status updated to ASSIGNED')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(create_job_assignment())
