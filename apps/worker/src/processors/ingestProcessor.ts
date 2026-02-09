/**
 * Signal Ingestion Agent: Ingest signals from assigned sources, normalize metadata,
 * remove duplicates, and store tenant-scoped Signal records. Never infer topics.
 */
import { Job } from 'bullmq';
import { query } from 'db';
import { rssAdapter, newsApiAdapter, redditAdapter, twitterAdapter, quoraAdapter, linkedInAdapter } from 'ingest';
import { getRankQueue } from '../queues/rank.js';
import { insertJobRun, updateJobRun } from '../lib/jobRuns.js';

export type IngestJobPayload = { workspaceId: string; sourceIds?: string[] };

export async function processIngestJob(job: Job<IngestJobPayload>) {
  const { workspaceId, sourceIds } = job.data;
  const runId = await insertJobRun(workspaceId, 'ingest', { referenceId: job.id, triggerType: 'api' });
  try {
  const { rows: sources } = await query<{ id: string; type: string; config: Record<string, unknown> }>(
    `SELECT id, type, config FROM sources WHERE workspace_id = $1 AND enabled = true AND status = 'active'
     ${sourceIds?.length ? 'AND id = ANY($2)' : ''}`,
    sourceIds?.length ? [workspaceId, sourceIds] : [workspaceId]
  );
  const trendItemIds: string[] = [];
  for (const source of sources) {
    let items: { url: string; urlHash: string; title: string; summary: string | null; sourceName: string | null; publishedAt: Date | null; externalId: string | null; author: string | null; content: string | null; platform: string | null; engagementMetrics: Record<string, number> | null; raw: Record<string, unknown> }[];
    try {
      if (source.type === 'rss') {
        items = await rssAdapter.fetch({ url: source.config.url });
      } else if (source.type === 'trend_provider' && (source.config as { provider?: string }).provider === 'newsapi') {
        items = await newsApiAdapter.fetch({ apiKey: (source.config as { apiKey?: string }).apiKey ?? process.env.NEWSAPI_KEY, country: (source.config as { country?: string }).country });
      } else if (source.type === 'reddit') {
        items = await redditAdapter.fetch(source.config as { subreddit?: string; sort?: string; limit?: number });
      } else if (source.type === 'twitter') {
        items = await twitterAdapter.fetch(source.config as { bearerToken?: string; query?: string; maxResults?: number });
      } else if (source.type === 'quora') {
        items = await quoraAdapter.fetch(source.config as { rssUrl?: string });
      } else if (source.type === 'linkedin') {
        items = await linkedInAdapter.fetch(source.config as { rssUrl?: string; name?: string });
      } else {
        continue;
      }
    } catch (e) {
      await job.log(String(e));
      continue;
    }
    for (const item of items) {
      const { rows: existing } = await query(
        'SELECT id FROM trend_items WHERE workspace_id = $1 AND url_hash = $2',
        [workspaceId, item.urlHash]
      );
      if (existing.length > 0) continue;
      const raw = { ...(item.raw ?? {}), sourceName: item.sourceName, publishedAt: item.publishedAt?.toISOString?.() ?? null };
      const platform = item.platform ?? source.type;
      const { rows: inserted } = await query<{ id: string }>(
        `INSERT INTO trend_items (workspace_id, source_id, url, url_hash, title, summary, raw, external_id, platform, author, published_at, content, engagement_metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [workspaceId, source.id, item.url, item.urlHash, item.title, item.summary, JSON.stringify(raw), item.externalId, platform, item.author ?? null, item.publishedAt ?? null, item.content ?? null, item.engagementMetrics ? JSON.stringify(item.engagementMetrics) : null]
      );
      if (inserted.length > 0) trendItemIds.push(inserted[0].id);
    }
  }
  if (trendItemIds.length > 0) {
    const rankQueue = getRankQueue();
    await rankQueue.add('rank', { workspaceId, trendItemIds });
  }
  await updateJobRun(runId, 'completed');
  return { processed: true, trendItemIds };
  } catch (err) {
    await updateJobRun(runId, 'failed', { errorMessage: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
