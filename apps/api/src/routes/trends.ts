import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { addIngestJob } from '../queues/ingest.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { computeHotScore, computeSparkline, type HotnessItem } from 'rank';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

router.get('/momentum', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const { rows } = await query<{
    id: string; label: string; keywords: unknown;
    hot_score: number; velocity: number; source_diversity: number; confidence: number; computed_at: Date | null;
  }>(
    `SELECT tc.id, tc.label, tc.keywords,
        COALESCE(tm.hot_score, 0) AS hot_score, COALESCE(tm.velocity, 0) AS velocity,
        COALESCE(tm.source_diversity, 0) AS source_diversity, COALESCE(tm.confidence, 0) AS confidence,
        tm.computed_at
     FROM topic_clusters tc
     LEFT JOIN topic_momentum tm ON tm.topic_id = tc.id
     WHERE tc.workspace_id = $1
     ORDER BY COALESCE(tm.hot_score, 0) DESC, tc.created_at DESC
     LIMIT $2`,
    [wId, limit]
  );
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      label: r.label,
      keywords: r.keywords,
      hotScore: Number(r.hot_score),
      velocity: Number(r.velocity),
      sourceDiversity: Number(r.source_diversity),
      confidence: Number(r.confidence),
      computedAt: r.computed_at?.toISOString() ?? null,
    })),
  });
}));

router.get('/topic-clusters/:topicId', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const topicId = req.params.topicId;
  const { rows: topic } = await query<{ id: string; label: string; keywords: unknown }>(
    'SELECT id, label, keywords FROM topic_clusters WHERE id = $1 AND workspace_id = $2',
    [topicId, wId]
  );
  if (topic.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const { rows: topSources } = await query<{ source_id: string; strength: number; frequency: number; type: string; config: unknown }>(
    `SELECT ce.source_id, ce.strength, ce.frequency, s.type, s.config
     FROM correlation_edges ce
     JOIN sources s ON s.id = ce.source_id
     WHERE ce.topic_id = $1
     ORDER BY ce.strength DESC
     LIMIT 10`,
    [topicId]
  );
  const { rows: strategies } = await query<{ id: string; name: string; slug: string; description: string | null }>(
    'SELECT id, name, slug, description FROM topic_bundles WHERE workspace_id = $1 ORDER BY sort_order, name LIMIT 10',
    [wId]
  );
  res.json({
    topic: { id: topic[0].id, label: topic[0].label, keywords: topic[0].keywords },
    topSources: topSources.map((r) => ({ sourceId: r.source_id, strength: Number(r.strength), frequency: r.frequency, type: r.type, config: r.config })),
    recommendedStrategies: strategies.map((r) => ({ id: r.id, name: r.name, slug: r.slug, description: r.description })),
  });
}));

router.get('/discovery', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { rows: allRows } = await query<{ id: string; source_id: string; fetched_at: Date; title: string; url: string; score: number | null }>(
    `SELECT id, source_id, fetched_at, title, url, score FROM trend_items WHERE workspace_id = $1 AND fetched_at >= $2 ORDER BY fetched_at DESC`,
    [wId, since]
  );
  const hotnessItems: HotnessItem[] = allRows.map((r) => ({ fetched_at: r.fetched_at, source_id: r.source_id }));
  const now = new Date();
  const withScore = allRows.map((r) => ({
    ...r,
    hotScore: computeHotScore({ fetched_at: r.fetched_at, source_id: r.source_id }, hotnessItems, now),
  }));
  withScore.sort((a, b) => b.hotScore - a.hotScore);
  const top = withScore.slice(0, limit);
  const sparkline = computeSparkline(allRows.map((r) => ({ fetched_at: r.fetched_at })), now, 6, 28);
  res.json({
    items: top.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      score: r.score != null ? Number(r.score) : null,
      hotScore: Math.round(r.hotScore * 100) / 100,
      fetchedAt: r.fetched_at,
    })),
    sparkline,
  });
}));

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
