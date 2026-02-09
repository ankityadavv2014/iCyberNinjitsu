import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis.js';

export function getMomentumQueue() {
  return new Queue('momentum', {
    connection: getRedisConnection(),
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 60000 } },
  });
}
