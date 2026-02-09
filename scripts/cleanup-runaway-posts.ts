#!/usr/bin/env node
/**
 * Delete records of posts that were published in a runaway (non-stop) window.
 * This removes schedule_jobs (and cascades to publish_attempts) and clears
 * approved_posts.schedule_job_id so the app no longer shows them as "posted".
 *
 * Does NOT delete posts from LinkedIn (they remain on LinkedIn).
 * Usage: node --env-file=.env --import tsx scripts/cleanup-runaway-posts.ts [days]
 *   days = how many days back to clean (default 7)
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

const days = parseInt(process.argv[2] || '7', 10);
if (!Number.isFinite(days) || days < 1) {
  console.error('Usage: node --env-file=.env --import tsx scripts/cleanup-runaway-posts.ts [days]');
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    // Delete completed schedule_jobs (approved_posts.schedule_job_id set NULL via FK; publish_attempts CASCADE)
    const del = await pool.query(
      `DELETE FROM schedule_jobs WHERE status = 'completed' AND updated_at >= $1`,
      [since]
    );
    console.log('[cleanup] Deleted completed schedule_jobs (since %s): %s row(s)', since, del.rowCount ?? 0);
    console.log('[cleanup] Done. Runaway post records in the last %d day(s) have been removed from the app.', days);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
