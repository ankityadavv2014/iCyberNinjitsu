import { query } from 'db';
import { getPublishQueue } from '../queues/publish.js';

interface AutoSettings {
  workspace_id: string;
  enabled: boolean;
  posts_per_day: number;
  preferred_times: string[];
  timezone: string;
  days_of_week: number[];
}

/**
 * Auto-scheduler: runs every minute.
 * For each workspace with auto-schedule enabled and not paused:
 *   1. Check if current time matches a preferred_time slot on an allowed day.
 *   2. Count posts already scheduled today; skip if >= posts_per_day.
 *   3. Pick oldest approved post without a schedule job.
 *   4. Create schedule_job + enqueue publish with zero delay.
 */
export async function runAutoSchedule(): Promise<void> {
  const { rows: settings } = await query<AutoSettings>(
    `SELECT a.workspace_id, a.enabled, a.posts_per_day, a.preferred_times, a.timezone, a.days_of_week
     FROM auto_schedule_settings a
     JOIN workspaces w ON w.id = a.workspace_id
     WHERE a.enabled = true AND w.paused = false`
  );

  for (const s of settings) {
    try {
      await processWorkspaceAutoSchedule(s);
    } catch (e) {
      console.error(`[auto-schedule] Error for workspace ${s.workspace_id}:`, e);
    }
  }
}

async function processWorkspaceAutoSchedule(s: AutoSettings): Promise<void> {
  // Get current time in workspace timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: s.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const currentHHMM = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: s.timezone,
    weekday: 'short',
  });
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDay = dayMap[dayStr] ?? now.getDay();

  // Check if today is an allowed day
  if (!s.days_of_week.includes(currentDay)) return;

  // Check if current minute matches any preferred time
  const matchesTime = s.preferred_times.some((t) => t === currentHHMM);
  if (!matchesTime) return;

  // Count how many posts were already auto-scheduled today
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone }); // YYYY-MM-DD
  const todayStr = dateFormatter.format(now);

  const { rows: countRows } = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM schedule_jobs sj
     JOIN approved_posts ap ON ap.id = sj.approved_post_id
     JOIN draft_posts dp ON dp.id = ap.draft_post_id
     WHERE dp.workspace_id = $1
       AND sj.created_at::date = $2::date`,
    [s.workspace_id, todayStr]
  );
  const scheduledToday = parseInt(countRows[0]?.cnt ?? '0', 10);
  if (scheduledToday >= s.posts_per_day) return;

  // Pick oldest approved post without a schedule job and not failed (fail-safe: no retry of duplicate/failed)
  const { rows: posts } = await query<{ id: string }>(
    `SELECT ap.id FROM approved_posts ap
     JOIN draft_posts dp ON dp.id = ap.draft_post_id
     WHERE dp.workspace_id = $1
       AND ap.schedule_job_id IS NULL
       AND ap.publish_failed_at IS NULL
     ORDER BY ap.approved_at ASC
     LIMIT 1`,
    [s.workspace_id]
  );
  if (posts.length === 0) return;

  const approvedPostId = posts[0].id;

  // Create schedule_job
  const { rows: jobRows } = await query<{ id: string }>(
    `INSERT INTO schedule_jobs (approved_post_id, status) VALUES ($1, 'queued') RETURNING id`,
    [approvedPostId]
  );
  const jobId = jobRows[0].id;

  // Link approved post to schedule job
  await query('UPDATE approved_posts SET schedule_job_id = $1 WHERE id = $2', [jobId, approvedPostId]);

  // Enqueue publish with zero delay (post now)
  const queue = getPublishQueue();
  const bullJob = await queue.add('publish', {
    scheduleJobId: jobId,
    approvedPostId,
    workspaceId: s.workspace_id,
  });
  await query('UPDATE schedule_jobs SET job_id = $1 WHERE id = $2', [bullJob.id, jobId]);

  console.log(`[auto-schedule] Workspace ${s.workspace_id}: scheduled post ${approvedPostId} (job ${jobId})`);
}
