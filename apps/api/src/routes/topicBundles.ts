import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows } = await query<{ id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; created_at: Date }>(
    'SELECT id, workspace_id, name, slug, description, sort_order, created_at FROM topic_bundles WHERE workspace_id = $1 ORDER BY sort_order, name',
    [wId]
  );
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { name, slug, description, sortOrder } = req.body ?? {};
  const safeSlug = (slug ?? (name && String(name).toLowerCase().replace(/\s+/g, '_')) ?? '').trim();
  if (!name || !safeSlug) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'name and slug required' });
    return;
  }
  const { rows } = await query<{ id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; created_at: Date }>(
    `INSERT INTO topic_bundles (workspace_id, name, slug, description, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (workspace_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
     RETURNING id, workspace_id, name, slug, description, sort_order, created_at`,
    [wId, name.trim(), safeSlug, description?.trim() ?? null, sortOrder != null ? Number(sortOrder) : 0]
  );
  const r = rows[0];
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sort_order, createdAt: r.created_at });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query<{ id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; created_at: Date }>(
    'SELECT id, workspace_id, name, slug, description, sort_order, created_at FROM topic_bundles WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sort_order, createdAt: r.created_at });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, slug, description, sortOrder } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof name === 'string' && name.trim()) { updates.push(`name = $${i++}`); values.push(name.trim()); }
  if (typeof slug === 'string' && slug.trim()) { updates.push(`slug = $${i++}`); values.push(slug.trim()); }
  if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description?.trim() ?? null); }
  if (sortOrder != null) { updates.push(`sort_order = $${i++}`); values.push(Number(sortOrder)); }
  if (updates.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query<{ id: string; workspace_id: string; name: string; slug: string; description: string | null; sort_order: number; created_at: Date }>(
    `UPDATE topic_bundles SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING id, workspace_id, name, slug, description, sort_order, created_at`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sort_order, createdAt: r.created_at });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM topic_bundles WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
