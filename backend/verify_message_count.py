import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_message_count():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    print('PostgreSQL connected')

    conversation_id = 'ad0739b0-15dc-4619-9556-991be4bdfc88'

    # Count messages
    count = await conn.fetchval(
        'SELECT COUNT(*) FROM job_messages WHERE conversation_id = $1',
        conversation_id
    )

    print(f'Messages in conversation: {count}')

    # Check for duplicate message texts
    duplicates = await conn.fetch(
        '''SELECT message_text, COUNT(*) as cnt
           FROM job_messages
           WHERE conversation_id = $1
           GROUP BY message_text
           HAVING COUNT(*) > 1''',
        conversation_id
    )

    if duplicates:
        print(f'Duplicate message texts found: {len(duplicates)}')
        for dup in duplicates:
            print(f'  "{dup["message_text"]}" appears {dup["cnt"]} times')
    else:
        print('No duplicate message texts')

    await conn.close()
    print('Database connection closed')

if __name__ == '__main__':
    asyncio.run(verify_message_count())
