/** Shared frontend types for the Astra dashboard */

export type Draft = {
  id: string;
  workspaceId: string;
  trendItemId: string | null;
  content: string;
  postType: string;
  templateId: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleJob = {
  id: string;
  approvedPostId: string;
  status: string;
  jobId: string | null;
  attempts: unknown;
  createdAt: string;
  updatedAt: string;
};

export type Source = {
  id: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
};

export type Topic = {
  id: string;
  keyword: string;
  weight: number;
  createdAt: string;
};

export type TrendItem = {
  id: string;
  workspaceId: string;
  sourceId: string;
  url: string;
  urlHash: string;
  title: string;
  summary: string | null;
  score: number | null;
  fetchedAt: string;
};

export type ApprovedPost = {
  id: string;
  draftPostId: string;
  approvedAt: string;
  scheduledFor?: string;
  scheduleJobId?: string | null;
};

export type PublishAttempt = {
  id: string;
  scheduleJobId: string;
  success: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  attemptedAt: string;
  content: string | null;
  platform: string;
  linkedInPostUrl: string | null;
};
