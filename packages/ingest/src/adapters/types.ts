import type { NormalizedTrendItem } from '../normalizer.js';

export interface IngestConfig {
  [key: string]: unknown;
}

export interface IngestAdapter {
  fetch(config: IngestConfig): Promise<NormalizedTrendItem[]>;
}
