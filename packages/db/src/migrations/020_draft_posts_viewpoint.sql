-- Viewpoint (topic_bundle) for each draft so generation can use CEO/CISO/etc. lens
ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS viewpoint_id UUID REFERENCES topic_bundles (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_draft_posts_viewpoint ON draft_posts (viewpoint_id);
