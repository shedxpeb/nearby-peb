-- Remove demo data created by seed_demo.py
-- This script removes ONLY development records and should NOT be run in production
-- unless you want to remove demo accounts

BEGIN;

-- Identify demo IDs first (for safety)
DO $$
DECLARE
    demo_worker_id UUID;
    demo_customer_id UUID;
    demo_user_worker_id UUID;
    demo_user_customer_id UUID;
    demo_site_id UUID;
BEGIN
    -- Get demo worker user ID
    SELECT id INTO demo_user_worker_id FROM users WHERE phone = '9876543210';
    
    -- Get demo worker ID
    SELECT id INTO demo_worker_id FROM workers WHERE user_id = demo_user_worker_id;
    
    -- Get demo customer user ID
    SELECT id INTO demo_user_customer_id FROM users WHERE phone = '9825044321';
    
    -- Get demo customer ID
    SELECT id INTO demo_customer_id FROM customers WHERE user_id = demo_user_customer_id;
    
    -- Get demo site ID
    SELECT id INTO demo_site_id FROM customer_sites WHERE customer_id = demo_customer_id AND site_name = 'ABC Manufacturing Plant';
    
    -- Delete demo job records (must be first due to foreign keys)
    DELETE FROM job_status_history WHERE job_id IN (SELECT id FROM jobs WHERE customer_id = demo_customer_id AND job_number LIKE 'SDX-J-10%');
    DELETE FROM job_attachments WHERE job_id IN (SELECT id FROM jobs WHERE customer_id = demo_customer_id AND job_number LIKE 'SDX-J-10%');
    DELETE FROM job_requests WHERE job_id IN (SELECT id FROM jobs WHERE customer_id = demo_customer_id AND job_number LIKE 'SDX-J-10%');
    DELETE FROM job_assignments WHERE job_id IN (SELECT id FROM jobs WHERE customer_id = demo_customer_id AND job_number LIKE 'SDX-J-10%');
    DELETE FROM notifications WHERE entity_type = 'JOB' AND entity_id IN (SELECT id FROM jobs WHERE customer_id = demo_customer_id AND job_number LIKE 'SDX-J-10%');
    DELETE FROM jobs WHERE customer_id = demo_customer_id AND job_number LIKE 'SDX-J-10%';
    
    -- Delete demo worker records
    DELETE FROM worker_availability WHERE worker_id = demo_worker_id;
    DELETE FROM worker_service_areas WHERE worker_id = demo_worker_id;
    DELETE FROM worker_skills WHERE worker_id = demo_worker_id;
    DELETE FROM job_assignments WHERE worker_id = demo_worker_id;
    DELETE FROM job_requests WHERE worker_id = demo_worker_id;
    DELETE FROM notifications WHERE worker_id = demo_worker_id;
    DELETE FROM workers WHERE id = demo_worker_id;
    DELETE FROM users WHERE id = demo_user_worker_id;
    
    -- Delete demo customer records
    DELETE FROM customer_sites WHERE id = demo_site_id;
    DELETE FROM notifications WHERE customer_id = demo_customer_id;
    DELETE FROM customers WHERE id = demo_customer_id;
    DELETE FROM users WHERE id = demo_user_customer_id;
    
    RAISE NOTICE 'Demo data removed successfully';
END $$;

COMMIT;

-- Verification query (run separately to check if demo data still exists)
-- SELECT 'Users' as table_name, COUNT(*) FROM users WHERE phone IN ('9876543210', '9825044321')
-- UNION ALL
-- SELECT 'Workers', COUNT(*) FROM workers WHERE full_name = 'Vikas Patel'
-- UNION ALL
-- SELECT 'Customers', COUNT(*) FROM customers WHERE company_name = 'ABC Manufacturing'
-- UNION ALL
-- SELECT 'Jobs', COUNT(*) FROM jobs WHERE job_number LIKE 'SDX-J-10%';
