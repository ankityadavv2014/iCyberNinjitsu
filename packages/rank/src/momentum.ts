/**
 * PRD Topic Momentum formula (v1.0):
 * hot_score = (w1*velocity) + (w2*acceleration) + (w3*source_diversity) + (w4*freshness) + (w5*confidence)
 * Default weights: w1=0.30, w2=0.20, w3=0.15, w4=0.15, w5=0.20
 */

export const MOMENTUM_WEIGHTS = {
  velocity: 0.3,
  acceleration: 0.2,
  sourceDiversity: 0.15,
  freshness: 0.15,
  confidence: 0.2,
} as const;

export interface TopicMomentumInput {
  /** Signal counts in current window (e.g. last 24h) */
  signalCountCurrent: number;
  /** Signal counts in previous window (e.g. 24–48h ago) */
  signalCountPrevious: number;
  /** Velocity in previous window (for acceleration) */
  velocityPrevious: number;
  /** Time window in hours */
  windowHours: number;
  /** Unique source count in current window */
  uniqueSources: number;
  /** Total source occurrences in current window */
  totalSourceOccurrences: number;
  /** Latest signal timestamp */
  latestSignalAt: Date | null;
  /** Avg of (source credibility * correlation strength) 0–1 */
  avgConfidence: number;
}

/**
 * Velocity = Δ(signal_count) / time_window (normalized per hour).
 * Returns 0–2 scale for stability.
 */
export function computeVelocity(
  signalCountCurrent: number,
  signalCountPrevious: number,
  windowHours: number
): number {
  if (windowHours <= 0) return 0;
  const delta = signalCountCurrent - signalCountPrevious;
  const velocityRaw = delta / windowHours;
  return Math.max(0, Math.min(2, 0.5 + velocityRaw / 10));
}

/**
 * Acceleration = Δ(velocity) / time_window.
 * Returns -1 to 1 scale.
 */
export function computeAcceleration(
  velocityCurrent: number,
  velocityPrevious: number,
  _windowHours: number
): number {
  const delta = velocityCurrent - velocityPrevious;
  return Math.max(-1, Math.min(1, delta));
}

/**
 * Source diversity = unique_sources / max(total_sources, 1).
 * Returns 0–1.
 */
export function computeSourceDiversity(uniqueSources: number, totalSourceOccurrences: number): number {
  if (totalSourceOccurrences <= 0) return 0;
  return Math.min(1, uniqueSources / Math.max(1, totalSourceOccurrences));
}

/**
 * Freshness = decay(now - latest_signal). Exponential decay, 72h half-life.
 */
export function computeFreshness(latestSignalAt: Date | null, now: Date = new Date()): number {
  if (!latestSignalAt) return 0;
  const ageHours = (now.getTime() - new Date(latestSignalAt).getTime()) / (1000 * 60 * 60);
  const TAU = 72;
  return Math.exp(-ageHours / TAU);
}

/**
 * Compute full TopicMomentum score and components.
 */
export function computeTopicMomentum(
  input: TopicMomentumInput,
  now: Date = new Date()
): {
  hotScore: number;
  velocity: number;
  acceleration: number;
  sourceDiversity: number;
  freshness: number;
  confidence: number;
} {
  const w = MOMENTUM_WEIGHTS;
  const velocity = computeVelocity(
    input.signalCountCurrent,
    input.signalCountPrevious,
    input.windowHours
  );
  const acceleration = computeAcceleration(velocity, input.velocityPrevious, input.windowHours);
  const sourceDiversity = computeSourceDiversity(input.uniqueSources, input.totalSourceOccurrences);
  const freshness = computeFreshness(input.latestSignalAt, now);
  const confidence = Math.max(0, Math.min(1, input.avgConfidence));

  const hotScore =
    w.velocity * velocity +
    w.acceleration * (acceleration + 1) * 0.5 +
    w.sourceDiversity * sourceDiversity +
    w.freshness * freshness +
    w.confidence * confidence;

  return {
    hotScore: Math.max(0, Math.min(1, hotScore)),
    velocity,
    acceleration,
    sourceDiversity,
    freshness,
    confidence,
  };
}
