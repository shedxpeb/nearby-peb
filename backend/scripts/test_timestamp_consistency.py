"""
Test script to verify timestamp consistency across all portals.
This ensures that the same job shows the same timestamps in Customer, Admin, and Worker portals.
"""

import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path
import asyncpg
from urllib.parse import urlparse

# Add the parent directory to the path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings


async def test_timestamp_consistency():
    """Test that timestamps are consistent across all portals for the same job."""
    
    settings = get_settings()
    
    # Parse database URL
    db_url = urlparse(settings.database_url)
    
    # Direct database connection
    conn = await asyncpg.connect(
        host=db_url.hostname,
        port=db_url.port,
        database=db_url.path[1:],  # Remove leading /
        user=db_url.username,
        password=db_url.password
    )
    
    try:
        # Get a sample job ID
        job_row = await conn.fetchrow("""
            SELECT j.id, j.job_number, j.created_at, j.scheduled_at, j.completed_at,
                   ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at as assignment_completed_at
            FROM jobs j
            LEFT JOIN job_assignments ja ON ja.job_id = j.id
            WHERE j.status IN ('REQUESTED', 'ASSIGNED', 'COMPLETED')
            ORDER BY j.created_at DESC
            LIMIT 1
        """)
        
        if not job_row:
            print("No jobs found in database. Please create a test job first.")
            return
        
        job_id = str(job_row['id'])
        job_number = job_row['job_number']
        
        print(f"\n{'='*60}")
        print(f"Testing timestamp consistency for Job: {job_number}")
        print(f"Job ID: {job_id}")
        print(f"{'='*60}\n")
        
        # Database timestamps (source of truth)
        print("DATABASE TIMESTAMPS (Source of Truth):")
        print(f"  created_at: {job_row['created_at']}")
        print(f"  scheduled_at: {job_row['scheduled_at']}")
        print(f"  completed_at: {job_row['completed_at']}")
        print(f"  assigned_at: {job_row['assigned_at']}")
        print(f"  accepted_at: {job_row['accepted_at']}")
        print(f"  started_at: {job_row['started_at']}")
        print(f"  assignment_completed_at: {job_row['assignment_completed_at']}")
        print()
        
        # Simulate API response for each portal
        print("API RESPONSE STRUCTURES:")
        
        # Customer portal job detail
        customer_job = await conn.fetchrow("""
            SELECT j.*, cs.site_name AS site_name_ref, cs.contact_name AS site_contact_name, cs.contact_phone AS site_contact_phone,
                   w.id as worker_id, w.full_name as worker_name, w.profile_photo_url as worker_photo, w.primary_trade, w.years_experience, w.rating_avg, w.rating_count, u.phone as worker_phone,
                   ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at AS assignment_completed_at
            FROM jobs j 
            LEFT JOIN customer_sites cs ON cs.id=j.site_id
            LEFT JOIN job_assignments ja ON ja.job_id=j.id
            LEFT JOIN workers w ON w.id=ja.worker_id
            LEFT JOIN users u ON u.id=w.user_id
            WHERE j.id=$1
        """, job_row['id'])
        
        if customer_job:
            print("CUSTOMER PORTAL API RESPONSE:")
            print(f"  created_at: {customer_job['created_at']}")
            print(f"  scheduled_at: {customer_job['scheduled_at']}")
            print(f"  completed_at: {customer_job['completed_at']}")
            print(f"  assigned_at: {customer_job['assigned_at']}")
            print(f"  accepted_at: {customer_job['accepted_at']}")
            print(f"  started_at: {customer_job['started_at']}")
            print(f"  assignment_completed_at: {customer_job['assignment_completed_at']}")
            print()
        
        # Admin portal job detail
        admin_job = await conn.fetchrow("""
            SELECT j.*, c.full_name AS customer_name, c.company_name, u.phone AS customer_phone, u.email AS customer_email,
                   cs.site_name, cs.address_line, cs.city, cs.state, cs.postal_code, cs.latitude, cs.longitude,
                   cs.contact_name AS site_contact_name, cs.contact_phone AS site_contact_phone, cs.notes AS site_notes,
                   w.full_name AS worker_name, w.primary_trade, uw.phone AS worker_phone, uw.email AS worker_email,
                   w.rating_avg, w.rating_count, w.profile_photo_url,
                   ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at AS assignment_completed_at
            FROM jobs j 
            LEFT JOIN customers c ON c.id=j.customer_id 
            LEFT JOIN users u ON u.id=c.user_id
            LEFT JOIN customer_sites cs ON cs.id=j.site_id
            LEFT JOIN job_assignments ja ON ja.job_id=j.id
            LEFT JOIN workers w ON w.id=ja.worker_id
            LEFT JOIN users uw ON uw.id=w.user_id
            WHERE j.id=$1
        """, job_row['id'])
        
        if admin_job:
            print("ADMIN PORTAL API RESPONSE:")
            print(f"  created_at: {admin_job['created_at']}")
            print(f"  scheduled_at: {admin_job['scheduled_at']}")
            print(f"  completed_at: {admin_job['completed_at']}")
            print(f"  assigned_at: {admin_job['assigned_at']}")
            print(f"  accepted_at: {admin_job['accepted_at']}")
            print(f"  started_at: {admin_job['started_at']}")
            print(f"  assignment_completed_at: {admin_job['assignment_completed_at']}")
            print()
        
        # Worker portal job detail
        worker_job = await conn.fetchrow("""
            SELECT j.*, ja.assigned_at, ja.accepted_at, ja.started_at, ja.completed_at AS assignment_completed_at
            FROM jobs j 
            LEFT JOIN job_assignments ja ON ja.job_id=j.id
            WHERE j.id=$1
        """, job_row['id'])
        
        if worker_job:
            print("WORKER PORTAL API RESPONSE:")
            print(f"  created_at: {worker_job['created_at']}")
            print(f"  scheduled_at: {worker_job['scheduled_at']}")
            print(f"  completed_at: {worker_job['completed_at']}")
            print(f"  assigned_at: {worker_job['assigned_at']}")
            print(f"  accepted_at: {worker_job['accepted_at']}")
            print(f"  started_at: {worker_job['started_at']}")
            print(f"  assignment_completed_at: {worker_job['assignment_completed_at']}")
            print()
        
        # Verify consistency
        print("TIMESTAMP CONSISTENCY CHECK:")
        errors = []
        
        if customer_job and admin_job:
            if customer_job['created_at'] != admin_job['created_at']:
                errors.append(f"created_at mismatch: Customer={customer_job['created_at']}, Admin={admin_job['created_at']}")
            if customer_job['scheduled_at'] != admin_job['scheduled_at']:
                errors.append(f"scheduled_at mismatch: Customer={customer_job['scheduled_at']}, Admin={admin_job['scheduled_at']}")
            if customer_job['completed_at'] != admin_job['completed_at']:
                errors.append(f"completed_at mismatch: Customer={customer_job['completed_at']}, Admin={admin_job['completed_at']}")
            if customer_job['assigned_at'] != admin_job['assigned_at']:
                errors.append(f"assigned_at mismatch: Customer={customer_job['assigned_at']}, Admin={admin_job['assigned_at']}")
        
        if admin_job and worker_job:
            if admin_job['created_at'] != worker_job['created_at']:
                errors.append(f"created_at mismatch: Admin={admin_job['created_at']}, Worker={worker_job['created_at']}")
            if admin_job['scheduled_at'] != worker_job['scheduled_at']:
                errors.append(f"scheduled_at mismatch: Admin={admin_job['scheduled_at']}, Worker={worker_job['scheduled_at']}")
            if admin_job['completed_at'] != worker_job['completed_at']:
                errors.append(f"completed_at mismatch: Admin={admin_job['completed_at']}, Worker={worker_job['completed_at']}")
            if admin_job['assigned_at'] != worker_job['assigned_at']:
                errors.append(f"assigned_at mismatch: Admin={admin_job['assigned_at']}, Worker={worker_job['assigned_at']}")
        
        if errors:
            print("X CONSISTENCY ERRORS FOUND:")
            for error in errors:
                print(f"  - {error}")
        else:
            print("OK ALL TIMESTAMPS ARE CONSISTENT ACROSS PORTALS")
        
        print(f"\n{'='*60}\n")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(test_timestamp_consistency())