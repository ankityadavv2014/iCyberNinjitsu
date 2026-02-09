-- Topic bundles (viewpoints: CEO, CISO, CTO, etc.) for grouping topics by audience
CREATE TABLE IF NOT EXISTS topic_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_topic_bundles_workspace ON topic_bundles(workspace_id);

ALTER TABLE topics ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES topic_bundles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_topics_bundle_id ON topics(bundle_id);

-- Extend source types for Reddit, Quora, X/Twitter, LinkedIn
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_type_check CHECK (
  type IN ('rss', 'url', 'trend_provider', 'reddit', 'quora', 'twitter', 'linkedin')
);

-- Source approval: pending sources are in the pool until approved (only approved are ingested)
ALTER TABLE sources ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_status_check;
ALTER TABLE sources ADD CONSTRAINT sources_status_check CHECK (status IN ('pending', 'approved'));

CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(workspace_id, status);
