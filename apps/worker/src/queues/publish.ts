import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis.js';

export function getPublishQueue() {
  return new Queue('publish', {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60000 },
    },
  });
}
