import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def get_customer_info():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    customer_id = 'ed89162a-686d-468a-9d3e-dc717146d337'

    customer = await conn.fetchrow(
        '''SELECT c.id, c.full_name, u.phone, u.email, u.role, u.password_hash
           FROM customers c
           JOIN users u ON u.id = c.user_id
           WHERE c.id = $1''',
        customer_id
    )

    if customer:
        print(f'Customer found:')
        print(f'  ID: {customer["id"]}')
        print(f'  Name: {customer["full_name"]}')
        print(f'  Phone: {customer["phone"]}')
        print(f'  Email: {customer["email"]}')
        print(f'  Role: {customer["role"]}')
        print(f'  Password hash: {customer["password_hash"][:20] if customer["password_hash"] else "None"}...')
    else:
        print('Customer not found')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(get_customer_info())
