export { score, type ScoreInput, type ScoreWeights } from './scorer.js';
export { dedupeByUrlHash } from './dedupe.js';
export {
  computeHotScore,
  computeSparkline,
  mentionScore,
  type HotnessItem,
} from './hotness.js';
export {
  computeTopicMomentum,
  computeVelocity,
  computeAcceleration,
  computeSourceDiversity,
  computeFreshness,
  MOMENTUM_WEIGHTS,
  type TopicMomentumInput,
} from './momentum.js';