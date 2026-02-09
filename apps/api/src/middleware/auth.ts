import { Request, Response, NextFunction } from 'express';
import { query } from 'db';
import type { User } from 'shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const sessionCookie = req.headers.cookie?.includes('session=');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Stub: treat token as user id for dev; replace with JWT verify
    if (token.length === 36) userId = token;
    else {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64').toString());
        userId = payload.sub ?? payload.userId ?? null;
      } catch {
        /* ignore */
      }
    }
  }
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing or invalid auth' });
    return;
  }
  const { rows } = await query<{ id: string; email: string; name: string | null; created_at: Date; updated_at: Date }>(
    'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  if (rows.length === 0) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
    return;
  }
  const u = rows[0];
  req.user = {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
  req.userId = u.id;
  next();
}

/** Optional auth: set req.user if valid, do not 401 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    let userId: string | null = token.length === 36 ? token : null;
    if (!userId && token.includes('.')) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub ?? payload.userId ?? null;
      } catch {
        /* ignore */
      }
    }
    if (userId) {
      const { rows } = await query<{ id: string; email: string; name: string | null; created_at: Date; updated_at: Date }>(
        'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      if (rows.length > 0) {
        const u = rows[0];
        req.user = { id: u.id, email: u.email, name: u.name, createdAt: u.created_at, updatedAt: u.updated_at };
        req.userId = u.id;
      }
    }
  }
  next();
}
