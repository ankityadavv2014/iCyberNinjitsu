import type { IngestAdapter, IngestConfig } from './types.js';
import { normalize, type RawFeedItem } from '../normalizer.js';

/**
 * Twitter/X adapter: uses Twitter API v2 recent search (or bearer token timeline).
 * Requires TWITTER_BEARER_TOKEN in env or config.bearerToken.
 * Config: { bearerToken?: string; query: string; maxResults?: number }
 * Query examples: "cybersecurity", "ransomware lang:en", "from:username"
 */
export const twitterAdapter: IngestAdapter = {
  async fetch(config: IngestConfig): Promise<ReturnType<typeof normalize>[]> {
    const bearerToken = (config.bearerToken as string) || process.env.TWITTER_BEARER_TOKEN;
    const query = (config.query as string)?.trim();
    if (!bearerToken || !query) return [];

    const maxResults = Math.min(100, Math.max(10, Number(config.maxResults) ?? 20));
    const url = 'https://api.twitter.com/2/tweets/search/recent';
    const params = new URLSearchParams({
      query: `${query} -is:retweet`,
      max_results: String(maxResults),
      'tweet.fields': 'created_at,public_metrics,author_id',
      'user.fields': 'name,username',
      expansions: 'author_id',
    });

    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      data?: Array<{ id: string; text: string; created_at?: string; author_id?: string }>;
      includes?: { users?: Array<{ id: string; username: string; name?: string }> };
    };
    const tweets = data.data ?? [];
    const users = (data.includes?.users ?? []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<string, { id: string; username: string; name?: string }>);

    const items: RawFeedItem[] = tweets.map((t) => {
      const author = t.author_id ? users[t.author_id] : null;
      const authorHandle = author?.username ? `@${author.username}` : '';
      const url = `https://twitter.com/i/status/${t.id}`;
      return {
        url,
        title: authorHandle ? `${authorHandle}: ${t.text.slice(0, 80)}${t.text.length > 80 ? '...' : ''}` : t.text.slice(0, 80),
        summary: t.text,
        publishedAt: t.created_at,
        sourceName: authorHandle || 'Twitter',
        externalId: `twitter:${t.id}`,
        raw: { tweetId: t.id, authorId: t.author_id },
      };
    });
    return items.map((item) => normalize(item));
  },
};
