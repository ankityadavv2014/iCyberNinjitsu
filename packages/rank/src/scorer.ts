export interface ScoreInput {
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  sourceName: string | null;
  keywords: string[];
  keywordWeights?: Record<string, number>;
}

export interface ScoreWeights {
  relevance: number;
  recency: number;
  credibility: number;
  novelty: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  relevance: 0.4,
  recency: 0.3,
  credibility: 0.2,
  novelty: 0.1,
};

export function score(input: ScoreInput, weights: Partial<ScoreWeights> = {}): number {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const text = `${input.title} ${input.summary ?? ''}`.toLowerCase();
  let relevance = 0;
  for (const kw of input.keywords) {
    if (text.includes(kw.toLowerCase())) {
      const weight = input.keywordWeights?.[kw] ?? 1;
      relevance += weight;
    }
  }
  relevance = Math.min(1, relevance / Math.max(1, input.keywords.length));

  let recency = 1;
  if (input.publishedAt) {
    const ageHours = (Date.now() - input.publishedAt.getTime()) / (1000 * 60 * 60);
    recency = Math.max(0, 1 - ageHours / 168);
  }

  const credibility = input.sourceName ? 0.8 : 0.3;
  const novelty = 0.5;
  return w.relevance * relevance + w.recency * recency + w.credibility * credibility + w.novelty * novelty;
}
