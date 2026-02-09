-- Seed default viewpoint bundles for each workspace (industry perspectives)
-- Inserts one row per (workspace_id, slug) for standard viewpoints
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'CEO', 'ceo', 'Executive and business impact perspective', 1 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'CISO', 'ciso', 'Chief Information Security Officer lens', 2 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'CTO', 'cto', 'Technology leadership and architecture', 3 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'COO', 'coo', 'Operations and process impact', 4 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'CFO', 'cfo', 'Financial and risk cost perspective', 5 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'Engineer', 'engineer', 'Build and implementation view', 6 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'Scientist', 'scientist', 'Research and evidence-based angle', 7 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'Student', 'student', 'Learning and education focus', 8 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
SELECT w.id, 'Researcher', 'researcher', 'Deep-dive and analysis perspective', 9 FROM workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
