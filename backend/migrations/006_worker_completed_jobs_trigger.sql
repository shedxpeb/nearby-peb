-- Add trigger to automatically update workers.completed_jobs_count when job_assignments.completed_at changes
-- This ensures the completed_jobs_count column stays in sync with actual job completions

CREATE OR REPLACE FUNCTION update_worker_completed_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL) THEN
    -- Job was marked as completed, increment count
    UPDATE workers 
    SET completed_jobs_count = (
      SELECT COUNT(*) 
      FROM job_assignments 
      WHERE worker_id = NEW.worker_id AND completed_at IS NOT NULL
    )
    WHERE id = NEW.worker_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.completed_at IS NULL AND OLD.completed_at IS NOT NULL THEN
    -- Job was un-marked as completed (rare but possible), recalculate count
    UPDATE workers 
    SET completed_jobs_count = (
      SELECT COUNT(*) 
      FROM job_assignments 
      WHERE worker_id = NEW.worker_id AND completed_at IS NOT NULL
    )
    WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_completed_jobs ON job_assignments;

CREATE TRIGGER trigger_update_completed_jobs
AFTER INSERT OR UPDATE OF completed_at ON job_assignments
FOR EACH ROW EXECUTE FUNCTION update_worker_completed_jobs();

-- Recalculate all existing completed_jobs_count values to fix any stale data
UPDATE workers 
SET completed_jobs_count = (
  SELECT COUNT(*) 
  FROM job_assignments 
  WHERE job_assignments.worker_id = workers.id AND completed_at IS NOT NULL
)
WHERE deleted_at IS NULL;