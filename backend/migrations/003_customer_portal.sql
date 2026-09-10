-- Customer Portal additions. Additive only: no existing table is recreated.
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(160) NOT NULL, profile_photo_url TEXT, company_name VARCHAR(180), contact_person VARCHAR(160),
  preferred_communication VARCHAR(30) NOT NULL DEFAULT 'CALL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ,
  CONSTRAINT customers_comm_check CHECK (preferred_communication IN ('CALL','WHATSAPP','EMAIL'))
);

CREATE TABLE IF NOT EXISTS customer_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  site_name VARCHAR(180) NOT NULL, address_line TEXT, city VARCHAR(120), state VARCHAR(120), postal_code VARCHAR(20),
  latitude NUMERIC(9,6), longitude NUMERIC(9,6), contact_name VARCHAR(160), contact_phone VARCHAR(32), notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer-uploaded problem photos attached to a service request.
CREATE TABLE IF NOT EXISTS job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, caption TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ownership registry for Emergent Object Storage uploads (never probe storage to verify existence).
CREATE TABLE IF NOT EXISTS storage_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE, content_type VARCHAR(120), size_bytes INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES customer_sites(id) ON DELETE SET NULL;

ALTER TABLE notifications ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'NEW_JOB_REQUEST','JOB_ACCEPTED','CUSTOMER_MESSAGE','PAYMENT_RECEIVED','JOB_COMPLETED','NEW_OFFER','SYSTEM',
  'REQUEST_CREATED','WORKER_ASSIGNED','WORKER_ACCEPTED','WORKER_EN_ROUTE','WORKER_ARRIVED','WORK_STARTED','WORK_COMPLETED','CONFIRMATION_REQUIRED'
));

ALTER TABLE support_tickets ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_sites_customer ON customer_sites(customer_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_notifications_customer_read ON notifications(customer_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_customer_status ON support_tickets(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_job_attachments_job ON job_attachments(job_id);

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS customer_sites_updated_at ON customer_sites;
CREATE TRIGGER customer_sites_updated_at BEFORE UPDATE ON customer_sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
