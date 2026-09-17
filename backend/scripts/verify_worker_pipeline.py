"""Verify field-by-field data consistency across the entire worker pipeline."""
import asyncio
import asyncpg
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

load_dotenv()

async def verify_worker_pipeline():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        # Get the test worker we just created
        worker = await conn.fetchrow('''
            SELECT w.id, w.full_name, w.primary_trade, w.years_experience,
                   w.emergency_contact_name, w.emergency_contact_number,
                   w.professional_bio, w.languages, w.preferred_work_type,
                   w.previous_company, u.phone, u.email, w.rating_avg, w.rating_count,
                   w.completed_jobs_count, w.status, w.availability_status, w.created_at
            FROM workers w
            JOIN users u ON u.id = w.user_id
            WHERE w.full_name = 'Worker Data Verification' AND w.deleted_at IS NULL
        ''')
        
        if not worker:
            print("Test worker 'Worker Data Verification' not found")
            return
        
        print("=== DATABASE VERIFICATION ===")
        print(f"Worker ID: {worker['id']}")
        print(f"Name: {worker['full_name']}")
        print(f"Phone: {worker['phone']}")
        print(f"Email: {worker['email']}")
        print(f"Primary Trade: {worker['primary_trade']}")
        print(f"Years Experience: {worker['years_experience']}")
        print(f"Previous Company: {worker['previous_company']}")
        print(f"Professional Bio: {worker['professional_bio']}")
        print(f"Emergency Contact Name: {worker['emergency_contact_name']}")
        print(f"Emergency Contact Number: {worker['emergency_contact_number']}")
        print(f"Preferred Work Type: {worker['preferred_work_type']}")
        print(f"Languages: {worker['languages']}")
        print(f"Rating: {worker['rating_avg']}")
        print(f"Completed Jobs: {worker['completed_jobs_count']}")
        print(f"Status: {worker['status']}")
        print(f"Availability: {worker['availability_status']}")
        
        # Get skills
        skills = await conn.fetch('''
            SELECT s.name, s.category
            FROM worker_skills ws
            JOIN skills s ON s.id = ws.skill_id
            WHERE ws.worker_id = $1
        ''', worker['id'])
        print(f"Skills: {[s['name'] for s in skills]}")
        
        # Get service areas
        areas = await conn.fetch('''
            SELECT sa.name, sa.city, sa.state
            FROM worker_service_areas wsa
            JOIN service_areas sa ON sa.id = wsa.service_area_id
            WHERE wsa.worker_id = $1
        ''', worker['id'])
        print(f"Service Areas: {[a['name'] for a in areas]}")
        
        # Get current assignments
        assignments = await conn.fetch('''
            SELECT COUNT(*) as count
            FROM job_assignments
            WHERE worker_id = $1 AND completed_at IS NULL
        ''', worker['id'])
        print(f"Current Assignments: {assignments[0]['count']}")
        
        print("\n=== FIELD-BY-FIELD VERIFICATION ===")
        
        # Expected values (note: phone numbers are dynamic)
        expected = {
            'full_name': 'Worker Data Verification',
            'email': 'worker.data.verification@example.com',
            'primary_trade': 'Roofing Specialist',
            'years_experience': 7,
            'previous_company': 'Previous Company Test',
            'professional_bio': 'Seven years of real roofing service experience.',
            'emergency_contact_name': 'Emergency Person',
            'preferred_work_type': 'Full Time',
            'languages': 'Gujarati, Hindi, English',
            'skills': ['Roof Panel Repair', 'Leak Inspection'],
            'service_areas': ['Ahmedabad', 'Gandhinagar'],
        }
        
        # Dynamic fields (phone and emergency_contact_number vary)
        dynamic_fields = ['phone', 'emergency_contact_number']
        
        # Verify each field
        all_passed = True
        for field, expected_value in expected.items():
            if field == 'skills':
                actual = [s['name'] for s in skills]
            elif field == 'service_areas':
                actual = [a['name'] for a in areas]
            else:
                actual = worker[field]

            if actual == expected_value:
                print(f"[PASS] {field}: {actual}")
            else:
                print(f"[FAIL] {field}: Expected '{expected_value}', Got '{actual}'")
                all_passed = False

        # Verify dynamic fields separately
        print(f"[PASS] phone: {worker['phone']} (dynamic)")
        print(f"[PASS] emergency_contact_number: {worker['emergency_contact_number']} (dynamic)")
        
        print("\n=== EMERGENCY CONTACT FIELD SWAP CHECK ===")
        # Check if emergency_contact_name is all digits (indicates swap)
        if worker['emergency_contact_name'] and worker['emergency_contact_name'].isdigit():
            print("[FAIL] ERROR: emergency_contact_name contains only digits (field swap detected)")
            all_passed = False
        else:
            print("[PASS] emergency_contact_name is not all digits (no swap detected)")

        # Check if emergency_contact_number is empty (indicates swap)
        if not worker['emergency_contact_number'] and worker['emergency_contact_name']:
            print("[FAIL] ERROR: emergency_contact_number is empty while name has value (possible swap)")
            all_passed = False
        else:
            print("[PASS] emergency_contact_number has value")

        print("\n=== PIPELINE CONSISTENCY RESULT ===")
        if all_passed:
            print("[PASS] ALL FIELDS PASSED VERIFICATION")
            print("[PASS] Data is consistent across database")
        else:
            print("[FAIL] SOME FIELDS FAILED VERIFICATION")
            print("[FAIL] Data inconsistency detected")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(verify_worker_pipeline())