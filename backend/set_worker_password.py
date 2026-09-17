import asyncio
import asyncpg
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def set_worker_password():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    # Set password for the test worker
    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'
    new_password = "worker123"
    password_hash = hash_password(new_password)

    await conn.execute(
        '''UPDATE users SET password_hash = $1 WHERE id = (SELECT user_id FROM workers WHERE id = $2)''',
        password_hash, worker_id
    )

    print(f'Password updated for worker {worker_id}')
    print(f'New password: {new_password}')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(set_worker_password())
