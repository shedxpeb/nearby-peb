import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_one_conversation():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    job_id = '31d2b07c-8c9c-4cd5-930d-77746ed07008'

    # Count conversations for the job
    count = await conn.fetchval(
        'SELECT COUNT(*) FROM job_conversations WHERE job_id = $1',
        job_id
    )

    print(f'Conversations for job {job_id}: {count}')

    if count == 1:
        print('PASS: Exactly one conversation exists')
    else:
        print(f'FAIL: Expected 1 conversation, found {count}')

    # Get the conversation details
    conv = await conn.fetchrow(
        'SELECT * FROM job_conversations WHERE job_id = $1',
        job_id
    )

    if conv:
        print(f'Conversation ID: {conv["id"]}')
        print(f'Job ID: {conv["job_id"]}')
        print(f'Customer ID: {conv["customer_id"]}')
        print(f'Worker ID: {conv["worker_id"]}')

    # Count messages
    msg_count = await conn.fetchval(
        'SELECT COUNT(*) FROM job_messages WHERE conversation_id = $1',
        conv['id'] if conv else '00000000-0000-0000-0000-000000000000'
    )

    print(f'Messages in conversation: {msg_count}')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(verify_one_conversation())
