import { query } from 'db';
import { getIngestQueue } from '../queues/ingest.js';

export async function runScheduledIngest() {
  const { rows } = await query<{ id: string }>('SELECT id FROM workspaces WHERE paused = false');
  const queue = getIngestQueue();
  for (const w of rows) {
    await queue.add('ingest', { workspaceId: w.id }, { jobId: `ingest-${w.id}-${Date.now()}` });
  }
}
