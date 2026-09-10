"""Seed demo worker + customer accounts for local development. Idempotent.

Usage:
    cd /app/backend && python scripts/seed_demo.py

Requires DATABASE_URL in .env. Run the backend once first so migrations apply
(or start the backend after seeding — migrations run on startup either way).
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg  # noqa: E402
from app.config import get_settings, is_placeholder_database  # noqa: E402
from app.security import hash_password  # noqa: E402

WORKER = {"phone": "9876543210", "password": "demo123", "name": "Vikas Patel", "email": "vikas.patel@shedx.demo"}
CUSTOMER = {"phone": "9825044321", "password": "demo123", "name": "Rakesh Patel", "email": "rakesh@abcmanufacturing.demo"}
WORKER_SKILLS = ["Roof Panel Repair", "Wall Cladding Repair", "Structure Repair", "Gutter & Downpipe Repair", "General Maintenance"]
WORKER_AREAS = ["Ahmedabad", "Gandhinagar", "Sanand"]


async def main() -> None:
    settings = get_settings()
    if is_placeholder_database(settings.database_url):
        print("DATABASE_URL is not configured. Set it in backend/.env first.")
        sys.exit(1)
    conn = await asyncpg.connect(settings.database_url)
    try:
        async with conn.transaction():
            # --- Demo worker -------------------------------------------------
            uid = await conn.fetchval("SELECT id FROM users WHERE phone=$1", WORKER["phone"])
            if not uid:
                uid = (await conn.fetchrow("INSERT INTO users(phone,email,password_hash,role) VALUES($1,$2,$3,'WORKER') RETURNING id", WORKER["phone"], WORKER["email"], hash_password(WORKER["password"])))["id"]
            wid = await conn.fetchval("SELECT id FROM workers WHERE user_id=$1", uid)
            if not wid:
                wid = (await conn.fetchrow(
                    """INSERT INTO workers(user_id,full_name,primary_trade,years_experience,professional_bio,emergency_contact_name,
                       emergency_contact_number,preferred_work_type,languages,rating_avg,rating_count,completed_jobs_count,status,availability_status)
                       VALUES($1,'Vikas Patel','PEB Service Professional',8,
                       'PEB repair and maintenance specialist for industrial sheds and warehouses.','Kiran Patel','+91 98250 11223',
                       'Repair & maintenance','Gujarati, Hindi, English',4.8,126,126,'ACTIVE','ONLINE') RETURNING id""", uid))["id"]
            for skill in WORKER_SKILLS:
                skill_id = await conn.fetchval("SELECT id FROM skills WHERE name=$1", skill)
                if skill_id:
                    await conn.execute("INSERT INTO worker_skills(worker_id,skill_id) VALUES($1,$2) ON CONFLICT DO NOTHING", wid, skill_id)
            for area in WORKER_AREAS:
                area_id = await conn.fetchval("SELECT id FROM service_areas WHERE name=$1", area)
                if area_id:
                    await conn.execute("INSERT INTO worker_service_areas(worker_id,service_area_id,radius_km) VALUES($1,$2,25) ON CONFLICT DO NOTHING", wid, area_id)
            for day in range(6):
                await conn.execute("INSERT INTO worker_availability(worker_id,day_of_week,start_time,end_time,is_available) VALUES($1,$2,'09:00','18:00',TRUE) ON CONFLICT DO NOTHING", wid, day)

            # --- Demo customer -----------------------------------------------
            cuid = await conn.fetchval("SELECT id FROM users WHERE phone=$1", CUSTOMER["phone"])
            if not cuid:
                cuid = (await conn.fetchrow("INSERT INTO users(phone,email,password_hash,role) VALUES($1,$2,$3,'CUSTOMER') RETURNING id", CUSTOMER["phone"], CUSTOMER["email"], hash_password(CUSTOMER["password"])))["id"]
            cid = await conn.fetchval("SELECT id FROM customers WHERE user_id=$1", cuid)
            if not cid:
                cid = (await conn.fetchrow(
                    "INSERT INTO customers(user_id,full_name,company_name,contact_person,preferred_communication) VALUES($1,'Rakesh Patel','ABC Manufacturing','Rakesh Patel','CALL') RETURNING id", cuid))["id"]
            site_id = await conn.fetchval("SELECT id FROM customer_sites WHERE customer_id=$1 AND site_name='ABC Manufacturing Plant'", cid)
            if not site_id:
                site_id = (await conn.fetchrow(
                    """INSERT INTO customer_sites(customer_id,site_name,address_line,city,state,postal_code,latitude,longitude,contact_name,contact_phone,notes)
                       VALUES($1,'ABC Manufacturing Plant','Plot 21, GIDC Industrial Estate','Sanand','Gujarat','382110',22.9924,72.3814,'Rakesh Patel','9825044321','Main PEB shed, use gate 2') RETURNING id""", cid))["id"]

            # --- Demo open requests matched to the worker ---------------------
            if not await conn.fetchval("SELECT 1 FROM jobs WHERE customer_id=$1", cid):
                roof_skill = await conn.fetchval("SELECT id FROM skills WHERE name='Roof Panel Repair'")
                gutter_skill = await conn.fetchval("SELECT id FROM skills WHERE name='Gutter & Downpipe Repair'")
                demo_jobs = [
                    ("SDX-J-1001", "Roof panel replacement — north bay", "Roof Panel Repair",
                     "Replace two damaged roof panels and reseal the north-facing joint.",
                     "Monsoon leak detected above bay 3; two panels bent and sealant cracked.", 300, 1500, "URGENT", roof_skill),
                    ("SDX-J-1002", "Gutter blockage — east shed line", "Gutter & Downpipe Repair",
                     "Inspect and repair blocked gutter components along the east shed line.",
                     "Water overflowing near column line C after rain.", 180, 1800, "NORMAL", gutter_skill),
                ]
                for number, title, service, description, problem, minutes, payout, priority, skill_id in demo_jobs:
                    job_id = (await conn.fetchrow(
                        """INSERT INTO jobs(job_number,title,service_type,description,problem_description,customer_id,site_id,customer_name,company_name,customer_phone,
                           site_name,address_line,city,state,postal_code,latitude,longitude,scheduled_at,estimated_duration_minutes,estimated_payout,priority,status,required_skill_id)
                           VALUES($1,$2,$3,$4,$5,$6,$7,'Rakesh Patel','ABC Manufacturing','9825044321','ABC Manufacturing Plant','Plot 21, GIDC Industrial Estate',
                           'Sanand','Gujarat','382110',22.9924,72.3814,NOW()+INTERVAL '1 day',$8,$9,$10,'REQUESTED',$11) RETURNING id""",
                        number, title, service, description, problem, cid, site_id, minutes, payout, priority, skill_id))["id"]
                    await conn.execute("INSERT INTO job_requests(job_id,worker_id,distance_km,estimated_payout,offer_expires_at) VALUES($1,$2,2.4,$3,NOW()+INTERVAL '24 hours') ON CONFLICT DO NOTHING", job_id, wid, payout)
                    await conn.execute("INSERT INTO notifications(worker_id,type,title,message,entity_type,entity_id) VALUES($1,'NEW_JOB_REQUEST','New job request',$2,'JOB',$3)", wid, f"{title} near ABC Manufacturing Plant, Sanand.", job_id)
                    await conn.execute("INSERT INTO notifications(customer_id,type,title,message,entity_type,entity_id) VALUES($1,'REQUEST_CREATED','Request created',$2,'JOB',$3)", cid, f"{title} was created and is being matched with nearby professionals.", job_id)
        print("Seed complete.")
        print(f"Worker login:   {WORKER['phone']} / {WORKER['password']}")
        print(f"Customer login: {CUSTOMER['phone']} / {CUSTOMER['password']}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
