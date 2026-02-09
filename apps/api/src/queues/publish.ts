import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export function getPublishQueue() {
  return new Queue('publish', {
    connection,
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 60000 } },
  });
}
