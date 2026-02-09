# Audit and rate limiting

## Audit events

Critical actions write to `audit_events` (see `packages/db` migrations). Events include:

| Action | Resource | When |
|--------|----------|------|
| `draft.approved` | draft_post | User approves a draft (with optional scheduled_for) |
| `draft.rejected` | draft_post | User rejects a draft |
| `credential.connected` | credential | OAuth callback stores LinkedIn tokens (actor null) |
| `credential.disconnected` | credential | User disconnects LinkedIn |

All events are workspace-scoped. Actor is the authenticated user id, or null for system/callback flows.

## Publish idempotency and retries

- **Idempotency:** The publish path skips posting if the approved post is already completed (duplicate schedule or retry). `publish_attempts` and `schedule_jobs` record success/failure.
- **Retries:** BullMQ publish queue uses `attempts: 5` and exponential backoff (see `apps/worker` queues). Failed jobs are retried according to the queue config.
- **Rate limiting:** Platform adapters expose `rateLimitPolicy()` (e.g. LinkedIn 30 req/min, backoff 2s). The worker does not currently throttle by policy; implement per-platform throttling in the publish processor if needed.

## Job runs

Pipeline stages (ingest, rank, momentum, generate, schedule, publish) write to `job_runs` for observability. Use `GET /workspaces/:id/job-runs` to list runs by stage and time range.
