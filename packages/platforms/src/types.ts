export type PlatformId = 'linkedin' | 'x';

export type PublishResult = {
  success: boolean;
  status?: number;
  body?: string;
  error?: string;
  postUrn?: string;
  postUrl?: string;
};

export type RenderedDraft = {
  content: string;
  imageBuffer?: Buffer;
};

export type ConnectResult = {
  success: boolean;
  error?: string;
};

export type RateLimitPolicy = {
  requestsPerMinute?: number;
  backoffMs?: number;
};

export type Capability = 'text' | 'image' | 'video' | 'carousel' | 'link';

export type AnalyticsResult = {
  postId: string;
  impressions?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  fetchedAt?: string;
};
