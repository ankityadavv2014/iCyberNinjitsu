import type { PlatformPlugin } from '../interface.js';
import type { PublishResult, RenderedDraft, RateLimitPolicy } from '../types.js';

/** X (Twitter) adapter — stub: returns not configured until X API credentials are wired. */
export const xPlatform: PlatformPlugin = {
  id: 'x',

  validateCapabilities(caps: string[]): boolean {
    const supported = new Set(['text', 'image', 'link']);
    return caps.every((c) => supported.has(c));
  },

  renderDraft(content: string): RenderedDraft {
    return { content };
  },

  async publish(_rendered: RenderedDraft, _credentials: unknown): Promise<PublishResult> {
    return {
      success: false,
      error: 'X (Twitter) platform not configured. Add credentials and implement publish.',
    };
  },

  rateLimitPolicy(): RateLimitPolicy {
    return { requestsPerMinute: 50, backoffMs: 1000 };
  },

  async fetchAnalytics(_postId: string, _credentials: unknown): Promise<import('../types.js').AnalyticsResult | null> {
    return null;
  },
};
