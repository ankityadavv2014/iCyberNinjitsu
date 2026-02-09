import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const bundleId = req.query.bundleId as string | undefined;
  let sql = 'SELECT id, workspace_id, keyword, weight, bundle_id, created_at FROM topics WHERE workspace_id = $1';
  const params: unknown[] = [wId];
  if (bundleId) { sql += ' AND bundle_id = $2'; params.push(bundleId); }
  sql += ' ORDER BY created_at';
  const { rows } = await query<{ id: string; workspace_id: string; keyword: string; weight: number; bundle_id: string | null; created_at: Date }>(sql, params);
  res.json({
    items: rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      keyword: r.keyword,
      weight: Number(r.weight),
      bundleId: r.bundle_id,
      createdAt: r.created_at,
    })),
  });
}));

/** Pin a trend item as a topic (creates a topic with keyword from trend title or provided). */
router.post('/from-trend', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { trendItemId, keyword, weight, bundleId } = req.body ?? {};
  if (!trendItemId || typeof trendItemId !== 'string') {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'trendItemId required' });
    return;
  }
  const { rows: trend } = await query<{ title: string }>(
    'SELECT title FROM trend_items WHERE id = $1 AND workspace_id = $2',
    [trendItemId, wId]
  );
  if (trend.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Trend item not found' });
    return;
  }
  const kw = (typeof keyword === 'string' && keyword.trim()) ? keyword.trim() : trend[0].title.slice(0, 100).trim() || 'trend';
  const { rows } = await query<{ id: string; workspace_id: string; keyword: string; weight: number; bundle_id: string | null; created_at: Date }>(
    'INSERT INTO topics (workspace_id, keyword, weight, bundle_id) VALUES ($1, $2, $3, $4) RETURNING id, workspace_id, keyword, weight, bundle_id, created_at',
    [wId, kw, weight != null ? Number(weight) : 1, bundleId || null]
  );
  const r = rows[0];
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, keyword: r.keyword, weight: Number(r.weight), bundleId: r.bundle_id, createdAt: r.created_at });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { keyword, weight, bundleId } = req.body ?? {};
  if (!keyword || typeof keyword !== 'string') {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'Invalid keyword' });
    return;
  }
  const { rows } = await query<{ id: string; workspace_id: string; keyword: string; weight: number; bundle_id: string | null; created_at: Date }>(
    'INSERT INTO topics (workspace_id, keyword, weight, bundle_id) VALUES ($1, $2, $3, $4) RETURNING id, workspace_id, keyword, weight, bundle_id, created_at',
    [wId, keyword.trim(), weight != null ? Number(weight) : 1, bundleId || null]
  );
  const r = rows[0];
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, keyword: r.keyword, weight: Number(r.weight), bundleId: r.bundle_id, createdAt: r.created_at });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query<{ id: string; workspace_id: string; keyword: string; weight: number; bundle_id: string | null; created_at: Date }>(
    'SELECT id, workspace_id, keyword, weight, bundle_id, created_at FROM topics WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, keyword: r.keyword, weight: Number(r.weight), bundleId: r.bundle_id, createdAt: r.created_at });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { keyword, weight, bundleId } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof keyword === 'string' && keyword.length > 0) { updates.push(`keyword = $${i++}`); values.push(keyword.trim()); }
  if (weight != null) { updates.push(`weight = $${i++}`); values.push(Number(weight)); }
  if (bundleId !== undefined) { updates.push(`bundle_id = $${i++}`); values.push(bundleId || null); }
  if (updates.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query<{ id: string; workspace_id: string; keyword: string; weight: number; bundle_id: string | null; created_at: Date }>(
    `UPDATE topics SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING id, workspace_id, keyword, weight, bundle_id, created_at`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, keyword: r.keyword, weight: Number(r.weight), bundleId: r.bundle_id, createdAt: r.created_at });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM topics WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
