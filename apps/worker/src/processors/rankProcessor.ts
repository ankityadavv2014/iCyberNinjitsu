import { Job } from 'bullmq';
import { query } from 'db';
import { score } from 'rank';
import { getGenerateQueue } from '../queues/generate.js';

export type RankJobPayload = { workspaceId: string; trendItemIds: string[] };

const MAX_GENERATE_PER_BATCH = 5;

export async function processRankJob(job: Job<RankJobPayload>) {
  const { workspaceId, trendItemIds } = job.data;
  const { rows: topics } = await query<{ keyword: string; weight: number }>(
    'SELECT keyword, weight FROM topics WHERE workspace_id = $1',
    [workspaceId]
  );
  const keywords = topics.map((t) => t.keyword);
  const keywordWeights = Object.fromEntries(topics.map((t) => [t.keyword, Number(t.weight)]));
  for (const id of trendItemIds) {
    const { rows: items } = await query<{ title: string; summary: string | null; raw: unknown }>(
      'SELECT title, summary, raw FROM trend_items WHERE id = $1',
      [id]
    );
    if (items.length === 0) continue;
    const item = items[0];
    const raw = (item.raw as { publishedAt?: string; sourceName?: string }) ?? {};
    const s = score(
      {
        title: item.title,
        summary: item.summary,
        publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
        sourceName: raw.sourceName ?? null,
        keywords,
        keywordWeights,
      },
      {}
    );
    await query('UPDATE trend_items SET score = $1 WHERE id = $2', [s, id]);
  }

  // Auto-queue generate jobs for top-scored items that don't already have drafts
  const { rows: topItems } = await query<{ id: string }>(
    `SELECT id FROM trend_items
     WHERE id = ANY($1)
       AND NOT EXISTS (SELECT 1 FROM draft_posts WHERE trend_item_id = trend_items.id)
     ORDER BY score DESC NULLS LAST
     LIMIT $2`,
    [trendItemIds, MAX_GENERATE_PER_BATCH]
  );

  if (topItems.length > 0) {
    const genQueue = getGenerateQueue();
    for (const item of topItems) {
      await genQueue.add('generate', { workspaceId, trendItemId: item.id });
    }
    console.log(`[rank] Queued ${topItems.length} generate jobs for workspace ${workspaceId}`);
  }

  return { processed: true, count: trendItemIds.length, generated: topItems.length };
}
