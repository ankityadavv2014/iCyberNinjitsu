import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { getIngestQueue } from '../queues/ingest.js';
import { getGenerateQueue } from '../queues/generate.js';
import { getPublishQueue } from '../queues/publish.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;

  const [lastIngestResult, attemptsResult] = await Promise.all([
    query<{ max: Date | null }>('SELECT MAX(fetched_at) AS max FROM trend_items WHERE workspace_id = $1', [wId]),
    query<{ total: string; success: string }>(
      `SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE success = true)::text AS success
       FROM publish_attempts pa
       JOIN schedule_jobs sj ON sj.id = pa.schedule_job_id
       JOIN approved_posts ap ON ap.id = sj.approved_post_id
       JOIN draft_posts dp ON dp.id = ap.draft_post_id
       WHERE dp.workspace_id = $1`,
      [wId]
    ),
  ]);

  let ingestCounts: { waiting?: number; active?: number; completed?: number; failed?: number } = { waiting: 0, active: 0, completed: 0, failed: 0 };
  let generateCounts: { waiting?: number; active?: number; completed?: number; failed?: number } = { waiting: 0, active: 0, completed: 0, failed: 0 };
  let publishCounts: { waiting?: number; active?: number; completed?: number; failed?: number } = { waiting: 0, active: 0, completed: 0, failed: 0 };

  try {
    ingestCounts = await getIngestQueue().getJobCounts();
  } catch {
    // ignore, keep defaults
  }
  try {
    generateCounts = await getGenerateQueue().getJobCounts();
  } catch {
    // ignore, keep defaults
  }
  try {
    publishCounts = await getPublishQueue().getJobCounts();
  } catch {
    // ignore, keep defaults
  }

  const totalAttempts = parseInt(attemptsResult.rows[0]?.total ?? '0', 10);
  const successAttempts = parseInt(attemptsResult.rows[0]?.success ?? '0', 10);
  const successRate = totalAttempts > 0 ? Math.round((successAttempts / totalAttempts) * 100) : null;

  const ingest = (ingestCounts as { waiting?: number; active?: number }) ?? {};
  const generate = (generateCounts as { waiting?: number; active?: number }) ?? {};
  const publish = (publishCounts as { waiting?: number; active?: number }) ?? {};
  const queuePending = (ingest.waiting ?? 0) + (ingest.active ?? 0) + (generate.waiting ?? 0) + (generate.active ?? 0) + (publish.waiting ?? 0) + (publish.active ?? 0);

  res.json({
    lastIngestAt: lastIngestResult.rows[0]?.max ?? null,
    queuePending,
    successRate,
    queue: {
      ingest: { waiting: ingest.waiting ?? 0, active: ingest.active ?? 0 },
      generate: { waiting: generate.waiting ?? 0, active: generate.active ?? 0 },
      publish: { waiting: publish.waiting ?? 0, active: publish.active ?? 0 },
    },
  });
}));
