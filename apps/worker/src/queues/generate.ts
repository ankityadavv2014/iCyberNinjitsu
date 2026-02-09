import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis.js';

export function getGenerateQueue() {
  return new Queue('generate', {
    connection: getRedisConnection(),
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300000 } },
  });
}
