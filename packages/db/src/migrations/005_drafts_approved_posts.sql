CREATE TABLE IF NOT EXISTS draft_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  trend_item_id UUID REFERENCES trend_items (id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  post_type VARCHAR(50) NOT NULL,
  template_id UUID,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_posts_workspace_status ON draft_posts (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_draft_posts_workspace_created ON draft_posts (workspace_id, created_at);

CREATE TABLE IF NOT EXISTS approved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_post_id UUID NOT NULL UNIQUE REFERENCES draft_posts (id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  schedule_job_id UUID
);

CREATE INDEX IF NOT EXISTS idx_approved_posts_schedule_job_id ON approved_posts (schedule_job_id);
CREATE INDEX IF NOT EXISTS idx_approved_posts_scheduled_for ON approved_posts (scheduled_for);
