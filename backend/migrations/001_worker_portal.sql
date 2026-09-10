CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE, password_hash TEXT NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'WORKER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE, last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ,
  CONSTRAINT users_role_check CHECK (role IN ('WORKER','CUSTOMER','ADMIN'))
);
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(160) NOT NULL, profile_photo_url TEXT, date_of_birth DATE, gender VARCHAR(32), primary_trade VARCHAR(120),
  years_experience INTEGER CHECK (years_experience >= 0), previous_company VARCHAR(160), professional_bio TEXT,
  emergency_contact_name VARCHAR(160), emergency_contact_number VARCHAR(32), preferred_work_type VARCHAR(120), languages TEXT,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0, rating_count INTEGER NOT NULL DEFAULT 0, completed_jobs_count INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', availability_status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ,
  CONSTRAINT workers_status_check CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
  CONSTRAINT workers_availability_check CHECK (availability_status IN ('OFFLINE','ONLINE','BUSY'))
);
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(160) NOT NULL UNIQUE, category VARCHAR(100), is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS worker_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT, experience_years INTEGER CHECK (experience_years >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, skill_id)
);
CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(160) NOT NULL, city VARCHAR(120), state VARCHAR(120), country VARCHAR(120) DEFAULT 'India',
  latitude NUMERIC(9,6), longitude NUMERIC(9,6), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS worker_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  service_area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE, radius_km NUMERIC(6,2) NOT NULL DEFAULT 10 CHECK (radius_km > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(worker_id, service_area_id)
);
CREATE TABLE IF NOT EXISTS worker_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), start_time TIME NOT NULL, end_time TIME NOT NULL, is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(worker_id, day_of_week)
);
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_number VARCHAR(40) NOT NULL UNIQUE, title VARCHAR(180) NOT NULL, service_type VARCHAR(120) NOT NULL,
  description TEXT, problem_description TEXT, customer_name VARCHAR(160), company_name VARCHAR(180), customer_phone VARCHAR(32), customer_email VARCHAR(255),
  site_name VARCHAR(180), address_line TEXT, city VARCHAR(120), state VARCHAR(120), postal_code VARCHAR(20), latitude NUMERIC(9,6), longitude NUMERIC(9,6),
  scheduled_at TIMESTAMPTZ, estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0), estimated_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_payout NUMERIC(12,2), priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED', required_skill_id UUID REFERENCES skills(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
  CONSTRAINT jobs_priority_check CHECK (priority IN ('NORMAL','URGENT','HIGH')),
  CONSTRAINT jobs_status_check CHECK (status IN ('REQUESTED','OFFERED','ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS','PAUSED','WAITING_CUSTOMER','COMPLETED','CANCELLED','DISPUTED'))
);
CREATE TABLE IF NOT EXISTS job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  distance_km NUMERIC(8,2), estimated_payout NUMERIC(12,2), offer_expires_at TIMESTAMPTZ, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_requests_status_check CHECK (status IN ('PENDING','VIEWED','ACCEPTED','DECLINED','EXPIRED','CANCELLED')), UNIQUE(job_id, worker_id)
);
CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_at TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  old_status VARCHAR(30), new_status VARCHAR(30) NOT NULL, reason TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, title VARCHAR(180) NOT NULL, description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0, is_completed BOOLEAN NOT NULL DEFAULT FALSE, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS job_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, item VARCHAR(180) NOT NULL, category VARCHAR(80),
  is_required BOOLEAN NOT NULL DEFAULT TRUE, is_completed BOOLEAN NOT NULL DEFAULT FALSE, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(160) NOT NULL UNIQUE, code VARCHAR(60), unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  default_rate NUMERIC(12,2) NOT NULL DEFAULT 0, category VARCHAR(80), is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0), unit_rate NUMERIC(12,2) NOT NULL CHECK (unit_rate >= 0), total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS job_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL, description TEXT, amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0), receipt_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_expenses_category_check CHECK (category IN ('TRAVEL','TRANSPORT','TOOLS','MISCELLANEOUS'))
);
CREATE TABLE IF NOT EXISTS work_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL CHECK (progress_percent BETWEEN 0 AND 100), status VARCHAR(30) NOT NULL, current_task VARCHAR(180), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT work_progress_status_check CHECK (status IN ('INSPECTION','IN_PROGRESS','MATERIAL_REPLACEMENT','REPAIR_COMPLETED','FINAL_INSPECTION'))
);
CREATE TABLE IF NOT EXISTS work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  photo_type VARCHAR(20) NOT NULL, file_url TEXT NOT NULL, thumbnail_url TEXT, caption TEXT, uploaded_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT work_photos_type_check CHECK (photo_type IN ('BEFORE','DURING','AFTER'))
);
CREATE TABLE IF NOT EXISTS customer_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE, customer_name VARCHAR(160) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), signature_url TEXT, comments TEXT, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), review TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE, job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE RESTRICT,
  gross_amount NUMERIC(12,2) NOT NULL, expense_amount NUMERIC(12,2) NOT NULL DEFAULT 0, net_amount NUMERIC(12,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT earnings_status_check CHECK (status IN ('PENDING','AVAILABLE','PAID','REVERSED'))
);
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE, amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', payout_reference VARCHAR(120), processed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payouts_status_check CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE, type VARCHAR(30) NOT NULL, title VARCHAR(180) NOT NULL, message TEXT NOT NULL,
  entity_type VARCHAR(80), entity_id UUID, is_read BOOLEAN NOT NULL DEFAULT FALSE, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_type_check CHECK (type IN ('NEW_JOB_REQUEST','JOB_ACCEPTED','CUSTOMER_MESSAGE','PAYMENT_RECEIVED','JOB_COMPLETED','NEW_OFFER','SYSTEM'))
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ticket_number VARCHAR(40) NOT NULL UNIQUE, worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE, job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL, priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', subject VARCHAR(180) NOT NULL, description TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ,
  CONSTRAINT support_status_check CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')), CONSTRAINT support_priority_check CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT'))
);
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE, sender_type VARCHAR(20) NOT NULL, sender_id UUID, message TEXT NOT NULL, attachment_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), key VARCHAR(160) NOT NULL UNIQUE, value JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_requests_worker_status ON job_requests(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_job_requests_expiry ON job_requests(offer_expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_job_history_job_created ON job_status_history(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_worker_read ON notifications(worker_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_worker_status ON support_tickets(worker_id, status);

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['users','workers','skills','service_areas','worker_service_areas','worker_availability','jobs','job_requests','job_assignments','job_tasks','job_checklists','materials','job_materials','job_expenses','work_progress','work_photos','customer_confirmations','ratings','earnings','payouts','support_tickets','app_settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;