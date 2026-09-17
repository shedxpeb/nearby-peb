import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def test_worker_chat():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    # Get the test job info
    job_id = 'e521d7b4-b58f-4b2d-8d39-09d501d7d775'
    worker_id = 'd0ac1c58-2f2c-4dd0-944f-abf75f46675c'

    # Check if conversation exists
    conv = await conn.fetchrow(
        'SELECT id, job_id, customer_id, worker_id FROM job_conversations WHERE job_id = $1',
        job_id
    )
    if conv:
        print(f'Conversation exists: {conv["id"]}')
    else:
        print('No conversation found for test job')

    # Check if messages exist
    msgs = await conn.fetch(
        'SELECT id, sender_user_id, sender_role, message_text, created_at FROM job_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        conv['id'] if conv else '00000000-0000-0000-0000-000000000000'
    )
    print(f'Messages count: {len(msgs)}')
    for msg in msgs:
        print(f'  - {msg["sender_role"]}: {msg["message_text"][:50]}...')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(test_worker_chat())
