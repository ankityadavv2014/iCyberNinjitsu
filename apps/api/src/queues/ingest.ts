import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const RedisImpl: any = (IORedis as any)?.default ?? IORedis;
const connection: any = new RedisImpl(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

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
