-- Pipeline run records for observability (ingest, rank, generate, schedule, publish)
CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('ingest', 'rank', 'generate', 'schedule', 'publish')),
  trigger_type TEXT NOT NULL DEFAULT 'api' CHECK (trigger_type IN ('manual', 'cron', 'api')),
  reference_id VARCHAR(255),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_job_runs_workspace_stage_started ON job_runs (workspace_id, stage, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_reference ON job_runs (reference_id);
