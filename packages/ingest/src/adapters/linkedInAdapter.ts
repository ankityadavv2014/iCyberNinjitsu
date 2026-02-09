import type { IngestAdapter, IngestConfig } from './types.js';
import { normalize, type RawFeedItem } from '../normalizer.js';

/**
 * LinkedIn adapter: LinkedIn does not offer a public API for ingesting trending feed content.
 * This adapter supports:
 * 1) RSS URL - if you have a LinkedIn-related RSS (e.g. company blog, newsletter, or third-party feed)
 * 2) Placeholder that returns empty until a proper integration exists
 * Config: { rssUrl?: string; name?: string } - if rssUrl provided, fetches that feed and uses name as sourceName.
 */
export const linkedInAdapter: IngestAdapter = {
  async fetch(config: IngestConfig): Promise<ReturnType<typeof normalize>[]> {
    const rssUrl = (config.rssUrl as string)?.trim();
    const sourceName = (config.name as string)?.trim() || 'LinkedIn';
    if (rssUrl && rssUrl.startsWith('http')) {
      try {
        const res = await fetch(rssUrl);
        const text = await res.text();
        const items = parseRss(text);
        return items.map((item) => normalize({ ...item, sourceName: item.sourceName ?? sourceName }));
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
    if (link) items.push({ url: link, title, summary, publishedAt, raw: {} });
  }
  return items;
}
