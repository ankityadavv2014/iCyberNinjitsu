-- Phase 2 PRD: TopicCluster (auto-generated), CorrelationEdge, TopicMomentum

-- TopicCluster: workspace_id, label, keywords (jsonb array), no embedding_vector in v1
CREATE TABLE IF NOT EXISTS topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_topic_clusters_workspace ON topic_clusters (workspace_id);

-- Link trend_items (signals) to a cluster for correlation/momentum
ALTER TABLE trend_items ADD COLUMN IF NOT EXISTS topic_cluster_id UUID REFERENCES topic_clusters (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trend_items_topic_cluster ON trend_items (topic_cluster_id);

-- Draft topic_id FK (topic_id added in 022)
ALTER TABLE draft_posts ADD CONSTRAINT fk_draft_posts_topic FOREIGN KEY (topic_id) REFERENCES topic_clusters (id) ON DELETE SET NULL;

-- CorrelationEdge: source <-> topic strength/frequency
CREATE TABLE IF NOT EXISTS correlation_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topic_clusters (id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  strength NUMERIC NOT NULL DEFAULT 0 CHECK (strength >= 0 AND strength <= 1),
  frequency INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, source_id)
);
CREATE INDEX IF NOT EXISTS idx_correlation_edges_topic ON correlation_edges (topic_id);
CREATE INDEX IF NOT EXISTS idx_correlation_edges_source ON correlation_edges (source_id);

-- TopicMomentum: one row per topic, upserted by momentum job
CREATE TABLE IF NOT EXISTS topic_momentum (
  topic_id UUID PRIMARY KEY REFERENCES topic_clusters (id) ON DELETE CASCADE,
  hot_score NUMERIC NOT NULL DEFAULT 0,
  velocity NUMERIC NOT NULL DEFAULT 0,
  acceleration NUMERIC NOT NULL DEFAULT 0,
  source_diversity NUMERIC NOT NULL DEFAULT 0,
  freshness NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_topic_momentum_computed ON topic_momentum (computed_at);

-- Allow momentum stage in job_runs
ALTER TABLE job_runs DROP CONSTRAINT IF EXISTS job_runs_stage_check;
ALTER TABLE job_runs ADD CONSTRAINT job_runs_stage_check CHECK (stage IN ('ingest', 'rank', 'generate', 'schedule', 'publish', 'momentum'));
