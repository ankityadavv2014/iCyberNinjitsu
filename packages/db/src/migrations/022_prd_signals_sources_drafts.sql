-- Phase 1 PRD: Signals (trend_items), Sources + Trust, Draft columns
-- tenant_id = workspace_id everywhere (documented in codebase)

-- Signals: add PRD fields to trend_items
ALTER TABLE trend_items ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE trend_items ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE trend_items ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE trend_items ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE trend_items ADD COLUMN IF NOT EXISTS engagement_metrics JSONB;

-- SourceTrustProfile (new table)
CREATE TABLE IF NOT EXISTS source_trust_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL UNIQUE REFERENCES sources (id) ON DELETE CASCADE,
  credibility_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (credibility_score >= 0 AND credibility_score <= 1),
  historical_accuracy NUMERIC,
  bias_vector JSONB,
  latency_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_source_trust_profiles_source_id ON source_trust_profiles (source_id);

-- Sources: trust_profile_id and status active|candidate|disabled
ALTER TABLE sources ADD COLUMN IF NOT EXISTS trust_profile_id UUID REFERENCES source_trust_profiles (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sources_trust_profile_id ON sources (trust_profile_id);

-- Backfill: one trust profile per source with default credibility_score
INSERT INTO source_trust_profiles (source_id, credibility_score)
SELECT s.id, 0.5 FROM sources s
WHERE NOT EXISTS (SELECT 1 FROM source_trust_profiles stp WHERE stp.source_id = s.id);
UPDATE sources s SET trust_profile_id = (SELECT stp.id FROM source_trust_profiles stp WHERE stp.source_id = s.id)
WHERE trust_profile_id IS NULL;

-- Migrate sources.status: drop old constraint first, then set values, then add new constraint
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_status_check;
UPDATE sources SET status = 'active' WHERE status = 'approved' OR status IS NULL;
UPDATE sources SET status = 'candidate' WHERE status = 'pending';
ALTER TABLE sources ADD CONSTRAINT sources_status_check CHECK (status IN ('active', 'candidate', 'disabled'));

-- Draft: topic_id (nullable, FK added in Phase 2), platform, confidence_score, version
ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS topic_id UUID;
ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'linkedin';
ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;
ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
