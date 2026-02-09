/**
 * Hotness scoring: time decay, velocity, diversity.
 * Used for topic/trend discovery and Topic Radar.
 */

const TAU_HOURS = 72;
const VELOCITY_WINDOW_HOURS = 2;
const DIVERSITY_WINDOW_HOURS = 24;
const WEIGHT_MENTION = 0.5;
const WEIGHT_VELOCITY = 0.3;
const WEIGHT_DIVERSITY = 0.2;

export interface HotnessItem {
  fetched_at: Date;
  source_id: string;
}

/**
 * Mention score: exponential decay by age (single item or sum over items).
 */
export function mentionScore(ageHours: number): number {
  return Math.exp(-ageHours / TAU_HOURS);
}

/**
 * Compute hot score for a single item in the context of all items (for velocity/diversity).
 */
export function computeHotScore(
  item: HotnessItem,
  allItems: HotnessItem[],
  now: Date = new Date()
): number {
  const ageHours = (now.getTime() - new Date(item.fetched_at).getTime()) / (1000 * 60 * 60);
  const m = mentionScore(ageHours);

  const nowMs = now.getTime();
  const window2h = VELOCITY_WINDOW_HOURS * 60 * 60 * 1000;
  const recentCount = allItems.filter(
    (i) => i.source_id === item.source_id && nowMs - new Date(i.fetched_at).getTime() < window2h
  ).length;
  const prevCount = allItems.filter((i) => {
    if (i.source_id !== item.source_id) return false;
    const t = nowMs - new Date(i.fetched_at).getTime();
    return t >= window2h && t < 2 * window2h;
  }).length;
  const velocity = prevCount > 0 ? Math.min(2, recentCount / prevCount) : (recentCount > 0 ? 1 : 0);

  const window24h = DIVERSITY_WINDOW_HOURS * 60 * 60 * 1000;
  const uniqueSources = new Set(
    allItems.filter((i) => nowMs - new Date(i.fetched_at).getTime() < window24h).map((i) => i.source_id)
  ).size;
  const diversity = Math.log(1 + uniqueSources) / Math.log(1 + 10);

  return WEIGHT_MENTION * m + WEIGHT_VELOCITY * velocity + WEIGHT_DIVERSITY * Math.min(1, diversity);
}

/**
 * Sparkline: counts per bucket (e.g. 6h buckets for last 7 days).
 */
export function computeSparkline(
  items: { fetched_at: Date }[],
  now: Date = new Date(),
  bucketHours = 6,
  bucketCount = 28
): number[] {
  const buckets = new Array(bucketCount).fill(0);
  const start = now.getTime() - bucketCount * bucketHours * 60 * 60 * 1000;
  const bucketMs = bucketHours * 60 * 60 * 1000;

  for (const item of items) {
    const t = new Date(item.fetched_at).getTime();
    if (t < start || t > now.getTime()) continue;
    const idx = Math.floor((t - start) / bucketMs);
    if (idx >= 0 && idx < bucketCount) buckets[idx]++;
  }
  return buckets;
}
