import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { getGenerateQueue } from '../queues/generate.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

function mapDraft(r: { id: string; workspace_id: string; trend_item_id: string | null; content: string; post_type: string; template_id: string | null; status: string; created_by: string; created_at: Date; updated_at: Date }) {
  return { id: r.id, workspaceId: r.workspace_id, trendItemId: r.trend_item_id, content: r.content, postType: r.post_type, templateId: r.template_id, status: r.status, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at };
}

router.get('/', asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  let sql = `SELECT dp.id, dp.workspace_id, dp.trend_item_id, dp.content, dp.post_type, dp.template_id, dp.status, dp.created_by, dp.created_at, dp.updated_at,
    ap.publish_failed_reason
    FROM draft_posts dp
    LEFT JOIN approved_posts ap ON ap.draft_post_id = dp.id AND ap.publish_failed_at IS NOT NULL
    WHERE dp.workspace_id = $1`;
  const params: unknown[] = [req.workspaceId];
  if (status) { sql += ' AND dp.status = $2'; params.push(status); }
  sql += ' ORDER BY dp.created_at DESC';
  const { rows } = await query(sql, params);
  res.json({
    items: rows.map((r: { id: string; workspace_id: string; trend_item_id: string | null; content: string; post_type: string; template_id: string | null; status: string; created_by: string; created_at: Date; updated_at: Date; publish_failed_reason: string | null }) => ({
      ...mapDraft(r),
      publishFailedReason: r.publish_failed_reason ?? undefined,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { trend_item_id, post_type, template_id } = req.body ?? {};
  const content = (req.body?.content as string) ?? '';
  const { rows } = await query<{ id: string; workspace_id: string; trend_item_id: string | null; content: string; post_type: string; template_id: string | null; status: string; created_by: string; created_at: Date; updated_at: Date }>(
    `INSERT INTO draft_posts (workspace_id, trend_item_id, content, post_type, template_id, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6) RETURNING id, workspace_id, trend_item_id, content, post_type, template_id, status, created_by, created_at, updated_at`,
    [wId, trend_item_id ?? null, content, post_type ?? 'insight', template_id ?? null, req.userId]
  );
  const r = rows[0];
  res.status(201).json(mapDraft(r));
}));

router.post('/generate', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { trend_item_id, topic_ids, post_type } = req.body ?? {};
  const queue = getGenerateQueue();
  const job = await queue.add('generate', { workspaceId: wId, trendItemId: trend_item_id, topicIds: topic_ids, postType: post_type });
  res.status(202).json({ jobId: job.id });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, workspace_id, trend_item_id, content, post_type, template_id, status, created_by, created_at, updated_at FROM draft_posts WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.json(mapDraft(rows[0] as Parameters<typeof mapDraft>[0]));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { content, status } = req.body ?? {};
  const updates: string[] = ['updated_at = now()'];
  const values: unknown[] = [];
  let i = 1;
  if (typeof content === 'string') { updates.push(`content = $${i++}`); values.push(content); }
  if (status && ['draft', 'pending_review'].includes(status)) { updates.push(`status = $${i++}`); values.push(status); }
  if (values.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query(
    `UPDATE draft_posts SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING id, workspace_id, trend_item_id, content, post_type, template_id, status, created_by, created_at, updated_at`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.json(mapDraft(rows[0] as Parameters<typeof mapDraft>[0]));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM draft_posts WHERE id = $1 AND workspace_id = $2 AND status = $3', [req.params.id, req.workspaceId, 'draft']);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));

router.post('/:id/approve', asyncHandler(async (req, res) => {
  const scheduledFor = (req.body?.scheduled_for as string) ?? new Date(Date.now() + 86400000).toISOString();
  const { rows: draft } = await query(
    'SELECT id FROM draft_posts WHERE id = $1 AND workspace_id = $2 AND status IN ($3, $4)',
    [req.params.id, req.workspaceId, 'pending_review', 'approved']
  );
  if (draft.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }

  // Re-approval after publish failure: update existing approved_post instead of inserting
  const { rows: existing } = await query<{ id: string; draft_post_id: string; approved_by: string; approved_at: Date; scheduled_for: Date; schedule_job_id: string | null }>(
    'SELECT id, draft_post_id, approved_by, approved_at, scheduled_for, schedule_job_id FROM approved_posts WHERE draft_post_id = $1',
    [req.params.id]
  );

  if (existing.length > 0) {
    await query(
      'UPDATE approved_posts SET approved_at = now(), scheduled_for = $1, publish_failed_at = NULL, publish_failed_reason = NULL, schedule_job_id = NULL WHERE draft_post_id = $2',
      [scheduledFor, req.params.id]
    );
    const { rows: updated } = await query<{ id: string; draft_post_id: string; approved_by: string; approved_at: Date; scheduled_for: Date; schedule_job_id: string | null }>(
      'SELECT id, draft_post_id, approved_by, approved_at, scheduled_for, schedule_job_id FROM approved_posts WHERE draft_post_id = $1',
      [req.params.id]
    );
    await query('UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2', ['approved', req.params.id]);
    const r = updated[0];
    res.json({ id: r.id, draftPostId: r.draft_post_id, approvedBy: r.approved_by, approvedAt: r.approved_at, scheduledFor: r.scheduled_for, scheduleJobId: r.schedule_job_id });
    return;
  }

  const { rows } = await query<{ id: string; draft_post_id: string; approved_by: string; approved_at: Date; scheduled_for: Date; schedule_job_id: string | null }>(
    `INSERT INTO approved_posts (draft_post_id, approved_by, scheduled_for) VALUES ($1, $2, $3)
     RETURNING id, draft_post_id, approved_by, approved_at, scheduled_for, schedule_job_id`,
    [req.params.id, req.userId, scheduledFor]
  );
  await query('UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2', ['approved', req.params.id]);
  const r = rows[0];
  res.json({ id: r.id, draftPostId: r.draft_post_id, approvedBy: r.approved_by, approvedAt: r.approved_at, scheduledFor: r.scheduled_for, scheduleJobId: r.schedule_job_id });
}));

router.post('/:id/reject', asyncHandler(async (req, res) => {
  const { rowCount } = await query('UPDATE draft_posts SET status = $1 WHERE id = $2 AND workspace_id = $3', ['rejected', req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const { rows } = await query('SELECT id, workspace_id, trend_item_id, content, post_type, template_id, status, created_by, created_at, updated_at FROM draft_posts WHERE id = $1', [req.params.id]);
  res.json(mapDraft(rows[0] as Parameters<typeof mapDraft>[0]));
}));
