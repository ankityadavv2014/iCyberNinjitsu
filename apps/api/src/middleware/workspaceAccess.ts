import { Request, Response, NextFunction } from 'express';
import { query } from 'db';
import type { WorkspaceRole } from 'shared';

declare global {
  namespace Express {
    interface Request {
      workspaceId?: string;
      workspaceRole?: WorkspaceRole;
    }
  }
}

/** Require user to be any member of the workspace; set req.workspaceId and req.workspaceRole. */
export async function requireWorkspaceMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  const workspaceId = req.params.workspaceId ?? req.params.w ?? req.params.id;
  if (!workspaceId || !req.userId) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'No access to workspace' });
    return;
  }
  const { rows } = await query<{ workspace_id: string; role: string }>(
    `SELECT wm.workspace_id, wm.role FROM workspace_members wm
     INNER JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
    [workspaceId, req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Workspace not found' });
    return;
  }
  req.workspaceId = rows[0].workspace_id;
  req.workspaceRole = rows[0].role as WorkspaceRole;
  next();
}

/** Require user to be the workspace owner (for delete, member management, provider app config). */
export async function requireWorkspaceOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const workspaceId = req.params.workspaceId ?? req.params.w ?? req.params.id;
  if (!workspaceId || !req.userId) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'No access to workspace' });
    return;
  }
  const { rows } = await query<{ owner_id: string }>(
    'SELECT owner_id FROM workspaces WHERE id = $1',
    [workspaceId]
  );
  if (rows.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Workspace not found' });
    return;
  }
  if (rows[0].owner_id !== req.userId) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Owner access required' });
    return;
  }
  req.workspaceId = workspaceId;
  req.workspaceRole = 'owner';
  next();
}

/** Require at least editor (can edit content); viewer is read-only. */
export function requireEditor(req: Request, res: Response, next: NextFunction): void {
  const role = req.workspaceRole;
  if (role === 'owner' || role === 'admin' || role === 'editor') {
    next();
    return;
  }
  res.status(403).json({ code: 'FORBIDDEN', message: 'Editor access required' });
}

/** Require at least admin (can manage members, settings). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.workspaceRole;
  if (role === 'owner' || role === 'admin') {
    next();
    return;
  }
  res.status(403).json({ code: 'FORBIDDEN', message: 'Admin access required' });
}
