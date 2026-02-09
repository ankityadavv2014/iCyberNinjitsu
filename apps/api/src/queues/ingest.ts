import { Queue } from 'bullmq';
import * as IORedisNS from 'ioredis';

const IORedisCtor = (IORedisNS as unknown as { default?: new (url: string, opts: unknown) => unknown }).default
  ?? (IORedisNS as unknown as new (url: string, opts: unknown) => unknown;

const connection = new (IORedisCtor as any)(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export function getIngestQueue() {
  return new Queue('ingest', {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
  });
}

export async function addIngestJob(workspaceId: string, sourceIds?: string[]) {
  const queue = getIngestQueue();
  const job = await queue.add('ingest', { workspaceId, sourceIds });
  return job.id;
}
