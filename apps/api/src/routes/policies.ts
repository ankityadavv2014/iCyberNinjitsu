import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, workspace_id, kind, config FROM policy_rules WHERE workspace_id = $1 ORDER BY kind',
    [req.workspaceId]
  );
  res.json({
    items: rows.map((r) => ({
      id: (r as any).id,
      workspaceId: (r as any).workspace_id,
      kind: (r as any).kind,
      config: (r as any).config,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { kind, config } = req.body ?? {};
  if (!kind || !['brand_voice', 'citation', 'safety', 'throttle'].includes(kind)) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'kind required (brand_voice|citation|safety|throttle)' });
    return;
  }
  const { rows } = await query(
    'INSERT INTO policy_rules (workspace_id, kind, config) VALUES ($1, $2, $3) RETURNING id, workspace_id, kind, config',
    [req.workspaceId, kind, config ?? {}]
  );
  const r = rows[0] as { id: string; workspace_id: string; kind: string; config: unknown };
  res.status(201).json({ id: r.id, workspaceId: r.workspace_id, kind: r.kind, config: r.config });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, workspace_id, kind, config FROM policy_rules WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as { id: string; workspace_id: string; kind: string; config: unknown };
  res.json({ id: r.id, workspaceId: r.workspace_id, kind: r.kind, config: r.config });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { config } = req.body ?? {};
  if (config === undefined) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  const { rows } = await query(
    'UPDATE policy_rules SET config = $1 WHERE id = $2 AND workspace_id = $3 RETURNING id, workspace_id, kind, config',
    [config, req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as { id: string; workspace_id: string; kind: string; config: unknown };
  res.json({ id: r.id, workspaceId: r.workspace_id, kind: r.kind, config: r.config });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM policy_rules WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
