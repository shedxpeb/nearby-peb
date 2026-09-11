-- Admin Portal additions - Add ASSIGNED status to jobs for admin assignments
-- This migration extends the existing system for Admin workflow

-- Update jobs status constraint to include ASSIGNED
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (
  'REQUESTED','OFFERED','ASSIGNED','ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS','PAUSED',
  'WAITING_CUSTOMER','COMPLETED','CANCELLED','DISPUTED'
));

-- Add admin-specific fields for tracking assignments
ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS assigned_by_admin UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Update notifications constraint to include admin assignment types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'NEW_JOB_REQUEST','JOB_ACCEPTED','CUSTOMER_MESSAGE','PAYMENT_RECEIVED','JOB_COMPLETED','NEW_OFFER','SYSTEM',
  'REQUEST_CREATED','WORKER_ASSIGNED','WORKER_ACCEPTED','WORKER_EN_ROUTE','WORKER_ARRIVED','WORK_STARTED','WORK_COMPLETED','CONFIRMATION_REQUIRED',
  'ADMIN_ASSIGNMENT','ADMIN_REASSIGNMENT'
));

-- Create index for admin assignment queries
CREATE INDEX IF NOT EXISTS idx_job_assignments_admin ON job_assignments(assigned_by_admin);
CREATE INDEX IF NOT EXISTS idx_jobs_admin_status ON jobs(status, created_at DESC) WHERE status IN ('REQUESTED','ASSIGNED');