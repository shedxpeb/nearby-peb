import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def set_customer_password():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    customer_id = 'ed89162a-686d-468a-9d3e-dc717146d337'
    new_password = "customer123"
    password_hash = hash_password(new_password)

    await conn.execute(
        '''UPDATE users SET password_hash = $1 WHERE id = (SELECT user_id FROM customers WHERE id = $2)''',
        password_hash, customer_id
    )

    print(f'Password updated for customer {customer_id}')
    print(f'New password: {new_password}')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(set_customer_password())
