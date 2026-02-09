import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export function getGenerateQueue() {
  return new Queue('generate', {
    connection,
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300000 } },
  });
}
