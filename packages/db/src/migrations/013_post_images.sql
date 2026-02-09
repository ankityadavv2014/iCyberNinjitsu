CREATE TABLE IF NOT EXISTS post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  draft_post_id UUID REFERENCES draft_posts(id) ON DELETE SET NULL,
  image_url TEXT,
  image_data BYTEA,
  generation_method TEXT NOT NULL DEFAULT 'template',
  prompt TEXT,
  width INTEGER DEFAULT 1200,
  height INTEGER DEFAULT 630,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_images_draft ON post_images(draft_post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_workspace ON post_images(workspace_id);
