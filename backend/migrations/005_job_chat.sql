-- Job Chat System - Customer ↔ Worker direct communication
-- This migration adds tables for job-specific conversations between assigned workers and customers

-- Job conversations: one conversation per assigned job
CREATE TABLE IF NOT EXISTS job_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job messages: messages within a conversation
CREATE TABLE IF NOT EXISTS job_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES job_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT job_messages_sender_role_check CHECK (sender_role IN ('CUSTOMER','WORKER'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_job_conversations_job ON job_conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_conversations_customer ON job_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_conversations_worker ON job_conversations(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_conversation ON job_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_job_messages_sender ON job_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_unread ON job_messages(conversation_id, read_at) WHERE read_at IS NULL;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS job_conversations_updated_at ON job_conversations;
CREATE TRIGGER job_conversations_updated_at BEFORE UPDATE ON job_conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

