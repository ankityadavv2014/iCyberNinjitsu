import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

const bundleCols = 'id, workspace_id, name, slug, description, sort_order, goal, tone, constraints, supported_platforms, created_at';

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows } = await query<{ id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; goal: string | null; tone: string | null; constraints: unknown; supported_platforms: unknown; created_at: Date }>(
    `SELECT ${bundleCols} FROM topic_bundles WHERE workspace_id = $1 ORDER BY sort_order, name`,
    [wId]
  );
  res.json({
    items: rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      sortOrder: r.sort_order,
      goal: r.goal ?? undefined,
      tone: r.tone ?? undefined,
      constraints: r.constraints ?? {},
      supportedPlatforms: Array.isArray(r.supported_platforms) ? r.supported_platforms : (r.supported_platforms ? [r.supported_platforms] : ['linkedin']),
      createdAt: r.created_at,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { name, slug, description, sortOrder, goal, tone, constraints, supportedPlatforms } = req.body ?? {};
  const safeSlug = (slug ?? (name && String(name).toLowerCase().replace(/\s+/g, '_')) ?? '').trim();
  if (!name || !safeSlug) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'name and slug required' });
    return;
  }
  const platforms = Array.isArray(supportedPlatforms) ? supportedPlatforms : ['linkedin'];
  const { rows } = await query(
    `INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order, goal, tone, constraints, supported_platforms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (workspace_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, goal = EXCLUDED.goal, tone = EXCLUDED.tone, constraints = EXCLUDED.constraints, supported_platforms = EXCLUDED.supported_platforms
     RETURNING ${bundleCols}`,
    [wId, name.trim(), safeSlug, description?.trim() ?? null, sortOrder != null ? Number(sortOrder) : 0, goal?.trim() ?? null, tone?.trim() ?? null, constraints ? JSON.stringify(constraints) : '{}', JSON.stringify(platforms)]
  );
  const r = rows[0] as { id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; goal: string | null; tone: string | null; constraints: unknown; supported_platforms: unknown; created_at: Date };
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sort_order, goal: r.goal ?? undefined, tone: r.tone ?? undefined, constraints: r.constraints ?? {}, supportedPlatforms: Array.isArray(r.supported_platforms) ? r.supported_platforms : ['linkedin'], createdAt: r.created_at });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query<{ id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; goal: string | null; tone: string | null; constraints: unknown; supported_platforms: unknown; created_at: Date }>(
    `SELECT ${bundleCols} FROM topic_bundles WHERE id = $1 AND workspace_id = $2`,
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sort_order, goal: r.goal ?? undefined, tone: r.tone ?? undefined, constraints: r.constraints ?? {}, supportedPlatforms: Array.isArray(r.supported_platforms) ? r.supported_platforms : ['linkedin'], createdAt: r.created_at });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, slug, description, sortOrder, goal, tone, constraints, supportedPlatforms } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof name === 'string' && name.trim()) { updates.push(`name = $${i++}`); values.push(name.trim()); }
  if (typeof slug === 'string' && slug.trim()) { updates.push(`slug = $${i++}`); values.push(slug.trim()); }
  if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description?.trim() ?? null); }
  if (sortOrder != null) { updates.push(`sort_order = $${i++}`); values.push(Number(sortOrder)); }
  if (goal !== undefined) { updates.push(`goal = $${i++}`); values.push(goal?.trim() ?? null); }
  if (tone !== undefined) { updates.push(`tone = $${i++}`); values.push(tone?.trim() ?? null); }
  if (constraints !== undefined) { updates.push(`constraints = $${i++}`); values.push(JSON.stringify(constraints)); }
  if (supportedPlatforms !== undefined) { updates.push(`supported_platforms = $${i++}`); values.push(JSON.stringify(Array.isArray(supportedPlatforms) ? supportedPlatforms : [supportedPlatforms])); }
  if (updates.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query(
    `UPDATE topic_bundles SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING ${bundleCols}`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as { id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; goal: string | null; tone: string | null; constraints: unknown; supported_platforms: unknown; created_at: Date };
  res.json({ id: r.id, workspaceId: r.workspace_id, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sort_order, goal: r.goal ?? undefined, tone: r.tone ?? undefined, constraints: r.constraints ?? {}, supportedPlatforms: Array.isArray(r.supported_platforms) ? r.supported_platforms : ['linkedin'], createdAt: r.created_at });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM topic_bundles WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
