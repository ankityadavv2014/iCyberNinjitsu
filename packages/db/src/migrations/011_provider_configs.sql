CREATE TABLE IF NOT EXISTS provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_config TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_configs_workspace ON provider_configs (workspace_id);
