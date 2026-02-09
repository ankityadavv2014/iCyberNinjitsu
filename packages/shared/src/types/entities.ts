export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  paused: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export type SourceType = 'rss' | 'url' | 'trend_provider' | 'reddit' | 'quora' | 'twitter' | 'linkedin';

/** PRD: status active | candidate | disabled. tenant_id = workspace_id. */
export type SourceStatus = 'active' | 'candidate' | 'disabled';

export interface Source {
  id: string;
  workspaceId: string;
  type: SourceType;
  config: Record<string, unknown>;
  enabled: boolean;
  status: SourceStatus;
  trustProfileId: string | null;
  createdAt: Date;
}

export interface SourceTrustProfile {
  id: string;
  sourceId: string;
  credibilityScore: number;
  historicalAccuracy: number | null;
  biasVector: Record<string, unknown> | null;
  latencyScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  workspaceId: string;
  keyword: string;
  weight: number;
  createdAt: Date;
}

/** PRD Signal: tenant_id = workspace_id. */
export interface TrendItem {
  id: string;
  workspaceId: string;
  sourceId: string;
  externalId: string | null;
  url: string;
  urlHash: string;
  title: string;
  summary: string | null;
  score: number | null;
  raw: Record<string, unknown> | null;
  fetchedAt: Date;
  platform: string | null;
  author: string | null;
  publishedAt: Date | null;
  content: string | null;
  engagementMetrics: Record<string, number> | null;
}

export type DraftStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface DraftPost {
  id: string;
  workspaceId: string;
  trendItemId: string | null;
  topicId: string | null;
  viewpointId: string | null;
  platform: string;
  content: string;
  postType: string;
  templateId: string | null;
  status: DraftStatus;
  confidenceScore: number | null;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovedPost {
  id: string;
  draftPostId: string;
  approvedBy: string;
  approvedAt: Date;
  scheduledFor: Date;
  scheduleJobId: string | null;
}

export type ScheduleJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScheduleJob {
  id: string;
  approvedPostId: string;
  status: ScheduleJobStatus;
  jobId: string | null;
  attempts: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishAttempt {
  id: string;
  scheduleJobId: string;
  success: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  attemptedAt: Date;
}

export interface Credential {
  id: string;
  workspaceId: string;
  provider: string;
  encryptedTokens: Record<string, unknown> | null;
  refreshAt: Date | null;
  createdAt: Date;
}

export interface PromptTemplate {
  id: string;
  workspaceId: string;
  name: string;
  postType: string;
  body: string;
  variables: string[] | Record<string, unknown>;
  createdAt: Date;
}

export type PolicyKind = 'brand_voice' | 'citation' | 'safety' | 'throttle';

export interface PolicyRule {
  id: string;
  workspaceId: string;
  kind: PolicyKind;
  config: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  workspaceId: string | null;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
}
