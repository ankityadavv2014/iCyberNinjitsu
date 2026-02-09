import { Router } from 'express';
import { query } from 'db';
import { createLinkedInClient, decryptTokens } from 'linkedin';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

/** Duplicates: same approved_post_id with multiple successful, not-rolled-back attempts. Keep oldest; the rest are "duplicate" for rollback. */
router.get('/duplicates', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows: dupRows } = await query<{ attempt_id: string; approved_post_id: string; rn: number }>(
    `WITH ranked AS (
       SELECT pa.id AS attempt_id, sj.approved_post_id, pa.attempted_at,
              ROW_NUMBER() OVER (PARTITION BY sj.approved_post_id ORDER BY pa.attempted_at ASC) AS rn
       FROM publish_attempts pa
       JOIN schedule_jobs sj ON sj.id = pa.schedule_job_id
       JOIN approved_posts ap ON ap.id = sj.approved_post_id
       JOIN draft_posts dp ON dp.id = ap.draft_post_id
       WHERE dp.workspace_id = $1 AND pa.success = true AND (pa.rolled_back IS NULL OR pa.rolled_back = false)
     )
     SELECT attempt_id, approved_post_id, rn FROM ranked r WHERE rn > 1`,
    [wId]
  );
  const duplicateAttemptIds = dupRows.map((r) => r.attempt_id);
  const byAp = new Map<string, string[]>();
  for (const r of dupRows) {
    if (!byAp.has(r.approved_post_id)) byAp.set(r.approved_post_id, []);
    byAp.get(r.approved_post_id)!.push(r.attempt_id);
  }
  const groups = Array.from(byAp.entries()).map(([approvedPostId, duplicateAttemptIds]) => ({ approvedPostId, duplicateAttemptIds }));
  res.json({ duplicateAttemptIds, groups });
}));

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const success = req.query.success as string | undefined;
  let sql = `SELECT pa.id, pa.schedule_job_id, pa.success, pa.response_status, pa.response_body, pa.error_message, pa.attempted_at,
      pa.posted_content, pa.platform, pa.linkedin_post_url, pa.post_urn, pa.rolled_back, pa.rolled_back_at,
      dp.content AS draft_content
    FROM publish_attempts pa
    JOIN schedule_jobs sj ON sj.id = pa.schedule_job_id
    JOIN approved_posts ap ON ap.id = sj.approved_post_id
    JOIN draft_posts dp ON dp.id = ap.draft_post_id
    WHERE dp.workspace_id = $1`;
  const params: unknown[] = [wId];
  if (success === 'true' || success === 'false') { sql += ' AND pa.success = $2'; params.push(success === 'true'); }
  sql += ' ORDER BY pa.attempted_at DESC LIMIT 100';
  const { rows } = await query(sql, params);
  res.json({
    items: rows.map((r: { id: string; schedule_job_id: string; success: boolean; response_status: number | null; response_body: string | null; error_message: string | null; attempted_at: Date; posted_content: string | null; platform: string | null; linkedin_post_url: string | null; post_urn: string | null; rolled_back: boolean; rolled_back_at: Date | null; draft_content: string }) => ({
      id: r.id,
      scheduleJobId: r.schedule_job_id,
      success: r.success,
      responseStatus: r.response_status,
      responseBody: r.response_body,
      errorMessage: r.error_message,
      attemptedAt: r.attempted_at,
      content: r.posted_content ?? r.draft_content,
      platform: r.platform ?? 'linkedin',
      linkedInPostUrl: r.linkedin_post_url,
      postUrn: r.post_urn,
      rolledBack: r.rolled_back ?? false,
      rolledBackAt: r.rolled_back_at,
    })),
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT pa.id, pa.schedule_job_id, pa.success, pa.response_status, pa.response_body, pa.error_message, pa.attempted_at,
       pa.posted_content, pa.platform, pa.linkedin_post_url, pa.post_urn, pa.rolled_back, pa.rolled_back_at,
       dp.content AS draft_content
     FROM publish_attempts pa
     JOIN schedule_jobs sj ON sj.id = pa.schedule_job_id
     JOIN approved_posts ap ON ap.id = sj.approved_post_id
     JOIN draft_posts dp ON dp.id = ap.draft_post_id
     WHERE pa.id = $1 AND dp.workspace_id = $2`,
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as { id: string; schedule_job_id: string; success: boolean; response_status: number | null; response_body: string | null; error_message: string | null; attempted_at: Date; posted_content: string | null; platform: string | null; linkedin_post_url: string | null; post_urn: string | null; rolled_back: boolean; rolled_back_at: Date | null; draft_content: string };
  res.json({ id: r.id, scheduleJobId: r.schedule_job_id, success: r.success, responseStatus: r.response_status, responseBody: r.response_body, errorMessage: r.error_message, attemptedAt: r.attempted_at, content: r.posted_content ?? r.draft_content, platform: r.platform ?? 'linkedin', linkedInPostUrl: r.linkedin_post_url, postUrn: r.post_urn, rolledBack: r.rolled_back ?? false, rolledBackAt: r.rolled_back_at });
}));

/** Perform rollback for one attempt. Returns { success, error? }. */
async function rollbackOneAttempt(wId: string, attemptId: string): Promise<{ success: boolean; error?: string }> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) return { success: false, error: 'ENCRYPTION_KEY not set' };

  const { rows } = await query<{ id: string; post_urn: string | null; linkedin_post_url: string | null; success: boolean; rolled_back: boolean }>(
    `SELECT pa.id, pa.post_urn, pa.linkedin_post_url, pa.success, pa.rolled_back
     FROM publish_attempts pa
     JOIN schedule_jobs sj ON sj.id = pa.schedule_job_id
     JOIN approved_posts ap ON ap.id = sj.approved_post_id
     JOIN draft_posts dp ON dp.id = ap.draft_post_id
     WHERE pa.id = $1 AND dp.workspace_id = $2`,
    [attemptId, wId]
  );
  if (rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const attempt = rows[0];
  if (!attempt.success) return { success: false, error: 'Cannot rollback a failed post' };
  if (attempt.rolled_back) return { success: false, error: 'Already rolled back' };

  let postUrn = attempt.post_urn;
  if (!postUrn && attempt.linkedin_post_url) {
    const match = attempt.linkedin_post_url.match(/urn:li:(?:share|ugcPost):\d+/);
    if (match) postUrn = match[0];
  }
  if (!postUrn) return { success: false, error: 'Post URN not available for rollback' };

  const { rows: credRows } = await query<{ encrypted_tokens: string }>(
    'SELECT encrypted_tokens FROM credentials WHERE workspace_id = $1 AND provider = $2',
    [wId, 'linkedin']
  );
  if (credRows.length === 0) return { success: false, error: 'LinkedIn credentials not found' };

  const tokens = decryptTokens(credRows[0].encrypted_tokens, encryptionKey);
  const client = createLinkedInClient({ accessToken: tokens.access_token });
  const deleteResult = await client.deletePost(postUrn);

  if (deleteResult.success) {
    await query('UPDATE publish_attempts SET rolled_back = true, rolled_back_at = now() WHERE id = $1', [attempt.id]);
    return { success: true };
  }
  return { success: false, error: deleteResult.error ?? 'Failed to delete from LinkedIn' };
}

/** Rollback all duplicate attempts (same post published multiple times). Keeps oldest per approved_post; deletes the rest from LinkedIn. */
router.post('/rollback-duplicates', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows: dupRows } = await query<{ attempt_id: string }>(
    `WITH ranked AS (
       SELECT pa.id AS attempt_id, ROW_NUMBER() OVER (PARTITION BY sj.approved_post_id ORDER BY pa.attempted_at ASC) AS rn
       FROM publish_attempts pa
       JOIN schedule_jobs sj ON sj.id = pa.schedule_job_id
       JOIN approved_posts ap ON ap.id = sj.approved_post_id
       JOIN draft_posts dp ON dp.id = ap.draft_post_id
       WHERE dp.workspace_id = $1 AND pa.success = true AND (pa.rolled_back IS NULL OR pa.rolled_back = false)
     )
     SELECT attempt_id FROM ranked WHERE rn > 1`,
    [wId]
  );
  const ids = dupRows.map((r) => r.attempt_id);
  let rolledBack = 0;
  const errors: { attemptId: string; message: string }[] = [];
  for (const id of ids) {
    const result = await rollbackOneAttempt(wId, id);
    if (result.success) rolledBack++; else errors.push({ attemptId: id, message: result.error ?? 'Unknown error' });
  }
  res.json({ rolledBack, total: ids.length, errors });
}));

// Rollback: delete a published post from LinkedIn
router.delete('/:id/rollback', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const result = await rollbackOneAttempt(wId, req.params.id);
  if (!result.success) {
    if (result.error === 'NOT_FOUND') { res.status(404).json({ code: 'NOT_FOUND' }); return; }
    if (result.error === 'Cannot rollback a failed post') { res.status(422).json({ code: 'NOT_PUBLISHED', message: result.error }); return; }
    if (result.error === 'Already rolled back') { res.status(422).json({ code: 'ALREADY_ROLLED_BACK', message: 'This post has already been rolled back' }); return; }
    if (result.error === 'Post URN not available for rollback') { res.status(422).json({ code: 'NO_POST_URN', message: result.error }); return; }
    if (result.error === 'ENCRYPTION_KEY not set') { res.status(500).json({ code: 'CONFIG_ERROR', message: result.error }); return; }
    if (result.error === 'LinkedIn credentials not found') { res.status(422).json({ code: 'NO_CREDENTIALS', message: result.error }); return; }
    res.status(502).json({ code: 'DELETE_FAILED', message: result.error });
    return;
  }
  res.json({ success: true, message: 'Post successfully deleted from LinkedIn' });
}));
