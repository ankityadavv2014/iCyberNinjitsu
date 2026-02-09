export interface RawFeedItem {
  url: string;
  title: string;
  summary?: string;
  publishedAt?: string;
  sourceName?: string;
  externalId?: string;
  author?: string;
  content?: string;
  platform?: string;
  engagementMetrics?: Record<string, number>;
  raw?: Record<string, unknown>;
}

export interface NormalizedTrendItem {
  url: string;
  urlHash: string;
  title: string;
  summary: string | null;
  sourceName: string | null;
  publishedAt: Date | null;
  externalId: string | null;
  author: string | null;
  content: string | null;
  platform: string | null;
  engagementMetrics: Record<string, number> | null;
  raw: Record<string, unknown>;
}

import { createHash } from 'crypto';

function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url;
  }
}

export function urlHash(url: string): string {
  return createHash('sha256').update(canonicalUrl(url)).digest('hex');
}

export function normalize(item: RawFeedItem): NormalizedTrendItem {
  const url = canonicalUrl(item.url);
  return {
    url,
    urlHash: urlHash(url),
    title: item.title || 'Untitled',
    summary: item.summary ?? null,
    sourceName: item.sourceName ?? null,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    externalId: item.externalId ?? null,
    author: item.author ?? null,
    content: item.content ?? null,
    platform: item.platform ?? null,
    engagementMetrics: item.engagementMetrics ?? null,
    raw: item.raw ?? {},
  };
}
