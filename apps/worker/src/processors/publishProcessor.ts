import { Job } from 'bullmq';
import { query } from 'db';
import { decryptTokens, refreshAccessToken, encryptTokens } from 'linkedin';
import { getPlatformOrThrow } from 'platforms';
import { insertJobRun, updateJobRun } from '../lib/jobRuns.js';

export type PublishJobPayload = {
  scheduleJobId: string;
  approvedPostId: string;
  workspaceId: string;
};

/**
 * Read LinkedIn app credentials from encrypted DB config first, fall back to .env.
 */
async function getLinkedInAppConfig(workspaceId: string): Promise<{
  clientId: string;
  clientSecret: string;
} | null> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey) {
    const { rows } = await query<{ encrypted_config: string }>(
      'SELECT encrypted_config FROM provider_configs WHERE workspace_id = $1 AND provider = $2',
      [workspaceId, 'linkedin']
    );
    if (rows.length > 0) {
      try {
        const decrypted = decryptTokens(rows[0].encrypted_config, encryptionKey);
        return {
          clientId: decrypted.access_token,
          clientSecret: decrypted.refresh_token!,
        };
      } catch (e) {
        console.error('[publish] Failed to decrypt provider config:', e);
      }
    }
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }

  return null;
}

export async function processPublishJob(job: Job<PublishJobPayload>) {
  const { scheduleJobId, approvedPostId, workspaceId } = job.data;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY not set');

  const { rows: jobRows } = await query<{ status: string }>('SELECT status FROM schedule_jobs WHERE id = $1', [scheduleJobId]);
  if (jobRows.length === 0 || jobRows[0].status !== 'queued') return { processed: false };

  const runId = await insertJobRun(workspaceId, 'publish', { referenceId: scheduleJobId, triggerType: 'api' });
  try {
  const { rows: alreadyCompleted } = await query<{ id: string }>(
    `SELECT id FROM schedule_jobs WHERE approved_post_id = $1 AND status = 'completed' AND id != $2 LIMIT 1`,
    [approvedPostId, scheduleJobId]
  );
  if (alreadyCompleted.length > 0) {
    await query('UPDATE schedule_jobs SET status = $1, updated_at = now() WHERE id = $2', ['completed', scheduleJobId]);
    await updateJobRun(runId, 'completed');
    console.log(`[publish] Skipping duplicate job ${scheduleJobId}: approved post ${approvedPostId} already published.`);
    return { processed: true, success: true };
  }

  const { rows: approved } = await query<{ id: string; draft_post_id: string; platform: string }>(
    'SELECT id, draft_post_id, COALESCE(platform, $2) AS platform FROM approved_posts WHERE id = $1',
    [approvedPostId, 'linkedin']
  );
  if (approved.length === 0) return { processed: false };

  const platform = (approved[0].platform ?? 'linkedin') as string;
  const plugin = getPlatformOrThrow(platform);

  const { rows: draft } = await query<{ content: string }>('SELECT content FROM draft_posts WHERE id = $1', [approved[0].draft_post_id]);
  if (draft.length === 0) return { processed: false };
  const content = draft[0].content;

  let imageBuffer: Buffer | undefined;
  try {
    const { rows: imgRows } = await query<{ image_data: Buffer }>(
      'SELECT image_data FROM post_images WHERE draft_post_id = $1 AND image_data IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      [approved[0].draft_post_id]
    );
    if (imgRows.length > 0 && imgRows[0].image_data) imageBuffer = imgRows[0].image_data;
  } catch {
    // ignore
  }

  const rendered = plugin.renderDraft(content);
  if (imageBuffer) rendered.imageBuffer = imageBuffer;

  if (platform === 'linkedin') {
    const { rows: credRows } = await query<{ encrypted_tokens: string; refresh_at: Date | null }>(
      'SELECT encrypted_tokens, refresh_at FROM credentials WHERE workspace_id = $1 AND provider = $2',
      [workspaceId, 'linkedin']
    );
    if (credRows.length === 0) {
      await query(
        'INSERT INTO publish_attempts (schedule_job_id, success, error_message, posted_content, platform) VALUES ($1, $2, $3, $4, $5)',
        [scheduleJobId, false, 'No LinkedIn credential', content, 'linkedin']
      );
      await query('UPDATE schedule_jobs SET status = $1 WHERE id = $2', ['failed', scheduleJobId]);
      await updateJobRun(runId, 'failed', { errorMessage: 'No LinkedIn credential' });
      return { processed: true, success: false };
    }

    let tokens: { access_token: string; refresh_token?: string; owner_urn?: string };
    try {
      tokens = decryptTokens(credRows[0].encrypted_tokens, encryptionKey);
    } catch {
      await query(
        'INSERT INTO publish_attempts (schedule_job_id, success, error_message, posted_content, platform) VALUES ($1, $2, $3, $4, $5)',
        [scheduleJobId, false, 'Token decryption failed', content, 'linkedin']
      );
      await query('UPDATE schedule_jobs SET status = $1 WHERE id = $2', ['failed', scheduleJobId]);
      await updateJobRun(runId, 'failed', { errorMessage: 'Token decryption failed' });
      return { processed: true, success: false };
    }

    let accessToken = tokens.access_token;
    if (credRows[0].refresh_at && new Date(credRows[0].refresh_at) <= new Date()) {
      const appConfig = await getLinkedInAppConfig(workspaceId);
      if (!appConfig) {
        await query(
          'INSERT INTO publish_attempts (schedule_job_id, success, error_message) VALUES ($1, $2, $3)',
          [scheduleJobId, false, 'LinkedIn app credentials not configured -- cannot refresh token']
        );
        await query('UPDATE schedule_jobs SET status = $1 WHERE id = $2', ['failed', scheduleJobId]);
        await updateJobRun(runId, 'failed', { errorMessage: 'LinkedIn app credentials not configured' });
        return { processed: true, success: false };
      }

      try {
        const refreshed = await refreshAccessToken({
          refreshToken: tokens.refresh_token!,
          clientId: appConfig.clientId,
          clientSecret: appConfig.clientSecret,
        });
        accessToken = refreshed.access_token;
        const encrypted = encryptTokens({
          access_token: refreshed.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: refreshed.expires_in,
          owner_urn: tokens.owner_urn,
        }, encryptionKey);
        await query(
          'UPDATE credentials SET encrypted_tokens = $1, refresh_at = $2 WHERE workspace_id = $3 AND provider = $4',
          [encrypted, refreshed.expires_in ? new Date(Date.now() + (refreshed.expires_in - 300) * 1000) : null, workspaceId, 'linkedin']
        );
      } catch {
        await query(
          'INSERT INTO publish_attempts (schedule_job_id, success, response_status, error_message, posted_content, platform) VALUES ($1, $2, $3, $4, $5, $6)',
          [scheduleJobId, false, 401, 'Token refresh failed', content, 'linkedin']
        );
        await query('UPDATE schedule_jobs SET status = $1 WHERE id = $2', ['failed', scheduleJobId]);
        await updateJobRun(runId, 'failed', { errorMessage: 'Token refresh failed' });
        return { processed: true, success: false };
      }
    }

    const result = await plugin.publish(rendered, { accessToken, ownerUrn: tokens.owner_urn });

    const linkedInPostUrl = result.postUrl ?? null;
    await query(
      'INSERT INTO publish_attempts (schedule_job_id, success, response_status, response_body, error_message, posted_content, platform, linkedin_post_url, post_urn) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [scheduleJobId, result.success, result.status ?? 0, (result.body ?? '').slice(0, 2000), result.error ?? null, content, 'linkedin', linkedInPostUrl, result.postUrn ?? null]
    );
    await query(
      'UPDATE schedule_jobs SET status = $1, updated_at = now() WHERE id = $2',
      [result.success ? 'completed' : 'failed', scheduleJobId]
    );
    await updateJobRun(runId, result.success ? 'completed' : 'failed', result.error ? { errorMessage: result.error } : {});

    if (!result.success && isNoRetryPublishFailure(result.status ?? 0, result.body ?? result.error ?? '')) {
      const reason = extractPublishFailureReason(result.body ?? result.error ?? '');
      await query(
        'UPDATE approved_posts SET publish_failed_at = now(), publish_failed_reason = $1, schedule_job_id = NULL WHERE id = $2',
        [reason, approvedPostId]
      );
      await query(
        'UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2',
        ['pending_review', approved[0].draft_post_id]
      );
      console.log(`[publish] Fail-safe: draft ${approved[0].draft_post_id} sent back to pending_review (${reason})`);
    }

    return { processed: true, success: result.success };
  }

  // Other platforms (e.g. x): load credentials for provider
  const { rows: credRows } = await query<{ encrypted_tokens: string }>(
    'SELECT encrypted_tokens FROM credentials WHERE workspace_id = $1 AND provider = $2',
    [workspaceId, platform]
  );
  if (credRows.length === 0) {
    await query(
      'INSERT INTO publish_attempts (schedule_job_id, success, error_message, posted_content, platform) VALUES ($1, $2, $3, $4, $5)',
      [scheduleJobId, false, `No credential for platform: ${platform}`, content, platform]
    );
    await query('UPDATE schedule_jobs SET status = $1 WHERE id = $2', ['failed', scheduleJobId]);
    await updateJobRun(runId, 'failed', { errorMessage: `No credential for platform: ${platform}` });
    return { processed: true, success: false };
  }

  let creds: unknown;
  try {
    creds = decryptTokens(credRows[0].encrypted_tokens, encryptionKey);
  } catch {
    await query(
      'INSERT INTO publish_attempts (schedule_job_id, success, error_message, posted_content, platform) VALUES ($1, $2, $3, $4, $5)',
      [scheduleJobId, false, 'Token decryption failed', content, platform]
    );
    await query('UPDATE schedule_jobs SET status = $1 WHERE id = $2', ['failed', scheduleJobId]);
    await updateJobRun(runId, 'failed', { errorMessage: 'Token decryption failed' });
    return { processed: true, success: false };
  }

  const result = await plugin.publish(rendered, creds);

  await query(
    'INSERT INTO publish_attempts (schedule_job_id, success, response_status, response_body, error_message, posted_content, platform, post_urn) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [scheduleJobId, result.success, result.status ?? 0, (result.body ?? '').slice(0, 2000), result.error ?? null, content, platform, result.postUrn ?? null]
  );
  await query(
    'UPDATE schedule_jobs SET status = $1, updated_at = now() WHERE id = $2',
    [result.success ? 'completed' : 'failed', scheduleJobId]
  );
  await updateJobRun(runId, result.success ? 'completed' : 'failed', result.error ? { errorMessage: result.error } : {});

  return { processed: true, success: result.success };
  } catch (err) {
    await updateJobRun(runId, 'failed', { errorMessage: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

function isNoRetryPublishFailure(status: number, body: string): boolean {
  if (status !== 422) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes('duplicate_post') ||
    lower.includes('duplicate post') ||
    lower.includes('content is a duplicate') ||
    lower.includes('unprocessable entity')
  );
}

function extractPublishFailureReason(body: string): string {
  if (body.toLowerCase().includes('duplicate_post') || body.toLowerCase().includes('duplicate post')) return 'DUPLICATE_POST';
  try {
    const m = body.match(/"code"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
  } catch {
    // ignore
  }
  return 'PUBLISH_FAILED';
}
