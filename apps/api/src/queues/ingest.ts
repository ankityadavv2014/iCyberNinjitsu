import { Queue } from 'bullmq';
import * as IORedisNS from 'ioredis';

type IORedisCtorType = new (url: string, opts: unknown) => unknown;
const IORedisAny = IORedisNS as unknown as { default?: IORedisCtorType } & IORedisCtorType;
const IORedisCtor: IORedisCtorType = IORedisAny.default ?? (IORedisAny as unknown as IORedisCtorType);

const connection = new IORedisCtor(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

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
