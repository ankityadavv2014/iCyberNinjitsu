import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember, requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query<{ id: string; name: string; owner_id: string; paused: boolean; created_at: Date; updated_at: Date }>(
    `SELECT w.id, w.name, w.owner_id, w.paused, w.created_at, w.updated_at
     FROM workspaces w
     INNER JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1 ORDER BY w.created_at DESC`,
    [req.userId]
  );
  res.json({
    items: rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      ownerId: r.owner_id,
      paused: r.paused,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const name = req.body?.name;
  if (!name || typeof name !== 'string' || name.length > 100) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'Invalid name' });
    return;
  }
  const { rows } = await query<{ id: string; name: string; owner_id: string; paused: boolean; created_at: Date; updated_at: Date }>(
    `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2)
     RETURNING id, name, owner_id, paused, created_at, updated_at`,
    [name.trim(), req.userId]
  );
  const r = rows[0];
  await query(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO NOTHING',
    [r.id, req.userId, 'owner']
  );
  res.status(201).json({
    id: r.id,
    name: r.name,
    ownerId: r.owner_id,
    paused: r.paused,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}));

router.get('/:id', requireWorkspaceMember, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { rows } = await query<{ id: string; name: string; owner_id: string; paused: boolean; created_at: Date; updated_at: Date }>(
    'SELECT id, name, owner_id, paused, created_at, updated_at FROM workspaces WHERE id = $1',
    [id]
  );
  if (rows.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND' });
    return;
  }
  const r = rows[0];
  res.json({
    id: r.id,
    name: r.name,
    ownerId: r.owner_id,
    paused: r.paused,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}));

router.patch('/:id', requireWorkspaceMember, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { name, paused } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof name === 'string' && name.length > 0 && name.length <= 100) {
    updates.push(`name = $${i++}`);
    values.push(name.trim());
  }
  if (typeof paused === 'boolean') {
    updates.push(`paused = $${i++}`);
    values.push(paused);
  }
  if (updates.length === 0) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'No valid updates' });
    return;
  }
  values.push(id);
  const { rows } = await query<{ id: string; name: string; owner_id: string; paused: boolean; created_at: Date; updated_at: Date }>(
    `UPDATE workspaces SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING id, name, owner_id, paused, created_at, updated_at`,
    values
  );
  if (rows.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND' });
    return;
  }
  const r = rows[0];
  res.json({
    id: r.id,
    name: r.name,
    ownerId: r.owner_id,
    paused: r.paused,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}));

router.delete('/:id', requireWorkspaceOwner, asyncHandler(async (req, res) => {
  await query('DELETE FROM workspaces WHERE id = $1', [req.params.id]);
  res.status(204).send();
}));
