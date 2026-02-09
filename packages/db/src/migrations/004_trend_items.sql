CREATE TABLE IF NOT EXISTS trend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  external_id TEXT,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  score NUMERIC,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_items_workspace_url_hash ON trend_items (workspace_id, url_hash);
CREATE INDEX IF NOT EXISTS idx_trend_items_workspace_id ON trend_items (workspace_id);
CREATE INDEX IF NOT EXISTS idx_trend_items_source_id ON trend_items (source_id);
CREATE INDEX IF NOT EXISTS idx_trend_items_fetched_at ON trend_items (fetched_at);
