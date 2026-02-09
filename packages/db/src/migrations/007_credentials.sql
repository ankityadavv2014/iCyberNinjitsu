CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'linkedin',
  encrypted_tokens TEXT,
  refresh_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_workspace_provider ON credentials (workspace_id, provider);
CREATE INDEX IF NOT EXISTS idx_credentials_workspace_id ON credentials (workspace_id);
