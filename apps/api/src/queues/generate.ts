import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Normalise CJS/ESM default export shape and keep the runtime type as `any`
const RedisImpl: any = (IORedis as any)?.default ?? IORedis;
const connection: any = new RedisImpl(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export function getGenerateQueue() {
  return new Queue('generate', {
    connection,
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300000 } },
  });
}
