#!/usr/bin/env node
/**
 * Stop the "scheduled and failed madness":
 * 1. Cancel all queued and running schedule_jobs (so nothing else gets published).
 * 2. Delete all schedule_jobs (cascades to publish_attempts), so dashboard shows 0 Scheduled, 0 Recent failures.
 *
 * Does NOT delete drafts or approved_posts; only schedule_jobs and their publish_attempts.
 * Run: node --env-file=.env --import tsx scripts/stop-and-reset-schedule.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

try {
  const env = readFileSync(join(__dirname, '../.env'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  // .env optional
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });

  try {
    // 1) Cancel queued and running so worker won't process them
    const cancel = await pool.query(
      `UPDATE schedule_jobs SET status = 'cancelled', updated_at = now() WHERE status IN ('queued', 'running')`
    );
    console.log('[stop-and-reset] Cancelled queued/running jobs: %s row(s)', cancel.rowCount ?? 0);

    // 2) Unlink approved_posts from schedule_jobs so we can delete jobs (FK approved_posts.schedule_job_id -> schedule_jobs)
    await pool.query(`UPDATE approved_posts SET schedule_job_id = NULL WHERE schedule_job_id IS NOT NULL`);
    console.log('[stop-and-reset] Unlinked approved_posts from schedule_jobs');

    // 3) Delete all schedule_jobs (CASCADE deletes publish_attempts)
    const del = await pool.query(`DELETE FROM schedule_jobs`);
    console.log('[stop-and-reset] Deleted all schedule_jobs (and their publish_attempts): %s row(s)', del.rowCount ?? 0);

    console.log('[stop-and-reset] Done. Dashboard Scheduled and Recent failures will show 0. Ensure worker is disabled (ASTRA_WORKER_DISABLED=1) so no new jobs run.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
