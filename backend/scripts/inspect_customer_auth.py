#!/usr/bin/env python3
"""
Inspect PostgreSQL database schema and data integrity for Customer authentication.
This script examines the actual database structure, constraints, and existing data.
"""

import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def inspect():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment or .env file")
        return

    print(f"Connecting to database...")
    conn = await asyncpg.connect(database_url)

    try:
        print("\n" + "="*80)
        print("CUSTOMER AUTHENTICATION SCHEMA AND DATA INTEGRITY INSPECTION")
        print("="*80)

        # 1. USERS TABLE STRUCTURE
        print("\n" + "="*80)
        print("1. USERS TABLE STRUCTURE")
        print("="*80)
        
        users_columns = await conn.fetch('''
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        ''')
        print("\nColumns:")
        for col in users_columns:
            print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, default: {col['column_default']})")

        users_constraints = await conn.fetch('''
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'users'
        ''')
        print("\nConstraints:")
        for cons in users_constraints:
            print(f"  {cons['constraint_name']}: {cons['constraint_type']}")

        users_indexes = await conn.fetch('''
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'users'
        ''')
        print("\nIndexes:")
        for idx in users_indexes:
            print(f"  {idx['indexname']}")
            print(f"    {idx['indexdef']}")

        # 2. CUSTOMERS TABLE STRUCTURE
        print("\n" + "="*80)
        print("2. CUSTOMERS TABLE STRUCTURE")
        print("="*80)
        
        customers_columns = await conn.fetch('''
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'customers'
            ORDER BY ordinal_position
        ''')
        print("\nColumns:")
        for col in customers_columns:
            print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, default: {col['column_default']})")

        customers_constraints = await conn.fetch('''
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'customers'
        ''')
        print("\nConstraints:")
        for cons in customers_constraints:
            print(f"  {cons['constraint_name']}: {cons['constraint_type']}")

        customers_indexes = await conn.fetch('''
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'customers'
        ''')
        print("\nIndexes:")
        for idx in customers_indexes:
            print(f"  {idx['indexname']}")
            print(f"    {idx['indexdef']}")

        # 3. CUSTOMER_SITES TABLE STRUCTURE
        print("\n" + "="*80)
        print("3. CUSTOMER_SITES TABLE STRUCTURE")
        print("="*80)
        
        sites_columns = await conn.fetch('''
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'customer_sites'
            ORDER BY ordinal_position
        ''')
        print("\nColumns:")
        for col in sites_columns:
            print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, default: {col['column_default']})")

        sites_constraints = await conn.fetch('''
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'customer_sites'
        ''')
        print("\nConstraints:")
        for cons in sites_constraints:
            print(f"  {cons['constraint_name']}: {cons['constraint_type']}")

        # 4. UNIQUE CONSTRAINTS ON EMAIL, PHONE, USERNAME
        print("\n" + "="*80)
        print("4. UNIQUE CONSTRAINTS AND INDEXES (DUPLICATE DETECTION)")
        print("="*80)
        
        unique_constraints = await conn.fetch('''
            SELECT tc.table_name, tc.constraint_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_name IN ('users', 'customers', 'customer_sites')
            ORDER BY tc.table_name, tc.constraint_name
        ''')
        print("\nUnique Constraints:")
        for cons in unique_constraints:
            print(f"  Table: {cons['table_name']}, Constraint: {cons['constraint_name']}, Column: {cons['column_name']}")

        # 5. FOREIGN KEY RELATIONSHIPS
        print("\n" + "="*80)
        print("5. FOREIGN KEY RELATIONSHIPS")
        print("="*80)
        
        foreign_keys = await conn.fetch('''
            SELECT
                tc.table_name,
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('users', 'customers', 'customer_sites')
            ORDER BY tc.table_name, tc.constraint_name
        ''')
        print("\nForeign Keys:")
        for fk in foreign_keys:
            print(f"  Table: {fk['table_name']}, Column: {fk['column_name']}")
            print(f"    References: {fk['foreign_table_name']}.{fk['foreign_column_name']}")

        # 6. EXISTING CUSTOMER DATA
        print("\n" + "="*80)
        print("6. EXISTING CUSTOMER DATA")
        print("="*80)
        
        users_count = await conn.fetchval('SELECT COUNT(*) FROM users WHERE role = $1', 'CUSTOMER')
        print(f"\nTotal users with CUSTOMER role: {users_count}")

        customers_count = await conn.fetchval('SELECT COUNT(*) FROM customers')
        print(f"Total customers: {customers_count}")

        customer_sites_count = await conn.fetchval('SELECT COUNT(*) FROM customer_sites')
        print(f"Total customer sites: {customer_sites_count}")

        # Sample customer data
        customers = await conn.fetch('''
            SELECT c.id, c.user_id, c.full_name, c.company_name, c.deleted_at,
                   u.phone, u.email, u.is_active, u.role, u.created_at
            FROM customers c
            JOIN users u ON u.id = c.user_id
            ORDER BY c.created_at DESC
            LIMIT 10
        ''')
        
        print("\nSample customer records (last 10):")
        for cust in customers:
            print(f"  Customer ID: {cust['id']}")
            print(f"    User ID: {cust['user_id']}")
            print(f"    Name: {cust['full_name']}")
            print(f"    Company: {cust['company_name'] or 'N/A'}")
            print(f"    Phone: {cust['phone']}")
            print(f"    Email: {cust['email'] or 'N/A'}")
            print(f"    Role: {cust['role']}")
            print(f"    Active: {cust['is_active']}")
            print(f"    Deleted At: {cust['deleted_at'] or 'N/A'}")
            print(f"    Created: {cust['created_at']}")
            print()

        # 7. DATA INTEGRITY CHECKS
        print("\n" + "="*80)
        print("7. DATA INTEGRITY CHECKS")
        print("="*80)
        
        # Check for orphan users (users with CUSTOMER role but no customer record)
        orphan_users = await conn.fetch('''
            SELECT u.id, u.phone, u.email, u.created_at
            FROM users u
            LEFT JOIN customers c ON c.user_id = u.id
            WHERE u.role = 'CUSTOMER' AND c.id IS NULL
        ''')
        print(f"\nOrphan users (CUSTOMER role without customer record): {len(orphan_users)}")
        for user in orphan_users:
            print(f"  User ID: {user['id']}, Phone: {user['phone']}, Email: {user['email']}")

        # Check for orphan customers (customers without user record)
        orphan_customers = await conn.fetch('''
            SELECT c.id, c.full_name, c.user_id
            FROM customers c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE u.id IS NULL
        ''')
        print(f"\nOrphan customers (customer without user record): {len(orphan_customers)}")
        for cust in orphan_customers:
            print(f"  Customer ID: {cust['id']}, Name: {cust['full_name']}, User ID: {cust['user_id']}")

        # Check for duplicate phone numbers
        duplicate_phones = await conn.fetch('''
            SELECT phone, COUNT(*) as count
            FROM users
            WHERE phone IS NOT NULL
            GROUP BY phone
            HAVING COUNT(*) > 1
        ''')
        print(f"\nDuplicate phone numbers: {len(duplicate_phones)}")
        for dup in duplicate_phones:
            print(f"  Phone: {dup['phone']}, Count: {dup['count']}")

        # Check for duplicate emails
        duplicate_emails = await conn.fetch('''
            SELECT email, COUNT(*) as count
            FROM users
            WHERE email IS NOT NULL
            GROUP BY email
            HAVING COUNT(*) > 1
        ''')
        print(f"\nDuplicate email addresses: {len(duplicate_emails)}")
        for dup in duplicate_emails:
            print(f"  Email: {dup['email']}, Count: {dup['count']}")

        # Check for soft-deleted records
        soft_deleted_users = await conn.fetchval('SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL')
        print(f"\nSoft-deleted users: {soft_deleted_users}")

        soft_deleted_customers = await conn.fetchval('SELECT COUNT(*) FROM customers WHERE deleted_at IS NOT NULL')
        print(f"Soft-deleted customers: {soft_deleted_customers}")

        inactive_users = await conn.fetchval('SELECT COUNT(*) FROM users WHERE is_active = FALSE')
        print(f"Inactive users (is_active=FALSE): {inactive_users}")

        # Check for inactive customer sites
        inactive_sites = await conn.fetchval('SELECT COUNT(*) FROM customer_sites WHERE is_active = FALSE')
        print(f"Inactive customer sites: {inactive_sites}")

        # 8. CONSTRAINT RESPONSIBLE FOR DUPLICATE DETECTION
        print("\n" + "="*80)
        print("8. SPECIFIC CONSTRAINT RESPONSIBLE FOR DUPLICATE DETECTION")
        print("="*80)
        
        # The specific constraint that prevents duplicate phone/email
        phone_constraint = await conn.fetch('''
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass
            AND conname LIKE '%phone%'
        ''')
        print("\nPhone constraint:")
        for cons in phone_constraint:
            print(f"  Name: {cons['conname']}")
            print(f"  Definition: {cons['definition']}")

        email_constraint = await conn.fetch('''
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass
            AND conname LIKE '%email%'
        ''')
        print("\nEmail constraint:")
        for cons in email_constraint:
            print(f"  Name: {cons['conname']}")
            print(f"  Definition: {cons['definition']}")

        # Show the actual constraint from the table definition
        users_table_def = await conn.fetchval('''
            SELECT pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass
            AND contype = 'u'
        ''')
        print("\nAll unique constraints on users table:")
        print(f"  {users_table_def}")

    finally:
        await conn.close()
        print("\n" + "="*80)
        print("Inspection complete")
        print("="*80)

if __name__ == "__main__":
    asyncio.run(inspect())
