CREATE TABLE IF NOT EXISTS auto_schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces (id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  posts_per_day INTEGER NOT NULL DEFAULT 1,
  preferred_times TEXT[] NOT NULL DEFAULT '{"09:00"}',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_schedule_settings_workspace ON auto_schedule_settings (workspace_id);
