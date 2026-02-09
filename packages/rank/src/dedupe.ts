export function dedupeByUrlHash<T extends { urlHash: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.urlHash)) return false;
    seen.add(item.urlHash);
    return true;
  });
}
