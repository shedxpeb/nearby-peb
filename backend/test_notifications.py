import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def test_notifications():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'
    customer_id = 'ed89162a-686d-468a-9d3e-dc717146d337'

    # Check worker notifications
    print('=== Worker Notifications ===')
    worker_notifs = await conn.fetch(
        '''SELECT id, type, title, message, entity_type, entity_id, created_at
           FROM notifications
           WHERE worker_id = $1
           ORDER BY created_at DESC
           LIMIT 5''',
        worker_id
    )

    print(f'Worker notification count: {len(worker_notifs)}')
    for notif in worker_notifs:
        print(f'  Type: {notif["type"]}')
        print(f'  Title: {notif["title"]}')
        print(f'  Message: {notif["message"]}')
        print(f'  Entity: {notif["entity_type"]} - {notif["entity_id"]}')
        print()

    # Check customer notifications
    print('=== Customer Notifications ===')
    customer_notifs = await conn.fetch(
        '''SELECT id, type, title, message, entity_type, entity_id, created_at
           FROM notifications
           WHERE customer_id = $1
           ORDER BY created_at DESC
           LIMIT 5''',
        customer_id
    )

    print(f'Customer notification count: {len(customer_notifs)}')
    for notif in customer_notifs:
        print(f'  Type: {notif["type"]}')
        print(f'  Title: {notif["title"]}')
        print(f'  Message: {notif["message"]}')
        print(f'  Entity: {notif["entity_type"]} - {notif["entity_id"]}')
        print()

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(test_notifications())
