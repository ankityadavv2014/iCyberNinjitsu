import type { IngestAdapter, IngestConfig } from './types.js';
import { normalize, type RawFeedItem } from '../normalizer.js';

/**
 * Quora adapter: Quora has no public content API. This adapter supports:
 * 1) RSS feed URL if you have one (e.g. Quora topic RSS via third-party or feed URL in config)
 * 2) Placeholder that returns empty until a proper integration (e.g. scraping or partner API) is added
 * Config: { rssUrl?: string } - if provided, fetches that RSS (same shape as RSS adapter).
 * Otherwise returns [] and does not hit Quora (no scraping in this codebase).
 */
export const quoraAdapter: IngestAdapter = {
  async fetch(config: IngestConfig): Promise<ReturnType<typeof normalize>[]> {
    const rssUrl = (config.rssUrl as string)?.trim();
    if (rssUrl && rssUrl.startsWith('http')) {
      try {
        const res = await fetch(rssUrl);
        const text = await res.text();
        const items = parseRss(text);
        return items.map((item) => normalize({ ...item, sourceName: item.sourceName ?? 'Quora' }));
      } catch {
        return [];
      }
    }
    return [];
  },
};

function parseRss(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const linkRegex = /<link[^>]*>([^<]*)<\/link>|<link[^>]+href=["']([^"']+)["']/i;
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const descRegex = /<description[^>]*>([\s\S]*?)<\/description>|<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i;
  const dateRegex = /<pubDate[^>]*>([^<]*)<\/pubDate>|<dc:date[^>]*>([^<]*)<\/dc:date>/i;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const linkM = block.match(linkRegex);
    const link = linkM ? (linkM[2] ?? linkM[1]?.trim?.() ?? '').trim() : '';
    const titleM = block.match(titleRegex);
    const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : '';
    const descM = block.match(descRegex);
    const summary = descM ? (descM[1] ?? descM[2] ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 500) : undefined;
    const dateM = block.match(dateRegex);
    const publishedAt = dateM ? (dateM[1] ?? dateM[2] ?? '').trim() : undefined;
    if (link) items.push({ url: link, title, summary, publishedAt, sourceName: 'Quora', raw: {} });
  }
  return items;
}
