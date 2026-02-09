import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const statusFilter = req.query.status as string | undefined;
  let sql = 'SELECT id, workspace_id, type, config, enabled, status, created_at FROM sources WHERE workspace_id = $1';
  const params: unknown[] = [wId];
  if (statusFilter === 'pending') { sql += ' AND status = $2'; params.push('pending'); }
  else if (statusFilter === 'approved') { sql += ' AND (status = $2 OR status IS NULL)'; params.push('approved'); }
  sql += ' ORDER BY created_at';
  const { rows } = await query<{ id: string; workspace_id: string; type: string; config: unknown; enabled: boolean; status: string | null; created_at: Date }>(sql, params);
  res.json({ items: rows.map((r) => ({ id: r.id, workspaceId: r.workspace_id, type: r.type, config: r.config, enabled: r.enabled, status: r.status ?? 'approved', createdAt: r.created_at })) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { type, config, enabled } = req.body ?? {};
  const allowedTypes = ['rss', 'url', 'trend_provider', 'reddit', 'quora', 'twitter', 'linkedin'];
  if (!type || !allowedTypes.includes(type)) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'Invalid type. Allowed: ' + allowedTypes.join(', ') });
    return;
  }
  const status = (req.body?.status as string) === 'pending' ? 'pending' : 'approved';
  const { rows } = await query<{ id: string; workspace_id: string; type: string; config: unknown; enabled: boolean; status: string | null; created_at: Date }>(
    'INSERT INTO sources (workspace_id, type, config, enabled, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, workspace_id, type, config, enabled, status, created_at',
    [wId, type, config ?? {}, enabled !== false, status]
  );
  const r = rows[0];
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, type: r.type, config: r.config, enabled: r.enabled, status: r.status ?? 'approved', createdAt: r.created_at });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query<{ id: string; workspace_id: string; type: string; config: unknown; enabled: boolean; status: string | null; created_at: Date }>(
    'SELECT id, workspace_id, type, config, enabled, status, created_at FROM sources WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, type: r.type, config: r.config, enabled: r.enabled, status: r.status ?? 'approved', createdAt: r.created_at });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { config, enabled, status } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (config !== undefined) { updates.push(`config = $${i++}`); values.push(config); }
  if (typeof enabled === 'boolean') { updates.push(`enabled = $${i++}`); values.push(enabled); }
  if (status === 'pending' || status === 'approved') { updates.push(`status = $${i++}`); values.push(status); }
  if (updates.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query<{ id: string; workspace_id: string; type: string; config: unknown; enabled: boolean; status: string | null; created_at: Date }>(
    `UPDATE sources SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING id, workspace_id, type, config, enabled, status, created_at`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, type: r.type, config: r.config, enabled: r.enabled, status: r.status ?? 'approved', createdAt: r.created_at });
}));

router.post('/:id/approve', asyncHandler(async (req, res) => {
  const { rows } = await query<{ id: string; workspace_id: string; type: string; config: unknown; enabled: boolean; status: string | null; created_at: Date }>(
    `UPDATE sources SET status = 'approved' WHERE id = $1 AND workspace_id = $2 RETURNING id, workspace_id, type, config, enabled, status, created_at`,
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0];
  res.json({ id: r.id, workspaceId: r.workspace_id, type: r.type, config: r.config, enabled: r.enabled, status: r.status ?? 'approved', createdAt: r.created_at });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM sources WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
