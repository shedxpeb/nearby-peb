import asyncpg
import asyncio

async def fix_migration():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/shedx')
    await conn.execute("DELETE FROM schema_migrations WHERE filename='004_admin_portal.sql'")
    await conn.close()
    print("Migration record deleted")

asyncio.run(fix_migration())