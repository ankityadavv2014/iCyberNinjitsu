import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows } = await query<{ id: string; draft_post_id: string; approved_at: Date }>(
    `SELECT ap.id, ap.draft_post_id, ap.approved_at
     FROM approved_posts ap
     JOIN draft_posts dp ON dp.id = ap.draft_post_id
     WHERE dp.workspace_id = $1 AND ap.schedule_job_id IS NULL
     ORDER BY ap.approved_at DESC
     LIMIT 100`,
    [wId]
  );
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      draftPostId: r.draft_post_id,
      approvedAt: r.approved_at,
    })),
  });
}));
