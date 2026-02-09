import { Queue } from 'bullmq';
import * as IORedisNS from 'ioredis';

type IORedisCtorType = new (url: string, opts: unknown) => unknown;
const IORedisAny = IORedisNS as unknown as { default?: IORedisCtorType } & IORedisCtorType;
const IORedisCtor: IORedisCtorType = IORedisAny.default ?? (IORedisAny as unknown as IORedisCtorType);

const connection = new IORedisCtor(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null } as any);

export function getPublishQueue() {
  return new Queue('publish', {
    connection,
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 60000 } },
  });
}
