CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces (id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  payload JSONB,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created ON audit_events (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events (action);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource_type ON audit_events (resource_type);
