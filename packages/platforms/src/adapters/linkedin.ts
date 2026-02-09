import { createLinkedInClient } from 'linkedin';
import type { PlatformPlugin } from '../interface.js';
import type { PublishResult, RenderedDraft, RateLimitPolicy } from '../types.js';

export type LinkedInCredentialBag = {
  accessToken: string;
  ownerUrn?: string;
};

function isLinkedInCreds(c: unknown): c is LinkedInCredentialBag {
  return typeof c === 'object' && c !== null && typeof (c as LinkedInCredentialBag).accessToken === 'string';
}

export const linkedInPlatform: PlatformPlugin = {
  id: 'linkedin',

  validateCapabilities(caps: string[]): boolean {
    const supported = new Set(['text', 'image', 'link']);
    return caps.every((c) => supported.has(c));
  },

  renderDraft(content: string): RenderedDraft {
    return { content };
  },

  async publish(rendered: RenderedDraft, credentials: unknown): Promise<PublishResult> {
    if (!isLinkedInCreds(credentials)) {
      return { success: false, error: 'Invalid LinkedIn credentials' };
    }
    const client = createLinkedInClient({ accessToken: credentials.accessToken });
    const authorUrn = credentials.ownerUrn ?? 'urn:li:person:me';
    let imageUrn: string | undefined;
    if (rendered.imageBuffer && rendered.imageBuffer.length > 0) {
      const upload = await client.uploadImage(authorUrn, rendered.imageBuffer);
      if (upload.success) imageUrn = upload.imageUrn;
    }
    const result = await client.postCommentary(authorUrn, rendered.content, imageUrn);
    const postUrl = result.postUrn
      ? `https://www.linkedin.com/feed/update/${result.postUrn}/`
      : undefined;
    return {
      success: result.success,
      status: result.status,
      body: result.body,
      error: result.error,
      postUrn: result.postUrn,
      postUrl,
    };
  },

  rateLimitPolicy(): RateLimitPolicy {
    return { requestsPerMinute: 30, backoffMs: 2000 };
  },

  async fetchAnalytics(_postId: string, _credentials: unknown): Promise<import('../types.js').AnalyticsResult | null> {
    return null;
  },
};
