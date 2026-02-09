import { Job } from 'bullmq';
import { query } from 'db';
import { computeTopicMomentum } from 'rank';
import { insertJobRun, updateJobRun } from '../lib/jobRuns.js';

export type MomentumJobPayload = { workspaceId: string };

const WINDOW_HOURS = 24;
const DEFAULT_CLUSTER_LABEL = 'Recent';

export async function processMomentumJob(job: Job<MomentumJobPayload>) {
  const { workspaceId } = job.data;
  const runId = await insertJobRun(workspaceId, 'momentum', { referenceId: job.id, triggerType: 'api' });
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1) Get or create default topic_cluster for workspace
    let { rows: clusters } = await query<{ id: string }>(
      'SELECT id FROM topic_clusters WHERE workspace_id = $1 LIMIT 1',
      [workspaceId]
    );
    let topicId: string;
    if (clusters.length === 0) {
      const { rows: inserted } = await query<{ id: string }>(
        `INSERT INTO topic_clusters (workspace_id, label, keywords) VALUES ($1, $2, '[]') RETURNING id`,
        [workspaceId, DEFAULT_CLUSTER_LABEL]
      );
      topicId = inserted[0].id;
    } else {
      topicId = clusters[0].id;
    }

    // 2) Assign unassigned trend_items (last 7d) to this cluster
    await query(
      `UPDATE trend_items SET topic_cluster_id = $1 WHERE workspace_id = $2 AND fetched_at >= $3 AND topic_cluster_id IS NULL`,
      [topicId, workspaceId, since]
    );

    // 3) Upsert correlation_edges from trend_items in this topic
    const { rows: bySource } = await query<{ source_id: string; cnt: string; max_fetched: Date }>(
      `SELECT source_id, COUNT(*)::text AS cnt, MAX(fetched_at) AS max_fetched
       FROM trend_items WHERE topic_cluster_id = $1 AND fetched_at >= $2
       GROUP BY source_id`,
      [topicId, since]
    );
    for (const r of bySource) {
      const strength = Math.min(1, parseInt(r.cnt, 10) / 20);
      await query(
        `INSERT INTO correlation_edges (topic_id, source_id, strength, frequency, last_seen_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (topic_id, source_id) DO UPDATE SET strength = $3, frequency = $4, last_seen_at = $5`,
        [topicId, r.source_id, strength, parseInt(r.cnt, 10), r.max_fetched]
      );
    }

    // 4) Momentum inputs: signal counts in current vs previous window, sources, latest, confidence
    const now = new Date();
    const currentStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

    const { rows: countCurrent } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM trend_items WHERE topic_cluster_id = $1 AND fetched_at >= $2`,
      [topicId, currentStart]
    );
    const { rows: countPrevious } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM trend_items WHERE topic_cluster_id = $1 AND fetched_at >= $2 AND fetched_at < $3`,
      [topicId, previousStart, currentStart]
    );
    const { rows: latestRow } = await query<{ fetched_at: Date }>(
      `SELECT MAX(fetched_at) AS fetched_at FROM trend_items WHERE topic_cluster_id = $1`,
      [topicId]
    );
    const { rows: sourceStats } = await query<{ unique_sources: string; total: string }>(
      `SELECT COUNT(DISTINCT source_id)::text AS unique_sources, COUNT(*)::text AS total
       FROM trend_items WHERE topic_cluster_id = $1 AND fetched_at >= $2`,
      [topicId, currentStart]
    );

    const signalCountCurrent = parseInt(countCurrent[0]?.count ?? '0', 10);
    const signalCountPrevious = parseInt(countPrevious[0]?.count ?? '0', 10);
    const uniqueSources = parseInt(sourceStats[0]?.unique_sources ?? '0', 10);
    const totalSourceOccurrences = parseInt(sourceStats[0]?.total ?? '0', 10);

    const { rows: prevMomentum } = await query<{ velocity: number }>(
      'SELECT velocity FROM topic_momentum WHERE topic_id = $1',
      [topicId]
    );
    const velocityPrevious = prevMomentum[0]?.velocity ?? 0;

    const { rows: avgConf } = await query<{ avg_val: number | null }>(
      `SELECT AVG(stp.credibility_score * ce.strength)::double precision AS avg_val
       FROM correlation_edges ce
       JOIN source_trust_profiles stp ON stp.source_id = ce.source_id
       WHERE ce.topic_id = $1`,
      [topicId]
    );
    const avgConfidence = avgConf[0]?.avg_val ?? 0.5;

    const result = computeTopicMomentum(
      {
        signalCountCurrent,
        signalCountPrevious,
        velocityPrevious,
        windowHours: WINDOW_HOURS,
        uniqueSources,
        totalSourceOccurrences,
        latestSignalAt: latestRow[0]?.fetched_at ?? null,
        avgConfidence: Number(avgConfidence),
      },
      now
    );

    await query(
      `INSERT INTO topic_momentum (topic_id, hot_score, velocity, acceleration, source_diversity, freshness, confidence, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (topic_id) DO UPDATE SET
         hot_score = $2, velocity = $3, acceleration = $4, source_diversity = $5, freshness = $6, confidence = $7, computed_at = $8`,
      [
        topicId,
        result.hotScore,
        result.velocity,
        result.acceleration,
        result.sourceDiversity,
        result.freshness,
        result.confidence,
        now,
      ]
    );

    const ACTION_QUEUE_THRESHOLD = 0.25;
    if (result.hotScore >= ACTION_QUEUE_THRESHOLD) {
      const { rows: existing } = await query(
        'SELECT id FROM action_queue WHERE topic_id = $1 AND workspace_id = $2 AND status = $3 LIMIT 1',
        [topicId, workspaceId, 'pending']
      );
      if (existing.length === 0) {
        await query(
          `INSERT INTO action_queue (workspace_id, topic_id, momentum_snapshot, status)
           VALUES ($1, $2, $3, 'pending')`,
          [workspaceId, topicId, JSON.stringify({ hotScore: result.hotScore, velocity: result.velocity, confidence: result.confidence })]
        );
      }
    }

    await updateJobRun(runId, 'completed');
    return { processed: true, topicId };
  } catch (err) {
    await updateJobRun(runId, 'failed', { errorMessage: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
