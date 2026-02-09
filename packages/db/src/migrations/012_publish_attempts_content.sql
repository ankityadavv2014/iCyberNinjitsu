ALTER TABLE publish_attempts ADD COLUMN IF NOT EXISTS posted_content TEXT;
ALTER TABLE publish_attempts ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'linkedin';
ALTER TABLE publish_attempts ADD COLUMN IF NOT EXISTS linkedin_post_url TEXT;
