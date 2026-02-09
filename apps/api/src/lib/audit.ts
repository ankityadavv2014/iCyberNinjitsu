import { query } from 'db';

export async function insertAuditEvent(
  workspaceId: string,
  actorId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  await query(
    'INSERT INTO audit_events (workspace_id, actor_id, action, resource_type, resource_id, payload) VALUES ($1, $2, $3, $4, $5, $6)',
    [workspaceId, actorId, action, resourceType, resourceId, payload ? JSON.stringify(payload) : null]
  );
}
