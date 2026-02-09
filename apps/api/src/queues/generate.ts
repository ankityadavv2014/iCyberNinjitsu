import { Queue } from 'bullmq';
// Import as namespace and normalize constructor for different module shapes (CJS/ESM)
import * as IORedisNS from 'ioredis';

type IORedisCtorType = new (url: string, opts: unknown) => unknown;
const IORedisAny = IORedisNS as unknown as { default?: IORedisCtorType } & IORedisCtorType;
const IORedisCtor: IORedisCtorType = IORedisAny.default ?? (IORedisAny as unknown as IORedisCtorType);

const connection = new IORedisCtor(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

export function getGenerateQueue() {
  return new Queue('generate', {
    connection,
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300000 } },
  });
}
