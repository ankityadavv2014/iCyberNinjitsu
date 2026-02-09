import { query } from 'db';

export type JobRunStage = 'ingest' | 'rank' | 'generate' | 'schedule' | 'publish';
export type JobRunTrigger = 'manual' | 'cron' | 'api';
export type JobRunStatus = 'running' | 'completed' | 'failed';

export async function insertJobRun(
  workspaceId: string,
  stage: JobRunStage,
  opts: { referenceId?: string; triggerType?: JobRunTrigger } = {}
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO job_runs (workspace_id, stage, trigger_type, reference_id, status)
     VALUES ($1, $2, $3, $4, 'running') RETURNING id`,
    [workspaceId, stage, opts.triggerType ?? 'api', opts.referenceId ?? null]
  );
  return rows[0]!.id;
}

export async function updateJobRun(
  runId: string,
  status: JobRunStatus,
  opts: { errorMessage?: string } = {}
): Promise<void> {
  await query(
    `UPDATE job_runs SET status = $1, finished_at = now(), error_message = $2 WHERE id = $3`,
    [status, opts.errorMessage ?? null, runId]
  );
}
