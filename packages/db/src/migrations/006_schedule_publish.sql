CREATE TABLE IF NOT EXISTS schedule_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approved_post_id UUID NOT NULL REFERENCES approved_posts (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  job_id VARCHAR(255),
  attempts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_jobs_approved_post_id ON schedule_jobs (approved_post_id);
CREATE INDEX IF NOT EXISTS idx_schedule_jobs_status ON schedule_jobs (status);
CREATE INDEX IF NOT EXISTS idx_schedule_jobs_job_id ON schedule_jobs (job_id);

CREATE TABLE IF NOT EXISTS publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_job_id UUID NOT NULL REFERENCES schedule_jobs (id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  response_status INT,
  response_body TEXT,
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_attempts_schedule_job_id ON publish_attempts (schedule_job_id);
CREATE INDEX IF NOT EXISTS idx_publish_attempts_attempted_at ON publish_attempts (attempted_at);

ALTER TABLE approved_posts ADD CONSTRAINT fk_approved_posts_schedule_job FOREIGN KEY (schedule_job_id) REFERENCES schedule_jobs (id) ON DELETE SET NULL;
