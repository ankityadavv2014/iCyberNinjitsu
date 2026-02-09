import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const stage = req.query.stage as string | undefined;
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), 200);
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  let sql = `SELECT id, workspace_id, stage, trigger_type, reference_id, status, started_at, finished_at, error_message
    FROM job_runs WHERE workspace_id = $1`;
  const params: unknown[] = [wId];
  if (stage) { params.push(stage); sql += ` AND stage = $${params.length}`; }
  if (from) { params.push(from); sql += ` AND started_at >= $${params.length}`; }
  if (to) { params.push(to); sql += ` AND started_at <= $${params.length}`; }
  sql += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await query<{ id: string; workspace_id: string; stage: string; trigger_type: string; reference_id: string | null; status: string; started_at: Date; finished_at: Date | null; error_message: string | null }>(sql, params);
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      stage: r.stage,
      triggerType: r.trigger_type,
      referenceId: r.reference_id,
      status: r.status,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      errorMessage: r.error_message,
    })),
  });
}));
