import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { getGenerateQueue } from '../queues/generate.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const status = (req.query.status as string) || 'pending';
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  if (!['pending', 'generated', 'ignored'].includes(status)) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'status must be pending, generated, or ignored' });
    return;
  }
  const { rows } = await query<{
    id: string; workspace_id: string; topic_id: string; momentum_snapshot: unknown; triggered_at: Date; status: string; created_at: Date;
    label: string; hot_score: number;
  }>(
    `SELECT aq.id, aq.workspace_id, aq.topic_id, aq.momentum_snapshot, aq.triggered_at, aq.status, aq.created_at,
        tc.label, tm.hot_score
     FROM action_queue aq
     JOIN topic_clusters tc ON tc.id = aq.topic_id
     LEFT JOIN topic_momentum tm ON tm.topic_id = aq.topic_id
     WHERE aq.workspace_id = $1 AND aq.status = $2
     ORDER BY aq.triggered_at DESC
     LIMIT $3`,
    [wId, status, limit]
  );
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      topicId: r.topic_id,
      topicLabel: r.label,
      hotScore: r.hot_score != null ? Number(r.hot_score) : 0,
      momentumSnapshot: r.momentum_snapshot ?? {},
      triggeredAt: r.triggered_at,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
}));

router.post('/:id/generate', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const viewpointId = req.body?.viewpoint_id as string | undefined;
  const { rows: aq } = await query<{ id: string; topic_id: string; status: string }>(
    'SELECT id, topic_id, status FROM action_queue WHERE id = $1 AND workspace_id = $2',
    [req.params.id, wId]
  );
  if (aq.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  if (aq[0].status !== 'pending') {
    res.status(422).json({ code: 'ALREADY_PROCESSED', message: 'Action already generated or ignored' });
    return;
  }
  const topicId = aq[0].topic_id;
  const { rows: trend } = await query<{ id: string }>(
    'SELECT id FROM trend_items WHERE topic_cluster_id = $1 AND workspace_id = $2 ORDER BY fetched_at DESC LIMIT 1',
    [topicId, wId]
  );
  const genQueue = getGenerateQueue();
  if (trend.length > 0) {
    await genQueue.add('generate', { workspaceId: wId, trendItemId: trend[0].id, viewpointId });
  } else {
    await genQueue.add('generate', { workspaceId: wId, viewpointId });
  }
  await query("UPDATE action_queue SET status = 'generated' WHERE id = $1 AND workspace_id = $2", [req.params.id, wId]);
  res.status(202).json({ message: 'Generate job queued', topicId, trendItemId: trend[0]?.id ?? null });
}));

router.post('/:id/ignore', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rowCount } = await query(
    "UPDATE action_queue SET status = 'ignored' WHERE id = $1 AND workspace_id = $2 AND status = 'pending'",
    [req.params.id, wId]
  );
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.json({ message: 'Ignored' });
}));
