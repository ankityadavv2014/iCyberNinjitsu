import { Queue } from 'bullmq';
// Import as namespace to avoid TS construct signature issues across environments
import * as IORedisNS from 'ioredis';

const IORedisCtor = (IORedisNS as unknown as { default?: new (url: string, opts: unknown) => unknown }).default
  ?? (IORedisNS as unknown as new (url: string, opts: unknown) => unknown;

const connection = new (IORedisCtor as any)(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export function getGenerateQueue() {
  return new Queue('generate', {
    connection,
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300000 } },
  });
}
