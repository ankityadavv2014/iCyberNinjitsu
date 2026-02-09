import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { getGenerateQueue } from '../queues/generate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { insertAuditEvent } from '../lib/audit.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceMember);

type DraftRow = { id: string; workspace_id: string; trend_item_id: string | null; topic_id: string | null; viewpoint_id: string | null; platform: string; content: string; post_type: string; template_id: string | null; status: string; confidence_score: number | null; version: number; created_by: string; created_at: Date; updated_at: Date };

function mapDraft(r: DraftRow) {
  return { id: r.id, workspaceId: r.workspace_id, trendItemId: r.trend_item_id, topicId: r.topic_id, viewpointId: r.viewpoint_id, platform: r.platform, content: r.content, postType: r.post_type, templateId: r.template_id, status: r.status, confidenceScore: r.confidence_score, version: r.version, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at };
}

async function getEvidenceForTrendItem(trendItemId: string | null): Promise<{ url: string; title: string; fetchedAt: string } | null> {
  if (!trendItemId) return null;
  const { rows } = await query<{ url: string; title: string; fetched_at: Date }>(
    'SELECT url, title, fetched_at FROM trend_items WHERE id = $1',
    [trendItemId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return { url: r.url, title: r.title, fetchedAt: r.fetched_at.toISOString() };
}

router.get('/', asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const trendItemId = req.query.trend_item_id as string | undefined;
  const topicId = req.query.topic_id as string | undefined;
  const platform = req.query.platform as string | undefined;
  const viewpointId = req.query.viewpoint_id as string | undefined;
  const confidenceMin = req.query.confidence_min != null ? parseFloat(String(req.query.confidence_min)) : undefined;
  const confidenceMax = req.query.confidence_max != null ? parseFloat(String(req.query.confidence_max)) : undefined;
  const fromDate = req.query.from as string | undefined;
  const toDate = req.query.to as string | undefined;
  const search = req.query.search as string | undefined;
  const sort = (req.query.sort as string) || 'created_at';
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
  const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

  const params: unknown[] = [req.workspaceId];
  const conditions: string[] = ['dp.workspace_id = $1'];
  if (status) { params.push(status); conditions.push(`dp.status = $${params.length}`); }
  if (trendItemId) { params.push(trendItemId); conditions.push(`dp.trend_item_id = $${params.length}`); }
  if (topicId) { params.push(topicId); conditions.push(`dp.topic_id = $${params.length}`); }
  if (platform) { params.push(platform); conditions.push(`dp.platform = $${params.length}`); }
  if (viewpointId) { params.push(viewpointId); conditions.push(`dp.viewpoint_id = $${params.length}`); }
  if (confidenceMin != null && !Number.isNaN(confidenceMin)) { params.push(confidenceMin); conditions.push(`dp.confidence_score >= $${params.length}`); }
  if (confidenceMax != null && !Number.isNaN(confidenceMax)) { params.push(confidenceMax); conditions.push(`dp.confidence_score <= $${params.length}`); }
  if (fromDate) { params.push(fromDate); conditions.push(`dp.created_at >= $${params.length}`); }
  if (toDate) { params.push(toDate); conditions.push(`dp.created_at <= $${params.length}`); }
  if (search?.trim()) { params.push(`%${search.trim()}%`); conditions.push(`dp.content ILIKE $${params.length}`); }
  const whereClause = conditions.join(' AND ');

  const [countResult, listResult] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM draft_posts dp WHERE ${whereClause}`, params),
    (async () => {
      const orderCol = sort === 'updated_at' ? 'dp.updated_at' : 'dp.created_at';
      const orderDir = (req.query.order as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const listParams = [...params, limit, offset];
      const sql = `SELECT dp.id, dp.workspace_id, dp.trend_item_id, dp.topic_id, dp.viewpoint_id, dp.platform, dp.content, dp.post_type, dp.template_id, dp.status, dp.confidence_score, dp.version, dp.created_by, dp.created_at, dp.updated_at,
        ap.publish_failed_reason
        FROM draft_posts dp
        LEFT JOIN approved_posts ap ON ap.draft_post_id = dp.id AND ap.publish_failed_at IS NOT NULL
        WHERE ${whereClause}
        ORDER BY ${orderCol} ${orderDir} LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`;
      return query(sql, listParams);
    })(),
  ]);

  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
  const rows = listResult.rows;

  const items = await Promise.all(rows.map(async (r: DraftRow & { publish_failed_reason: string | null }) => {
    const evidence = await getEvidenceForTrendItem(r.trend_item_id);
    return {
      ...mapDraft(r),
      publishFailedReason: (r as any).publish_failed_reason ?? undefined,
      evidence: evidence ?? undefined,
    };
  }));

  res.json({ items, total, limit, offset });
}));

router.post('/', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { trend_item_id, topic_id, viewpoint_id, platform, post_type, template_id } = req.body ?? {};
  const content = (req.body?.content as string) ?? '';
  const { rows } = await query<DraftRow>(
    `INSERT INTO draft_posts (workspace_id, trend_item_id, topic_id, viewpoint_id, platform, content, post_type, template_id, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9) RETURNING id, workspace_id, trend_item_id, topic_id, viewpoint_id, platform, content, post_type, template_id, status, confidence_score, version, created_by, created_at, updated_at`,
    [wId, trend_item_id ?? null, topic_id ?? null, viewpoint_id ?? null, platform ?? 'linkedin', content, post_type ?? 'insight', template_id ?? null, req.userId]
  );
  const r = rows[0];
  res.status(201).json(mapDraft(r));
}));

router.post('/bulk-approve', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const draftIds = Array.isArray(req.body?.draftIds) ? (req.body.draftIds as string[]) : [];
  const scheduledFor = (req.body?.scheduled_for as string) ?? new Date(Date.now() + 86400000).toISOString();
  if (draftIds.length === 0) { res.status(422).json({ code: 'MISSING_DRAFT_IDS' }); return; }
  const results: { id: string; approved: boolean }[] = [];
  for (const id of draftIds) {
    const { rows: draft } = await query('SELECT id FROM draft_posts WHERE id = $1 AND workspace_id = $2 AND status IN ($3, $4)', [id, wId, 'pending_review', 'approved']);
    if (draft.length === 0) { results.push({ id, approved: false }); continue; }
    const { rows: existing } = await query('SELECT id FROM approved_posts WHERE draft_post_id = $1', [id]);
    if (existing.length > 0) {
      await query('UPDATE approved_posts SET approved_at = now(), scheduled_for = $1, publish_failed_at = NULL, publish_failed_reason = NULL, schedule_job_id = NULL WHERE draft_post_id = $2', [scheduledFor, id]);
    } else {
      await query('INSERT INTO approved_posts (draft_post_id, approved_by, scheduled_for) VALUES ($1, $2, $3)', [id, req.userId, scheduledFor]);
    }
    await query('UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2', ['approved', id]);
    results.push({ id, approved: true });
  }
  res.json({ results });
}));

router.post('/bulk-reject', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const draftIds = Array.isArray(req.body?.draftIds) ? (req.body.draftIds as string[]) : [];
  if (draftIds.length === 0) { res.status(422).json({ code: 'MISSING_DRAFT_IDS' }); return; }
  const results: { id: string; rejected: boolean }[] = [];
  for (const id of draftIds) {
    const { rowCount } = await query('UPDATE draft_posts SET status = $1 WHERE id = $2 AND workspace_id = $3', ['rejected', id, wId]);
    results.push({ id, rejected: rowCount !== 0 });
  }
  res.json({ results });
}));

router.post('/generate', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { trend_item_id, topic_id, topic_ids, post_type, viewpoint_id } = req.body ?? {};
  let trendItemId = trend_item_id;
  if (!trendItemId && (topic_id || (Array.isArray(topic_ids) && topic_ids.length > 0))) {
    const tid = topic_id ?? topic_ids?.[0];
    const { rows: trend } = await query<{ id: string }>(
      'SELECT id FROM trend_items WHERE topic_cluster_id = $1 AND workspace_id = $2 ORDER BY fetched_at DESC LIMIT 1',
      [tid, wId]
    );
    trendItemId = trend[0]?.id ?? null;
  }
  const queue = getGenerateQueue();
  const job = await queue.add('generate', { workspaceId: wId, trendItemId: trendItemId ?? undefined, topicIds: topic_ids, postType: post_type, viewpointId: viewpoint_id });
  res.status(202).json({ jobId: job.id });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, workspace_id, trend_item_id, topic_id, viewpoint_id, platform, content, post_type, template_id, status, confidence_score, version, created_by, created_at, updated_at FROM draft_posts WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const r = rows[0] as DraftRow;
  const evidence = await getEvidenceForTrendItem(r.trend_item_id);
  res.json({ ...mapDraft(r), evidence: evidence ?? undefined });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { content, status } = req.body ?? {};
  const updates: string[] = ['updated_at = now()'];
  const values: unknown[] = [];
  let i = 1;
  if (typeof content === 'string') {
    const { rows: current } = await query<{ version: number; content: string }>('SELECT version, content FROM draft_posts WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
    if (current.length > 0) {
      const cur = current[0];
      const nextVersion = cur.version + 1;
      await query('INSERT INTO draft_versions (draft_post_id, version, content) VALUES ($1, $2, $3) ON CONFLICT (draft_post_id, version) DO NOTHING', [req.params.id, cur.version, cur.content]);
      await query('INSERT INTO draft_versions (draft_post_id, version, content) VALUES ($1, $2, $3) ON CONFLICT (draft_post_id, version) DO UPDATE SET content = $3', [req.params.id, nextVersion, content]);
      updates.push(`content = $${i++}`); values.push(content);
      updates.push(`version = $${i++}`); values.push(nextVersion);
    } else {
      updates.push(`content = $${i++}`); values.push(content);
    }
  }
  if (status && ['draft', 'pending_review'].includes(status)) { updates.push(`status = $${i++}`); values.push(status); }
  if (values.length === 0) { res.status(422).json({ code: 'UNPROCESSABLE' }); return; }
  values.push(req.params.id, req.workspaceId);
  const { rows } = await query(
    `UPDATE draft_posts SET ${updates.join(', ')} WHERE id = $${i} AND workspace_id = $${i + 1} RETURNING id, workspace_id, trend_item_id, topic_id, viewpoint_id, platform, content, post_type, template_id, status, confidence_score, version, created_by, created_at, updated_at`,
    values
  );
  if (rows.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.json(mapDraft(rows[0] as DraftRow));
}));

router.post('/:id/images', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const draftId = req.params.id;
  const { imageBase64, image } = req.body ?? {};
  const raw = (imageBase64 ?? image) as string | undefined;
  if (!raw || typeof raw !== 'string') {
    res.status(422).json({ code: 'MISSING_IMAGE', message: 'Send imageBase64 or image (base64 or data URL).' });
    return;
  }
  const base64 = raw.includes('base64,') ? raw.split('base64,')[1]?.trim() : raw;
  if (!base64) {
    res.status(422).json({ code: 'INVALID_IMAGE', message: 'Invalid base64 image.' });
    return;
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    res.status(422).json({ code: 'INVALID_IMAGE', message: 'Could not decode base64.' });
    return;
  }
  if (buffer.length > 10 * 1024 * 1024) {
    res.status(422).json({ code: 'IMAGE_TOO_LARGE', message: 'Image must be under 10MB.' });
    return;
  }
  const { rows: draft } = await query('SELECT id FROM draft_posts WHERE id = $1 AND workspace_id = $2', [draftId, wId]);
  if (draft.length === 0) {
    res.status(404).json({ code: 'NOT_FOUND' });
    return;
  }
  await query(
    `INSERT INTO post_images (workspace_id, draft_post_id, image_data, generation_method, width, height)
     VALUES ($1, $2, $3, 'upload', 1200, 630)`,
    [wId, draftId, buffer]
  );
  res.status(201).json({ ok: true, message: 'Image attached to draft.' });
}));

router.get('/:id/versions', asyncHandler(async (req, res) => {
  const { rows: draft } = await query<{ version: number; content: string }>('SELECT version, content FROM draft_posts WHERE id = $1 AND workspace_id = $2', [req.params.id, req.workspaceId]);
  if (draft.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  const { rows: history } = await query<{ version: number; content: string; created_at: Date }>(
    'SELECT version, content, created_at FROM draft_versions WHERE draft_post_id = $1 ORDER BY version ASC',
    [req.params.id]
  );
  const currentVersion = draft[0].version;
  const byVersion = new Map(history.map((r) => [r.version, { version: r.version, content: r.content, createdAt: r.created_at }]));
  byVersion.set(currentVersion, { version: currentVersion, content: draft[0].content, createdAt: null });
  const items = Array.from(byVersion.entries())
    .map(([, v]) => ({ ...v, current: v.version === currentVersion }))
    .sort((a, b) => b.version - a.version);
  res.json({ items });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM draft_posts WHERE id = $1 AND workspace_id = $2 AND status = $3', [req.params.id, req.workspaceId, 'draft']);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  res.status(204).send();
}));

router.post('/:id/approve', asyncHandler(async (req, res) => {
  const scheduledFor = (req.body?.scheduled_for as string) ?? new Date(Date.now() + 86400000).toISOString();
  const { rows: draft } = await query(
    'SELECT id FROM draft_posts WHERE id = $1 AND workspace_id = $2 AND status IN ($3, $4)',
    [req.params.id, req.workspaceId, 'pending_review', 'approved']
  );
  if (draft.length === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }

  // Re-approval after publish failure: update existing approved_post instead of inserting
  const { rows: existing } = await query<{ id: string; draft_post_id: string; approved_by: string; approved_at: Date; scheduled_for: Date; schedule_job_id: string | null }>(
    'SELECT id, draft_post_id, approved_by, approved_at, scheduled_for, schedule_job_id FROM approved_posts WHERE draft_post_id = $1',
    [req.params.id]
  );

  if (existing.length > 0) {
    await query(
      'UPDATE approved_posts SET approved_at = now(), scheduled_for = $1, publish_failed_at = NULL, publish_failed_reason = NULL, schedule_job_id = NULL WHERE draft_post_id = $2',
      [scheduledFor, req.params.id]
    );
    const { rows: updated } = await query<{ id: string; draft_post_id: string; approved_by: string; approved_at: Date; scheduled_for: Date; schedule_job_id: string | null }>(
      'SELECT id, draft_post_id, approved_by, approved_at, scheduled_for, schedule_job_id FROM approved_posts WHERE draft_post_id = $1',
      [req.params.id]
    );
  await query('UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2', ['approved', req.params.id]);
  await insertAuditEvent(req.workspaceId!, req.userId!, 'draft.approved', 'draft_post', req.params.id, { scheduledFor });
  const r = updated[0];
  res.json({ id: r.id, draftPostId: r.draft_post_id, approvedBy: r.approved_by, approvedAt: r.approved_at, scheduledFor: r.scheduled_for, scheduleJobId: r.schedule_job_id });
  return;
  }

  const { rows } = await query<{ id: string; draft_post_id: string; approved_by: string; approved_at: Date; scheduled_for: Date; schedule_job_id: string | null }>(
    `INSERT INTO approved_posts (draft_post_id, approved_by, scheduled_for) VALUES ($1, $2, $3)
     RETURNING id, draft_post_id, approved_by, approved_at, scheduled_for, schedule_job_id`,
    [req.params.id, req.userId, scheduledFor]
  );
  await query('UPDATE draft_posts SET status = $1, updated_at = now() WHERE id = $2', ['approved', req.params.id]);
  await insertAuditEvent(req.workspaceId!, req.userId!, 'draft.approved', 'draft_post', req.params.id, { scheduledFor });
  const r = rows[0];
  res.json({ id: r.id, draftPostId: r.draft_post_id, approvedBy: r.approved_by, approvedAt: r.approved_at, scheduledFor: r.scheduled_for, scheduleJobId: r.schedule_job_id });
}));

router.post('/:id/reject', asyncHandler(async (req, res) => {
  const { rowCount } = await query('UPDATE draft_posts SET status = $1 WHERE id = $2 AND workspace_id = $3', ['rejected', req.params.id, req.workspaceId]);
  if (rowCount === 0) { res.status(404).json({ code: 'NOT_FOUND' }); return; }
  await insertAuditEvent(req.workspaceId!, req.userId!, 'draft.rejected', 'draft_post', req.params.id, {});
  const { rows } = await query('SELECT id, workspace_id, trend_item_id, topic_id, viewpoint_id, platform, content, post_type, template_id, status, confidence_score, version, created_by, created_at, updated_at FROM draft_posts WHERE id = $1', [req.params.id]);
  res.json(mapDraft(rows[0] as DraftRow));
}));
