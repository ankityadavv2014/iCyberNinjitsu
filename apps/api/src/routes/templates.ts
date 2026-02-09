import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, workspace_id, name, post_type, body, variables, created_at FROM prompt_templates WHERE workspace_id = $1 ORDER BY created_at',
    [req.workspaceId]
  );
  res.json({
    items: rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      postType: r.post_type,
      body: r.body,
      variables: r.variables,
      createdAt: r.created_at,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, post_type, body, variables } = req.body ?? {};
  if (!name || !post_type || !body) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'name, post_type, body required' });
    return;
  }
  const { rows } = await query(
    'INSERT INTO prompt_templates (workspace_id, name, post_type, body, variables) VALUES ($1, $2, $3, $4, $5) RETURNING id, workspace_id, name, post_type, body, variables, created_at',
    [req.workspaceId, name, post_type, body, variables ?? []]
  );
  const r = rows[0] as { id: string; workspace_id: string; name: string; post_type: string; body: string; variables: unknown; created_at: Date };
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, name: r.name, postType: r.post_type, body: r.body, variables: r.variables, createdAt: r.created_at });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, workspace_id, name, post_type, body, variables, created_at FROM prompt_templates WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as { id: string; workspace_id: string; name: string; post_type: string; body: string; variables: unknown; created_at: Date };
  res.json({ id: r.id, workspaceId: r.workspace_id, name: r.name, postType: r.post_type, body: r.body, variables: r.variables, createdAt: r.created_at });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, body, variables } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
  if (body !== undefined) { updates.push(`body = $${i++}`); values.push(body); }
  if (variables !== undefined) { updates.push(`variables = $${i++}`); values.push(variables); }
  if (updates.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query(
    `UPDATE prompt_templates SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING id, workspace_id, name, post_type, body, variables, created_at`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as { id: string; workspace_id: string; name: string; post_type: string; body: string; variables: unknown; created_at: Date };
  res.json({ id: r.id, workspaceId: r.workspace_id, name: r.name, postType: r.post_type, body: r.body, variables: r.variables, createdAt: r.created_at });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM prompt_templates WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
