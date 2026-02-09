import { Queue } from 'bullmq';
import { getRedisConnection } from '../lib/redis.js';

export function getScheduleQueue() {
  return new Queue('schedule', { connection: getRedisConnection() });
}
