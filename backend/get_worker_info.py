import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def get_worker_info():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    # Get worker info for the test job
    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'

    worker = await conn.fetchrow(
        '''SELECT w.id, w.full_name, w.primary_trade, u.phone, u.email, u.role
           FROM workers w
           JOIN users u ON u.id = w.user_id
           WHERE w.id = $1''',
        worker_id
    )

    if worker:
        print(f'Worker found:')
        print(f'  ID: {worker["id"]}')
        print(f'  Name: {worker["full_name"]}')
        print(f'  Trade: {worker["primary_trade"]}')
        print(f'  Phone: {worker["phone"]}')
        print(f'  Email: {worker["email"]}')
        print(f'  Role: {worker["role"]}')
    else:
        print('Worker not found')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(get_worker_info())
