import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { getPublishQueue } from '../queues/publish.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const status = req.query.status as string | undefined;
  let sql = `SELECT sj.id, sj.approved_post_id, sj.status, sj.job_id, sj.attempts, sj.created_at, sj.updated_at
    FROM schedule_jobs sj
    JOIN approved_posts ap ON ap.id = sj.approved_post_id
    WHERE ap.id IN (SELECT id FROM approved_posts WHERE draft_post_id IN (SELECT id FROM draft_posts WHERE workspace_id = $1))`;
  const params: unknown[] = [wId];
  let i = 2;
  if (status) { sql += ` AND sj.status = $${i++}`; params.push(status); }
  sql += ' ORDER BY sj.created_at DESC LIMIT 100';
  const { rows } = await query(sql, params);
  res.json({
    items: rows.map((r: any) => ({
      id: r.id,
      approvedPostId: r.approved_post_id,
      status: r.status,
      jobId: r.job_id,
      attempts: r.attempts,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { approved_post_id, scheduled_for } = req.body ?? {};
  if (!approved_post_id || !scheduled_for) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'approved_post_id and scheduled_for required' });
    return;
  }
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (idempotencyKey) {
    const parts = idempotencyKey.split(':');
    const apId = parts[1];
    const sf = parts[2];
    if (apId === approved_post_id && sf === scheduled_for) {
      const { rows: existing } = await query<{ id: string }>(
        'SELECT sj.id FROM schedule_jobs sj JOIN approved_posts ap ON ap.id = sj.approved_post_id JOIN draft_posts dp ON dp.id = ap.draft_post_id WHERE dp.workspace_id = $1 AND ap.id = $2',
        [wId, approved_post_id]
      );
      if (existing.length > 0) { res.status(200).json({ id: existing[0].id, jobId: null }); return; }
    }
  }
  const { rows: ws } = await query<{ paused: boolean }>('SELECT paused FROM workspaces WHERE id = $1', [wId]);
  if (ws[0]?.paused) { res.status(403).json({ code: 'WORKSPACE_PAUSED' }); return; }
  const { rows } = await query<{ id: string }>(
    `INSERT INTO schedule_jobs (approved_post_id, status) VALUES ($1, 'queued') RETURNING id`,
    [approved_post_id]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const jobId = rows[0].id;
  await query('UPDATE approved_posts SET schedule_job_id = $1 WHERE id = $2', [jobId, approved_post_id]);
  const queue = getPublishQueue();
  const bullJob = await queue.add('publish', { scheduleJobId: jobId, approvedPostId: approved_post_id, workspaceId: wId }, { delay: Math.max(0, new Date(scheduled_for).getTime() - Date.now()) });
  await query('UPDATE schedule_jobs SET job_id = $1 WHERE id = $2', [bullJob.id, jobId]);
  res.status(201).json({ id: jobId, jobId: bullJob.id });
}));

// "Post Now" -- approve (if draft) and publish immediately with zero delay
router.post('/now', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const userId = req.userId!;
  const { draftId, approvedPostId } = req.body ?? {};

  if (!draftId && !approvedPostId) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'Provide draftId or approvedPostId' });
    return;
  }

  // Check workspace not paused
  const { rows: ws } = await query<{ paused: boolean }>('SELECT paused FROM workspaces WHERE id = $1', [wId]);
  if (ws[0]?.paused) { res.status(403).json({ code: 'WORKSPACE_PAUSED' }); return; }

  let apId = approvedPostId;

  if (draftId && !apId) {
    // Verify draft belongs to this workspace and is in an approvable state
    const { rows: draftRows } = await query<{ id: string; status: string }>(
      'SELECT id, status FROM draft_posts WHERE id = $1 AND workspace_id = $2',
      [draftId, wId]
    );
    if (draftRows.length === 0) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Draft not found' });
      return;
    }
    const draftStatus = draftRows[0].status;
    if (draftStatus === 'approved') {
      // Already approved -- find the approved_post
      const { rows: existingAp } = await query<{ id: string }>('SELECT id FROM approved_posts WHERE draft_post_id = $1', [draftId]);
      if (existingAp.length > 0) {
        apId = existingAp[0].id;
      }
    }

    if (!apId) {
      if (draftStatus !== 'pending_review' && draftStatus !== 'draft') {
        res.status(422).json({ code: 'INVALID_STATUS', message: `Cannot post draft with status "${draftStatus}"` });
        return;
      }
      // Auto-approve the draft
      await query('UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2', ['approved', draftId]);
      const { rows: apRows } = await query<{ id: string }>(
        `INSERT INTO approved_posts (draft_post_id, approved_by, approved_at, scheduled_for) VALUES ($1, $2, now(), now()) RETURNING id`,
        [draftId, userId]
      );
      apId = apRows[0].id;
    }
  }

  // Verify approved post belongs to workspace
  const { rows: apCheck } = await query<{ id: string }>(
    `SELECT ap.id FROM approved_posts ap JOIN draft_posts dp ON dp.id = ap.draft_post_id WHERE ap.id = $1 AND dp.workspace_id = $2`,
    [apId, wId]
  );
  if (apCheck.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Approved post not found' });
    return;
  }

  // Prevent duplicate publish: if this approved post already has a completed schedule job, do not create another
  const { rows: completedCheck } = await query<{ id: string }>(
    `SELECT sj.id FROM schedule_jobs sj WHERE sj.approved_post_id = $1 AND sj.status = 'completed' LIMIT 1`,
    [apId]
  );
  if (completedCheck.length > 0) {
    res.status(409).json({ code: 'ALREADY_PUBLISHED', message: 'This post has already been published.' });
    return;
  }

  // Create schedule job with immediate execution (delay 0)
  const { rows: sjRows } = await query<{ id: string }>(
    `INSERT INTO schedule_jobs (approved_post_id, status) VALUES ($1, 'queued') RETURNING id`,
    [apId]
  );
  const jobId = sjRows[0].id;
  await query('UPDATE approved_posts SET schedule_job_id = $1 WHERE id = $2', [jobId, apId]);

  const queue = getPublishQueue();
  const bullJob = await queue.add('publish', { scheduleJobId: jobId, approvedPostId: apId, workspaceId: wId }, { delay: 0 });
  await query('UPDATE schedule_jobs SET job_id = $1 WHERE id = $2', [bullJob.id, jobId]);

  res.status(201).json({ id: jobId, jobId: bullJob.id, approvedPostId: apId, message: 'Post queued for immediate publish' });
}));

router.delete('/:jobId', asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    'UPDATE schedule_jobs SET status = $1 WHERE id = $2 AND approved_post_id IN (SELECT ap.id FROM approved_posts ap JOIN draft_posts dp ON dp.id = ap.draft_post_id WHERE dp.workspace_id = $3)',
    ['cancelled', req.params.jobId, req.workspaceId]
  );
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));
