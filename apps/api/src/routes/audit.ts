import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const action = req.query.action as string | undefined;
  const resourceType = req.query.resourceType as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  let sql = 'SELECT id, workspace_id, actor_id, action, resource_type, resource_id, payload, created_at FROM audit_events WHERE workspace_id = $1';
  const params: unknown[] = [req.workspaceId];
  let i = 2;
  if (action) { sql += ` AND action = $${i++}`; params.push(action); }
  if (resourceType) { sql += ` AND resource_type = $${i++}`; params.push(resourceType); }
  if (from) { sql += ` AND created_at >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND created_at <= $${i++}`; params.push(to); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const { rows } = await query(sql, params);
  res.json({
    items: rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      actorId: r.actor_id,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      payload: r.payload,
      createdAt: r.created_at,
    })),
  });
}));
