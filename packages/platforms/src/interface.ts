import type { PublishResult, RenderedDraft, RateLimitPolicy, Capability, AnalyticsResult } from './types.js';

/** Credentials are platform-specific (e.g. LinkedIn token set, X bearer token). */
export type CredentialBag = unknown;

export interface PlatformPlugin {
  id: string;

  validateCapabilities(caps: Capability[]): boolean;

  /** Format draft content for this platform (e.g. strip markdown, length limit). */
  renderDraft(content: string, _brandVoice?: string): RenderedDraft;

  /** Publish rendered content; credentials shape is platform-specific. */
  publish(rendered: RenderedDraft, credentials: CredentialBag): Promise<PublishResult>;

  rateLimitPolicy(): RateLimitPolicy;

  /** Fetch analytics for a published post; stub returns empty until implemented. */
  fetchAnalytics?(postId: string, credentials: CredentialBag): Promise<AnalyticsResult | null>;
}
