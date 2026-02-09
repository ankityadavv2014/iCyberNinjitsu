-- Platform for each approved post (default linkedin for backward compatibility)
ALTER TABLE approved_posts ADD COLUMN IF NOT EXISTS platform VARCHAR(50) NOT NULL DEFAULT 'linkedin';
