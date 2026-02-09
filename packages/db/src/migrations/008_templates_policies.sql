CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  post_type VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_workspace_id ON prompt_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_workspace_post_type ON prompt_templates (workspace_id, post_type);

CREATE TABLE IF NOT EXISTS policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('brand_voice', 'citation', 'safety', 'throttle')),
  config JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_policy_rules_workspace_id ON policy_rules (workspace_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_workspace_kind ON policy_rules (workspace_id, kind);

ALTER TABLE draft_posts ADD CONSTRAINT fk_draft_posts_template FOREIGN KEY (template_id) REFERENCES prompt_templates (id) ON DELETE SET NULL;
