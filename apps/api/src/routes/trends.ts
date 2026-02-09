import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { addIngestJob } from '../queues/ingest.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

router.get('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const sourceId = req.query.sourceId as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);
  const sort = (req.query.sort as string) === 'score' ? 'score DESC NULLS LAST' : 'fetched_at DESC';
  let sql = 'SELECT id, workspace_id, source_id, url, url_hash, title, summary, score, fetched_at FROM trend_items WHERE workspace_id = $1';
  const params: unknown[] = [wId];
  let i = 2;
  if (sourceId) { sql += ` AND source_id = $${i++}`; params.push(sourceId); }
  if (from) { sql += ` AND fetched_at >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND fetched_at <= $${i++}`; params.push(to); }
  sql += ` ORDER BY ${sort} LIMIT $${i}`;
  params.push(limit);
  const { rows } = await query<{ id: string; workspace_id: string; source_id: string; url: string; url_hash: string; title: string; summary: string | null; score: number | null; fetched_at: Date }>(sql, params);
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      sourceId: r.source_id,
      url: r.url,
      urlHash: r.url_hash,
      title: r.title,
      summary: r.summary,
      score: r.score != null ? Number(r.score) : null,
      fetchedAt: r.fetched_at,
    })),
  });
}));

router.post('/ingest', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const sourceIds = req.body?.sourceIds as string[] | undefined;
  const jobId = await addIngestJob(wId, sourceIds);
  res.status(202).json({ jobId });
}));
