import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis.js';

export function getRankQueue() {
  return new Queue('rank', {
    connection: getRedisConnection(),
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300000 } },
  });
}
