import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.post('/pause', requireAuth, requireWorkspaceOwner, asyncHandler(async (req, res) => {
  await query('UPDATE workspaces SET paused = true, updated_at = now() WHERE id = $1', [req.workspaceId]);
  res.json({ paused: true });
}));

router.post('/resume', requireAuth, requireWorkspaceOwner, asyncHandler(async (req, res) => {
  await query('UPDATE workspaces SET paused = false, updated_at = now() WHERE id = $1', [req.workspaceId]);
  res.json({ paused: false });
}));

router.post('/kill-switch', requireAuth, requireWorkspaceOwner, asyncHandler(async (req, res) => {
  const scope = req.body?.scope ?? 'workspace';
  if (scope === 'workspace') {
    await query('UPDATE workspaces SET paused = true, updated_at = now() WHERE id = $1', [req.workspaceId]);
  } else if (process.env.KILL_SWITCH_GLOBAL === 'true') {
    await query('UPDATE workspaces SET paused = true, updated_at = now()');
  }
  res.json({ ok: true });
}));
