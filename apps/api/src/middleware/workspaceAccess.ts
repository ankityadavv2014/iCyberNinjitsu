import { Request, Response, NextFunction } from 'express';
import { query } from 'db';

declare global {
  namespace Express {
    interface Request {
      workspaceId?: string;
    }
  }
}

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
    res.status(403).json({ code: 'FORBIDDEN', message: 'No access to workspace' });
    return;
  }
  req.workspaceId = workspaceId;
  next();
}
