"""Comprehensive worker data integrity inspection for PostgreSQL database."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

class DataIntegrityInspector:
    def __init__(self, conn):
        self.conn = conn
        self.issues = []
        self.worker_details = {}
    
    async def inspect_all(self):
        """Run all integrity checks."""
        print("=" * 80)
        print("WORKER DATA INTEGRITY INSPECTION")
        print("=" * 80)
        
        await self.check_1_incorrect_field_mapping()
        await self.check_2_orphan_rows()
        await self.check_3_duplicate_worker_identities()
        await self.check_4_workers_without_users()
        await self.check_5_users_without_workers()
        await self.check_6_missing_profile_data()
        await self.check_7_invalid_skill_relations()
        await self.check_8_invalid_service_area_relations()
        await self.check_9_duplicate_skill_relations()
        await self.check_10_duplicate_service_area_relations()
        await self.check_11_invalid_availability_rows()
        
        await self.print_summary()
        await self.generate_recommendations()
    
    async def check_1_incorrect_field_mapping(self):
        """Check for incorrect field mapping in worker records."""
        print("\n[1] Checking for incorrect field mapping in worker records...")
        
        # Check for NULL values in required fields
        workers = await self.conn.fetch('''
            SELECT id, full_name, user_id, status, availability_status
            FROM workers
            WHERE deleted_at IS NULL
        ''')
        
        issues = []
        for worker in workers:
            if not worker['full_name']:
                issues.append(f"Worker {worker['id']}: NULL full_name")
            if not worker['user_id']:
                issues.append(f"Worker {worker['id']}: NULL user_id")
            if not worker['status']:
                issues.append(f"Worker {worker['id']}: NULL status")
            if not worker['availability_status']:
                issues.append(f"Worker {worker['id']}: NULL availability_status")
        
        # Check for invalid enum values
        invalid_status = await self.conn.fetch('''
            SELECT id, status
            FROM workers
            WHERE deleted_at IS NULL 
            AND status NOT IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')
        ''')
        
        invalid_availability = await self.conn.fetch('''
            SELECT id, availability_status
            FROM workers
            WHERE deleted_at IS NULL 
            AND availability_status NOT IN ('OFFLINE', 'ONLINE', 'BUSY')
        ''')
        
        for w in invalid_status:
            issues.append(f"Worker {w['id']}: Invalid status '{w['status']}'")
        
        for w in invalid_availability:
            issues.append(f"Worker {w['id']}: Invalid availability_status '{w['availability_status']}'")
        
        # Check for negative years_experience
        negative_exp = await self.conn.fetch('''
            SELECT id, years_experience
            FROM workers
            WHERE deleted_at IS NULL AND years_experience < 0
        ''')
        
        for w in negative_exp:
            issues.append(f"Worker {w['id']}: Negative years_experience {w['years_experience']}")
        
        if issues:
            self.issues.extend([{"type": "Incorrect Field Mapping", "issue": i} for i in issues])
            print(f"  Found {len(issues)} field mapping issues")
            for issue in issues[:10]:
                print(f"     - {issue}")
            if len(issues) > 10:
                print(f"     ... and {len(issues) - 10} more")
        else:
            print("  No field mapping issues found")
    
    async def check_2_orphan_rows(self):
        """Check for orphan rows (worker_skills without workers, worker_service_areas without workers)."""
        print("\n[2] Checking for orphan rows...")
        
        # Orphan worker_skills
        orphan_skills = await self.conn.fetch('''
            SELECT ws.id, ws.worker_id
            FROM worker_skills ws
            LEFT JOIN workers w ON w.id = ws.worker_id
            WHERE w.id IS NULL
        ''')
        
        # Orphan worker_service_areas
        orphan_areas = await self.conn.fetch('''
            SELECT wsa.id, wsa.worker_id
            FROM worker_service_areas wsa
            LEFT JOIN workers w ON w.id = wsa.worker_id
            WHERE w.id IS NULL
        ''')
        
        # Orphan worker_availability
        orphan_availability = await self.conn.fetch('''
            SELECT wa.id, wa.worker_id
            FROM worker_availability wa
            LEFT JOIN workers w ON w.id = wa.worker_id
            WHERE w.id IS NULL
        ''')
        
        issues = []
        for row in orphan_skills:
            issues.append(f"worker_skills {row['id']}: references non-existent worker {row['worker_id']}")
        
        for row in orphan_areas:
            issues.append(f"worker_service_areas {row['id']}: references non-existent worker {row['worker_id']}")
        
        for row in orphan_availability:
            issues.append(f"worker_availability {row['id']}: references non-existent worker {row['worker_id']}")
        
        if issues:
            self.issues.extend([{"type": "Orphan Rows", "issue": i} for i in issues])
            print(f"  Found {len(issues)} orphan rows")
            for issue in issues[:10]:
                print(f"     - {issue}")
            if len(issues) > 10:
                print(f"     ... and {len(issues) - 10} more")
        else:
            print("  No orphan rows found")
    
    async def check_3_duplicate_worker_identities(self):
        """Check for duplicate Worker identities (same user_id)."""
        print("\n[3] Checking for duplicate worker identities...")
        
        duplicates = await self.conn.fetch('''
            SELECT user_id, COUNT(*) as count
            FROM workers
            WHERE deleted_at IS NULL
            GROUP BY user_id
            HAVING COUNT(*) > 1
        ''')
        
        issues = []
        for dup in duplicates:
            worker_ids = await self.conn.fetch('''
                SELECT id
                FROM workers
                WHERE user_id = $1 AND deleted_at IS NULL
            ''', dup['user_id'])
            ids = [w['id'] for w in worker_ids]
            issues.append(f"User {dup['user_id']} has {dup['count']} workers: {ids}")
        
        if issues:
            self.issues.extend([{"type": "Duplicate Worker Identities", "issue": i} for i in issues])
            print(f"  Found {len(issues)} duplicate worker identities")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  No duplicate worker identities found")
    
    async def check_4_workers_without_users(self):
        """Check for workers without users."""
        print("\n[4] Checking for workers without users...")
        
        orphan_workers = await self.conn.fetch('''
            SELECT w.id, w.full_name, w.user_id
            FROM workers w
            LEFT JOIN users u ON u.id = w.user_id
            WHERE w.deleted_at IS NULL AND u.id IS NULL
        ''')
        
        issues = []
        for w in orphan_workers:
            issues.append(f"Worker {w['id']} ({w['full_name']}): references non-existent user {w['user_id']}")
        
        if issues:
            self.issues.extend([{"type": "Workers Without Users", "issue": i} for i in issues])
            print(f"  Found {len(issues)} workers without users")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  All workers have valid users")
    
    async def check_5_users_without_workers(self):
        """Check for users without workers (worker role users)."""
        print("\n[5] Checking for worker-role users without worker profiles...")
        
        orphan_users = await self.conn.fetch('''
            SELECT u.id, u.phone, u.email
            FROM users u
            LEFT JOIN workers w ON w.user_id = u.id AND w.deleted_at IS NULL
            WHERE u.role = 'WORKER' AND u.deleted_at IS NULL AND w.id IS NULL
        ''')
        
        issues = []
        for u in orphan_users:
            issues.append(f"User {u['id']} ({u['phone']}, {u['email']}): worker role but no worker profile")
        
        if issues:
            self.issues.extend([{"type": "Users Without Workers", "issue": i} for i in issues])
            print(f"  Found {len(issues)} worker-role users without profiles")
            for issue in issues[:10]:
                print(f"     - {issue}")
            if len(issues) > 10:
                print(f"     ... and {len(issues) - 10} more")
        else:
            print("  All worker-role users have profiles")
    
    async def check_6_missing_profile_data(self):
        """Check for missing critical profile data."""
        print("\n[6] Checking for missing profile data...")
        
        workers = await self.conn.fetch('''
            SELECT id, full_name, primary_trade, years_experience, 
                   emergency_contact_name, emergency_contact_number,
                   professional_bio, languages, preferred_work_type
            FROM workers
            WHERE deleted_at IS NULL
        ''')
        
        issues = []
        for w in workers:
            missing = []
            if not w['primary_trade']:
                missing.append('primary_trade')
            if w['years_experience'] is None:
                missing.append('years_experience')
            if not w['emergency_contact_name']:
                missing.append('emergency_contact_name')
            if not w['emergency_contact_number']:
                missing.append('emergency_contact_number')
            if not w['professional_bio']:
                missing.append('professional_bio')
            if not w['languages']:
                missing.append('languages')
            if not w['preferred_work_type']:
                missing.append('preferred_work_type')
            
            if missing:
                issues.append(f"Worker {w['id']}: missing {', '.join(missing)}")
        
        if issues:
            self.issues.extend([{"type": "Missing Profile Data", "issue": i} for i in issues])
            print(f"  Found {len(issues)} workers with missing profile data")
            for issue in issues[:10]:
                print(f"     - {issue}")
            if len(issues) > 10:
                print(f"     ... and {len(issues) - 10} more")
        else:
            print("  All workers have complete profile data")
    
    async def check_7_invalid_skill_relations(self):
        """Check for invalid skill relations (worker_skills referencing non-existent skills)."""
        print("\n[7] Checking for invalid skill relations...")
        
        invalid_skills = await self.conn.fetch('''
            SELECT ws.id, ws.worker_id, ws.skill_id
            FROM worker_skills ws
            LEFT JOIN skills s ON s.id = ws.skill_id
            WHERE s.id IS NULL
        ''')
        
        issues = []
        for row in invalid_skills:
            issues.append(f"worker_skills {row['id']}: worker {row['worker_id']} references non-existent skill {row['skill_id']}")
        
        if issues:
            self.issues.extend([{"type": "Invalid Skill Relations", "issue": i} for i in issues])
            print(f"  Found {len(issues)} invalid skill relations")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  All skill relations are valid")
    
    async def check_8_invalid_service_area_relations(self):
        """Check for invalid service-area relations."""
        print("\n[8] Checking for invalid service-area relations...")
        
        invalid_areas = await self.conn.fetch('''
            SELECT wsa.id, wsa.worker_id, wsa.service_area_id
            FROM worker_service_areas wsa
            LEFT JOIN service_areas sa ON sa.id = wsa.service_area_id
            WHERE sa.id IS NULL
        ''')
        
        issues = []
        for row in invalid_areas:
            issues.append(f"worker_service_areas {row['id']}: worker {row['worker_id']} references non-existent service_area {row['service_area_id']}")
        
        if issues:
            self.issues.extend([{"type": "Invalid Service Area Relations", "issue": i} for i in issues])
            print(f"  Found {len(issues)} invalid service-area relations")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  All service-area relations are valid")
    
    async def check_9_duplicate_skill_relations(self):
        """Check for duplicate skill relations (should be prevented by UNIQUE constraint)."""
        print("\n[9] Checking for duplicate skill relations...")
        
        # This should not happen due to UNIQUE constraint, but check anyway
        duplicates = await self.conn.fetch('''
            SELECT worker_id, skill_id, COUNT(*) as count
            FROM worker_skills
            GROUP BY worker_id, skill_id
            HAVING COUNT(*) > 1
        ''')
        
        issues = []
        for dup in duplicates:
            issues.append(f"Worker {dup['worker_id']}, Skill {dup['skill_id']}: {dup['count']} duplicate relations")
        
        if issues:
            self.issues.extend([{"type": "Duplicate Skill Relations", "issue": i} for i in issues])
            print(f"  Found {len(issues)} duplicate skill relations")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  No duplicate skill relations found")
    
    async def check_10_duplicate_service_area_relations(self):
        """Check for duplicate service-area relations."""
        print("\n[10] Checking for duplicate service-area relations...")
        
        duplicates = await self.conn.fetch('''
            SELECT worker_id, service_area_id, COUNT(*) as count
            FROM worker_service_areas
            GROUP BY worker_id, service_area_id
            HAVING COUNT(*) > 1
        ''')
        
        issues = []
        for dup in duplicates:
            issues.append(f"Worker {dup['worker_id']}, Service Area {dup['service_area_id']}: {dup['count']} duplicate relations")
        
        if issues:
            self.issues.extend([{"type": "Duplicate Service Area Relations", "issue": i} for i in issues])
            print(f"  Found {len(issues)} duplicate service-area relations")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print("  No duplicate service-area relations found")
    
    async def check_11_invalid_availability_rows(self):
        """Check for invalid availability rows."""
        print("\n[11] Checking for invalid availability rows...")
        
        issues = []
        
        # Check for invalid day_of_week
        invalid_days = await self.conn.fetch('''
            SELECT id, worker_id, day_of_week
            FROM worker_availability
            WHERE day_of_week < 0 OR day_of_week > 6
        ''')
        
        for row in invalid_days:
            issues.append(f"worker_availability {row['id']}: worker {row['worker_id']} has invalid day_of_week {row['day_of_week']}")
        
        # Check for invalid time ranges (end_time before start_time)
        invalid_times = await self.conn.fetch('''
            SELECT id, worker_id, day_of_week, start_time, end_time
            FROM worker_availability
            WHERE end_time < start_time
        ''')
        
        for row in invalid_times:
            issues.append(f"worker_availability {row['id']}: worker {row['worker_id']} day {row['day_of_week']} has end_time before start_time")
        
        # Check for NULL required fields
        null_fields = await self.conn.fetch('''
            SELECT id, worker_id, day_of_week, start_time, end_time
            FROM worker_availability
            WHERE day_of_week IS NULL OR start_time IS NULL OR end_time IS NULL
        ''')
        
        for row in null_fields:
            issues.append(f"worker_availability {row['id']}: worker {row['worker_id']} has NULL required fields")
        
        if issues:
            self.issues.extend([{"type": "Invalid Availability Rows", "issue": i} for i in issues])
            print(f"  Found {len(issues)} invalid availability rows")
            for issue in issues[:10]:
                print(f"     - {issue}")
            if len(issues) > 10:
                print(f"     ... and {len(issues) - 10} more")
        else:
            print("  All availability rows are valid")
    
    async def print_summary(self):
        """Print summary of all issues found."""
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        
        if not self.issues:
            print("\nNO DATA INTEGRITY ISSUES FOUND")
            return
        
        # Group by issue type
        by_type = defaultdict(list)
        for issue in self.issues:
            by_type[issue['type']].append(issue['issue'])
        
        print(f"\nTotal Issues Found: {len(self.issues)}\n")
        
        for issue_type, issues_list in by_type.items():
            print(f"{issue_type}: {len(issues_list)}")
    
    async def generate_recommendations(self):
        """Generate recommendations for fixing issues."""
        print("\n" + "=" * 80)
        print("RECOMMENDATIONS")
        print("=" * 80)
        
        if not self.issues:
            print("\nDatabase is healthy. No fixes needed.")
            return
        
        by_type = defaultdict(list)
        for issue in self.issues:
            by_type[issue['type']].append(issue['issue'])
        
        print("\n")
        
        # Orphan rows - SAFE TO DELETE
        if "Orphan Rows" in by_type:
            print("1. ORPHAN ROWS (SAFE TO DELETE)")
            print("   - These rows reference non-existent workers")
            print("   - Can be safely deleted without affecting valid data")
            print("   - SQL to fix:")
            print("     DELETE FROM worker_skills WHERE worker_id NOT IN (SELECT id FROM workers WHERE deleted_at IS NULL);")
            print("     DELETE FROM worker_service_areas WHERE worker_id NOT IN (SELECT id FROM workers WHERE deleted_at IS NULL);")
            print("     DELETE FROM worker_availability WHERE worker_id NOT IN (SELECT id FROM workers WHERE deleted_at IS NULL);")
            print()
        
        # Invalid relations - SAFE TO DELETE
        if "Invalid Skill Relations" in by_type or "Invalid Service Area Relations" in by_type:
            print("2. INVALID RELATIONS (SAFE TO DELETE)")
            print("   - These reference non-existent skills or service areas")
            print("   - Can be safely deleted")
            print("   - SQL to fix:")
            print("     DELETE FROM worker_skills WHERE skill_id NOT IN (SELECT id FROM skills);")
            print("     DELETE FROM worker_service_areas WHERE service_area_id NOT IN (SELECT id FROM service_areas);")
            print()
        
        # Duplicate relations - NEED MANUAL REVIEW
        if "Duplicate Skill Relations" in by_type or "Duplicate Service Area Relations" in by_type:
            print("3. DUPLICATE RELATIONS (NEED MANUAL REVIEW)")
            print("   - UNIQUE constraint should prevent this")
            print("   - May indicate constraint was disabled or bypassed")
            print("   - SQL to fix (keep first occurrence):")
            print("     DELETE FROM worker_skills WHERE id NOT IN (SELECT DISTINCT ON (worker_id, skill_id) id FROM worker_skills);")
            print("     DELETE FROM worker_service_areas WHERE id NOT IN (SELECT DISTINCT ON (worker_id, service_area_id) id FROM worker_service_areas);")
            print()
        
        # Workers without users - NEED MANUAL REVIEW
        if "Workers Without Users" in by_type:
            print("4. WORKERS WITHOUT USERS (NEED MANUAL REVIEW)")
            print("   - These workers reference non-existent users")
            print("   - Option 1: Delete orphaned workers (if no important data)")
            print("   - Option 2: Create placeholder users (if worker data is important)")
            print("   - SQL to delete:")
            print("     DELETE FROM workers WHERE user_id NOT IN (SELECT id FROM users);")
            print()
        
        # Users without workers - MAY BE INTENTIONAL
        if "Users Without Workers" in by_type:
            print("5. USERS WITHOUT WORKERS (MAY BE INTENTIONAL)")
            print("   - Worker-role users without profiles")
            print("   - May be incomplete registrations")
            print("   - Review and either:")
            print("     - Complete worker profiles")
            print("     - Change user role to CUSTOMER")
            print("     - Delete if stale/incomplete")
            print()
        
        # Duplicate worker identities - CRITICAL - NEED MANUAL REVIEW
        if "Duplicate Worker Identities" in by_type:
            print("6. DUPLICATE WORKER IDENTITIES (CRITICAL - NEED MANUAL REVIEW)")
            print("   - Same user_id linked to multiple workers")
            print("   - UNIQUE constraint on user_id should prevent this")
            print("   - May indicate data corruption or constraint bypass")
            print("   - MUST review manually to determine which worker to keep")
            print("   - Consider merging data before deletion")
            print()
        
        # Incorrect field mapping - NEED MANUAL REVIEW
        if "Incorrect Field Mapping" in by_type:
            print("7. INCORRECT FIELD MAPPING (NEED MANUAL REVIEW)")
            print("   - NULL values in required fields or invalid enum values")
            print("   - SQL to fix NULL required fields:")
            print("     UPDATE workers SET full_name = 'Unknown' WHERE full_name IS NULL;")
            print("     UPDATE workers SET status = 'ACTIVE' WHERE status IS NULL;")
            print("     UPDATE workers SET availability_status = 'OFFLINE' WHERE availability_status IS NULL;")
            print("   - SQL to fix invalid enum values:")
            print("     UPDATE workers SET status = 'ACTIVE' WHERE status NOT IN ('ACTIVE','INACTIVE','SUSPENDED');")
            print("     UPDATE workers SET availability_status = 'OFFLINE' WHERE availability_status NOT IN ('OFFLINE','ONLINE','BUSY');")
            print()
        
        # Missing profile data - MAY BE INTENTIONAL
        if "Missing Profile Data" in by_type:
            print("8. MISSING PROFILE DATA (MAY BE INTENTIONAL)")
            print("   - Workers missing optional profile fields")
            print("   - May be incomplete registrations")
            print("   - Review and encourage workers to complete profiles")
            print("   - Not critical for basic functionality")
            print()
        
        # Invalid availability rows - SAFE TO DELETE OR FIX
        if "Invalid Availability Rows" in by_type:
            print("9. INVALID AVAILABILITY ROWS (SAFE TO DELETE OR FIX)")
            print("   - Invalid day_of_week, time ranges, or NULL values")
            print("   - SQL to delete invalid rows:")
            print("     DELETE FROM worker_availability WHERE day_of_week < 0 OR day_of_week > 6;")
            print("     DELETE FROM worker_availability WHERE end_time < start_time;")
            print("   - SQL to fix NULL values:")
            print("     DELETE FROM worker_availability WHERE day_of_week IS NULL OR start_time IS NULL OR end_time IS NULL;")
            print()
        
        print("=" * 80)
        print("DELETION SAFETY ASSESSMENT")
        print("=" * 80)
        print("\nSAFE FOR MASS DELETION:")
        print("  - Orphan rows (worker_skills, worker_service_areas, worker_availability)")
        print("  - Invalid skill relations")
        print("  - Invalid service-area relations")
        print("  - Invalid availability rows")
        print("\nREQUIRE TARGETED REPAIRS:")
        print("  - Workers without users (review each case)")
        print("  - Users without workers (review each case)")
        print("  - Duplicate worker identities (CRITICAL - manual review required)")
        print("  - Incorrect field mapping (fix with UPDATE statements)")
        print("  - Missing profile data (not critical, may be intentional)")
        print("=" * 80)

async def main():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = await asyncpg.connect(database_url)
    try:
        inspector = DataIntegrityInspector(conn)
        await inspector.inspect_all()
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())