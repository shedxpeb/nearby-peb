#!/usr/bin/env python3
"""
Inspect actual job statuses in the database to diagnose filtering issues.
Run this script to see the current status of all jobs in the database.
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
        # Check all job statuses with customer info
        print("\n" + "="*60)
        print("JOB STATUS BREAKDOWN WITH CUSTOMER INFO")
        print("="*60)

        jobs = await conn.fetch('''
            SELECT j.id, j.job_number, j.status, j.created_at, j.completed_at, j.cancelled_at,
                   c.company_name, u.phone as customer_phone
            FROM jobs j
            LEFT JOIN customers c ON c.id = j.customer_id
            LEFT JOIN users u ON u.id = c.user_id
            ORDER BY j.created_at DESC
        ''')

        print(f"\nTotal jobs: {len(jobs)}\n")

        # Group by status
        status_groups = {}
        for job in jobs:
            status = job['status']
            if status not in status_groups:
                status_groups[status] = []
            status_groups[status].append(job)

        # Display each status group
        for status in ['REQUESTED', 'OFFERED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'PAUSED', 'WAITING_CUSTOMER', 'COMPLETED', 'CANCELLED', 'DISPUTED']:
            if status in status_groups:
                count = len(status_groups[status])
                print(f"\n{status}: {count} job(s)")
                print("-" * 40)
                for job in status_groups[status]:
                    print(f"  {job['job_number']}: {job['status']}")
                    print(f"    Customer: {job['company_name'] or 'N/A'} ({job['customer_phone'] or 'N/A'})")
                    print(f"    Created: {job['created_at']}")
                    if job['completed_at']:
                        print(f"    Completed: {job['completed_at']}")
                    if job['cancelled_at']:
                        print(f"    Cancelled: {job['cancelled_at']}")

        # Check for unexpected statuses
        all_statuses = set(j['status'] for j in jobs)
        expected_statuses = {'REQUESTED', 'OFFERED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'PAUSED', 'WAITING_CUSTOMER', 'COMPLETED', 'CANCELLED', 'DISPUTED'}
        unexpected = all_statuses - expected_statuses
        if unexpected:
            print("\n" + "!"*60)
            print(f"WARNING: Found unexpected statuses: {unexpected}")
            print("!"*60)

        # Simulate what each tab would return
        print("\n" + "="*60)
        print("SIMULATED TAB FILTERING")
        print("="*60)

        active_statuses = ("REQUESTED", "OFFERED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "PAUSED", "WAITING_CUSTOMER")
        completed_statuses = ("COMPLETED",)
        cancelled_statuses = ("CANCELLED",)
        disputed_statuses = ("DISPUTED",)

        print(f"\nACTIVE tab would return: {sum(1 for j in jobs if j['status'] in active_statuses)} jobs")
        for job in jobs:
            if job['status'] in active_statuses:
                print(f"  {job['job_number']}: {job['status']} (Customer: {job['company_name'] or 'N/A'})")

        print(f"\nCOMPLETED tab would return: {sum(1 for j in jobs if j['status'] in completed_statuses)} jobs")
        for job in jobs:
            if job['status'] in completed_statuses:
                print(f"  {job['job_number']}: {job['status']} (Customer: {job['company_name'] or 'N/A'})")

        print(f"\nCANCELLED tab would return: {sum(1 for j in jobs if j['status'] in cancelled_statuses)} jobs")
        for job in jobs:
            if job['status'] in cancelled_statuses:
                print(f"  {job['job_number']}: {job['status']} (Customer: {job['company_name'] or 'N/A'})")

        print(f"\nDISPUTED tab would return: {sum(1 for j in jobs if j['status'] in disputed_statuses)} jobs")
        for job in jobs:
            if job['status'] in disputed_statuses:
                print(f"  {job['job_number']}: {job['status']} (Customer: {job['company_name'] or 'N/A'})")

    finally:
        await conn.close()
        print("\n" + "="*60)
        print("Inspection complete")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(inspect())
