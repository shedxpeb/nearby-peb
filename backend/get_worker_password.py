import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def get_worker_password():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    # Get worker info for the test job
    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'

    worker = await conn.fetchrow(
        '''SELECT w.id, w.full_name, u.phone, u.password_hash
           FROM workers w
           JOIN users u ON u.id = w.user_id
           WHERE w.id = $1''',
        worker_id
    )

    if worker:
        print(f'Worker found:')
        print(f'  ID: {worker["id"]}')
        print(f'  Name: {worker["full_name"]}')
        print(f'  Phone: {worker["phone"]}')
        print(f'  Password hash: {worker["password_hash"][:20]}...')
    else:
        print('Worker not found')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(get_worker_password())
