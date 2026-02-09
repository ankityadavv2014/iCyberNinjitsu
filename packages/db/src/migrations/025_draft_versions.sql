-- Phase 4: Draft versioning for v1/v2/v3 and diff
CREATE TABLE IF NOT EXISTS draft_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_post_id UUID NOT NULL REFERENCES draft_posts (id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(draft_post_id, version)
);
CREATE INDEX IF NOT EXISTS idx_draft_versions_draft ON draft_versions (draft_post_id);
