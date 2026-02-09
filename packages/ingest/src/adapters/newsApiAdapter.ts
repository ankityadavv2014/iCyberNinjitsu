import type { IngestAdapter, IngestConfig } from './types.js';
import { normalize, type RawFeedItem } from '../normalizer.js';

const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';

export const newsApiAdapter: IngestAdapter = {
  async fetch(config: IngestConfig): Promise<ReturnType<typeof normalize>[]> {
    const apiKey = config.apiKey as string;
    const country = (config.country as string) ?? 'us';
    if (!apiKey) return [];
    const url = `${NEWSAPI_URL}?country=${country}&apiKey=${apiKey}&pageSize=20`;
    const res = await fetch(url);
    const data = (await res.json()) as { articles?: Array<{ url?: string; title?: string; description?: string; publishedAt?: string; source?: { name?: string } }> };
    const articles = data.articles ?? [];
    const items: RawFeedItem[] = articles
      .filter((a) => a.url)
      .map((a) => ({
        url: a.url!,
        title: a.title ?? 'Untitled',
        summary: a.description,
        publishedAt: a.publishedAt,
        sourceName: a.source?.name,
        raw: a as unknown as Record<string, unknown>,
      }));
    return items.map((item) => normalize(item));
  },
};
