import type { IngestAdapter, IngestConfig } from './types.js';
import { normalize, type RawFeedItem } from '../normalizer.js';

/**
 * Reddit adapter: fetches hot/top posts from a subreddit via the public JSON feed.
 * No API key required for read-only access.
 * Config: { subreddit: string; sort?: 'hot' | 'new' | 'top' | 'rising'; limit?: number }
 */
export const redditAdapter: IngestAdapter = {
  async fetch(config: IngestConfig): Promise<ReturnType<typeof normalize>[]> {
    const subreddit = (config.subreddit as string)?.trim()?.replace(/^\/?r\//, '');
    if (!subreddit) return [];

    const sort = (config.sort as string) ?? 'hot';
    const limit = Math.min(100, Math.max(1, Number(config.limit) ?? 25));
    const allowedSort = ['hot', 'new', 'top', 'rising'].includes(sort) ? sort : 'hot';

    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${allowedSort}.json?limit=${limit}&raw_json=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AstraIngest/1.0 (content aggregation)' },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: { id?: string; url?: string; title?: string; selftext?: string; created_utc?: number; subreddit?: string; permalink?: string } }> };
    };
    const children = data.data?.children ?? [];
    const items: RawFeedItem[] = children
      .map((c) => c.data)
      .filter((d): d is NonNullable<typeof d> => !!d?.url && !!d?.title)
      .map((d) => ({
        url: d.url.startsWith('http') ? d.url : `https://www.reddit.com${d.permalink ?? ''}`,
        title: d.title,
        summary: (d.selftext ?? '').slice(0, 500) || undefined,
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
        sourceName: d.subreddit ? `r/${d.subreddit}` : 'Reddit',
        externalId: d.id ? `reddit:${d.id}` : undefined,
        raw: { subreddit: d.subreddit, redditId: d.id },
      }));
    return items.map((item) => normalize(item));
  },
};
