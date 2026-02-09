-- Phase 3 PRD: ViewpointStrategy (extend topic_bundles), Action Queue

-- ViewpointStrategy: goal, tone, constraints, supported_platforms
ALTER TABLE topic_bundles ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE topic_bundles ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE topic_bundles ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '{}';
ALTER TABLE topic_bundles ADD COLUMN IF NOT EXISTS supported_platforms JSONB DEFAULT '["linkedin"]';

-- Action Queue: decisions triggered by momentum thresholds
CREATE TABLE IF NOT EXISTS action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topic_clusters (id) ON DELETE CASCADE,
  momentum_snapshot JSONB DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_action_queue_workspace_status ON action_queue (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_action_queue_triggered ON action_queue (triggered_at DESC);
