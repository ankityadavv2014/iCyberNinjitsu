// Kill switch: set ASTRA_WORKER_DISABLED=1 in .env to prevent any posting until you're ready
// (env key kept as ASTRA_WORKER_DISABLED for backward compatibility)
if (process.env.ASTRA_WORKER_DISABLED === '1' || process.env.ASTRA_WORKER_DISABLED === 'true') {
  console.log('[worker] Disabled by ASTRA_WORKER_DISABLED. Exiting without starting.');
  process.exit(0);
}

import { Worker } from 'bullmq';
import { getRedisConnection } from './lib/redis.js';
import { processIngestJob } from './processors/ingestProcessor.js';
import { processRankJob } from './processors/rankProcessor.js';
import { processGenerateJob } from './processors/generateProcessor.js';
import { processScheduleJob, runScheduledPublish } from './processors/scheduleProcessor.js';
import { processPublishJob } from './processors/publishProcessor.js';
import { processMomentumJob } from './processors/momentumProcessor.js';

const connection = getRedisConnection();

const ingestWorker = new Worker('ingest', processIngestJob as (job: import('bullmq').Job) => Promise<unknown>, { connection });
const rankWorker = new Worker('rank', processRankJob as (job: import('bullmq').Job) => Promise<unknown>, { connection });
const momentumWorker = new Worker('momentum', processMomentumJob as (job: import('bullmq').Job) => Promise<unknown>, { connection });
const generateWorker = new Worker('generate', processGenerateJob as (job: import('bullmq').Job) => Promise<unknown>, { connection });
const scheduleWorker = new Worker('schedule', processScheduleJob as (job: import('bullmq').Job) => Promise<unknown>, { connection });
const publishWorker = new Worker('publish', processPublishJob as (job: import('bullmq').Job) => Promise<unknown>, { connection });

// Failure listeners for all workers
ingestWorker.on('failed', (_, err) => console.error('[worker] ingest failed:', err));
rankWorker.on('failed', (_, err) => console.error('[worker] rank failed:', err));
momentumWorker.on('failed', (_, err) => console.error('[worker] momentum failed:', err));
generateWorker.on('failed', (_, err) => console.error('[worker] generate failed:', err));
scheduleWorker.on('failed', (_, err) => console.error('[worker] schedule failed:', err));
publishWorker.on('failed', (_, err) => console.error('[worker] publish failed:', err));

console.log('Worker started: ingest, rank, momentum, generate, schedule, publish');

// Pipeline cron: ingest every 6 hours
const PIPELINE_CRON_MS = 6 * 60 * 60 * 1000;
const pipelineInterval = setInterval(() => {
  import('./lib/pipelineRunner.js').then(({ runScheduledIngest }) => runScheduledIngest().catch(console.error));
}, PIPELINE_CRON_MS);

// Schedule cron: check for due approved posts every 5 min
// Uses runScheduledPublish() directly instead of processScheduleJob({} as Job) hack
const SCHEDULE_CRON_MS = 5 * 60 * 1000;
const scheduleInterval = setInterval(() => {
  runScheduledPublish().catch(console.error);
}, SCHEDULE_CRON_MS);

// Auto-schedule: check every 60s for approved posts to auto-publish
const AUTO_SCHEDULE_CRON_MS = 60 * 1000;
const autoScheduleInterval = setInterval(() => {
  import('./processors/autoScheduleProcessor.js').then(({ runAutoSchedule }) => runAutoSchedule().catch(console.error));
}, AUTO_SCHEDULE_CRON_MS);
console.log('Auto-scheduler running (every 60s)');

async function gracefulShutdown() {
  console.log('[worker] Shutting down gracefully...');
  clearInterval(pipelineInterval);
  clearInterval(scheduleInterval);
  clearInterval(autoScheduleInterval);
  await Promise.all([
    ingestWorker.close(),
    rankWorker.close(),
    momentumWorker.close(),
    generateWorker.close(),
    scheduleWorker.close(),
    publishWorker.close(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
