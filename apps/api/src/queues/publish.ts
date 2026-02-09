import { Queue } from 'bullmq';
import * as IORedisNS from 'ioredis';

const IORedisCtor = (IORedisNS as unknown as { default?: new (url: string, opts: unknown) => unknown }).default
  ?? (IORedisNS as unknown as new (url: string, opts: unknown) => unknown;

const connection = new (IORedisCtor as any)(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export function getPublishQueue() {
  return new Queue('publish', {
    connection,
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 60000 } },
  });
}
