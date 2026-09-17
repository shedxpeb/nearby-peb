"""Create a test worker to verify all field mappings are correct."""
import asyncio
import asyncpg
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

load_dotenv()

async def create_test_worker():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Import security module for password hashing
        from app.security import hash_password
        
        # Test worker data with deliberately distinct values
        import time
        unique_suffix = str(int(time.time()))[-4:]  # Last 4 digits of timestamp
        test_worker_data = {
            'full_name': 'Worker Data Verification',
            'phone': f'7777{unique_suffix}',
            'email': 'worker.data.verification@example.com',
            'password': 'TestPassword123',
            'primary_trade': 'Roofing Specialist',
            'years_experience': 7,
            'professional_bio': 'Seven years of real roofing service experience.',
            'previous_company': 'Previous Company Test',
            'emergency_contact_name': 'Emergency Person',
            'emergency_contact_number': f'7777{str(int(unique_suffix) + 1)}',
            'preferred_work_type': 'Full Time',
            'languages': 'Gujarati, Hindi, English',
            'skills': ['Roof Panel Repair', 'Leak Inspection'],
            'service_areas': ['Ahmedabad', 'Gandhinagar'],
            'service_area_radius_km': 15.0
        }
        
        print("Creating test worker with the following data:")
        for key, value in test_worker_data.items():
            print(f"  {key}: {value}")
        
        async with conn.transaction():
            # Create user account
            user = await conn.fetchrow(
                """INSERT INTO users(phone, email, password_hash, role)
                   VALUES($1, $2, $3, $4)
                   RETURNING id, phone, email, role""",
                test_worker_data['phone'], test_worker_data['email'], 
                hash_password(test_worker_data['password']), "WORKER"
            )
            print(f"\nCreated user with ID: {user['id']}")
            
            # Create worker profile
            worker = await conn.fetchrow(
                """INSERT INTO workers(user_id, full_name, primary_trade, years_experience, professional_bio,
                                  previous_company, emergency_contact_name, emergency_contact_number,
                                  preferred_work_type, languages, status, availability_status)
               VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', 'OFFLINE')
               RETURNING id, full_name, primary_trade, status, availability_status""",
                user['id'], test_worker_data['full_name'], test_worker_data['primary_trade'], 
                test_worker_data['years_experience'], test_worker_data['professional_bio'],
                test_worker_data['previous_company'], test_worker_data['emergency_contact_name'],
                test_worker_data['emergency_contact_number'], test_worker_data['preferred_work_type'],
                test_worker_data['languages']
            )
            print(f"Created worker with ID: {worker['id']}")
            
            # Insert skills
            for skill_name in test_worker_data['skills']:
                skill_id = await conn.fetchval(
                    "SELECT id FROM skills WHERE name=$1 AND is_active=TRUE",
                    skill_name
                )
                if skill_id:
                    await conn.execute(
                        "INSERT INTO worker_skills(worker_id, skill_id) VALUES($1, $2) ON CONFLICT DO NOTHING",
                        worker['id'], skill_id
                    )
                    print(f"Added skill: {skill_name}")
                else:
                    print(f"Skill not found: {skill_name}")
            
            # Insert service areas
            for area_name in test_worker_data['service_areas']:
                area_id = await conn.fetchval(
                    "SELECT id FROM service_areas WHERE name=$1 LIMIT 1",
                    area_name
                )
                if area_id:
                    await conn.execute(
                        "INSERT INTO worker_service_areas(worker_id, service_area_id, radius_km) VALUES($1, $2, $3) ON CONFLICT DO NOTHING",
                        worker['id'], area_id, test_worker_data['service_area_radius_km']
                    )
                    print(f"Added service area: {area_name}")
                else:
                    print(f"Service area not found: {area_name}")
        
        print("\n=== Test worker created successfully ===")
        print(f"Worker ID: {worker['id']}")
        print(f"Name: {test_worker_data['full_name']}")
        print(f"Phone: {test_worker_data['phone']}")
        print(f"Email: {test_worker_data['email']}")
        print(f"Emergency Contact Name: {test_worker_data['emergency_contact_name']}")
        print(f"Emergency Contact Number: {test_worker_data['emergency_contact_number']}")
        print(f"Skills: {', '.join(test_worker_data['skills'])}")
        print(f"Service Areas: {', '.join(test_worker_data['service_areas'])}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_test_worker())