ALTER TABLE publish_attempts ADD COLUMN IF NOT EXISTS rolled_back BOOLEAN DEFAULT false;
ALTER TABLE publish_attempts ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ;
ALTER TABLE publish_attempts ADD COLUMN IF NOT EXISTS post_urn TEXT;
