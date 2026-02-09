import { Job } from 'bullmq';
import { query } from 'db';
import { getPublishQueue } from '../queues/publish.js';

/** Run every 5 min: find approved_posts with scheduled_for <= now, no completed schedule_job, workspace not paused; enqueue publish */
export async function processScheduleJob(_job: Job) {
  return runScheduledPublish();
}

/**
 * Standalone version that doesn't require a Job argument.
 * Called by the cron interval directly, avoiding the {} as Job hack.
 */
export async function runScheduledPublish() {
  const killGlobal = process.env.KILL_SWITCH_GLOBAL === 'true';
  if (killGlobal) return { processed: 0 };

  // Only pick approved_posts that have NOT already been published (no completed schedule_job).
  // Otherwise once a job completes, the LEFT JOIN on queued/running no longer matches and we'd re-select the same post.
  const { rows } = await query<{ ap_id: string; w_id: string; sj_id: string }>(
    `SELECT ap.id AS ap_id, dp.workspace_id AS w_id, sj.id AS sj_id
     FROM approved_posts ap
     JOIN draft_posts dp ON dp.id = ap.draft_post_id
     JOIN workspaces w ON w.id = dp.workspace_id AND w.paused = false
     LEFT JOIN schedule_jobs sj ON sj.approved_post_id = ap.id AND sj.status IN ('queued', 'running')
     WHERE ap.scheduled_for <= now()
       AND ap.publish_failed_at IS NULL
       AND (sj.id IS NULL OR sj.status = 'queued')
       AND NOT EXISTS (SELECT 1 FROM schedule_jobs sj2 WHERE sj2.approved_post_id = ap.id AND sj2.status = 'completed')
     LIMIT 50`
  );
  const queue = getPublishQueue();
  for (const r of rows) {
    const { rows: existing } = await query('SELECT 1 FROM schedule_jobs WHERE approved_post_id = $1 AND status IN ($2, $3)', [r.ap_id, 'queued', 'running']);
    if (existing.length > 0) {
      const { rows: sjRows } = await query<{ id: string; job_id: string | null }>('SELECT id, job_id FROM schedule_jobs WHERE approved_post_id = $1 ORDER BY created_at DESC LIMIT 1', [r.ap_id]);
      if (sjRows[0]?.job_id) continue;
    }
    let sjId = r.sj_id;
    if (!sjId) {
      const { rows: inserted } = await query<{ id: string }>('INSERT INTO schedule_jobs (approved_post_id, status) VALUES ($1, $2) RETURNING id', [r.ap_id, 'queued']);
      if (inserted.length === 0) continue;
      sjId = inserted[0].id;
      await query('UPDATE approved_posts SET schedule_job_id = $1 WHERE id = $2', [sjId, r.ap_id]);
    }
    await queue.add('publish', { scheduleJobId: sjId, approvedPostId: r.ap_id, workspaceId: r.w_id });
  }
  return { processed: rows.length };
}
