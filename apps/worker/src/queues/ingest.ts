import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis.js';

export function getIngestQueue() {
  return new Queue('ingest', {
    connection: getRedisConnection(),
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
  });
}
