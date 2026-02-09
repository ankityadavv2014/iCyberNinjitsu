-- Fail-safe: approved posts that failed publish (e.g. DUPLICATE_POST) are excluded from auto/schedule and sent back to review
ALTER TABLE approved_posts ADD COLUMN IF NOT EXISTS publish_failed_at TIMESTAMPTZ;
ALTER TABLE approved_posts ADD COLUMN IF NOT EXISTS publish_failed_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_approved_posts_publish_failed ON approved_posts (publish_failed_at) WHERE publish_failed_at IS NOT NULL;
