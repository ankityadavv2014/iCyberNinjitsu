# iCyberNinjitsu

Multi-channel social operations platform: Signal → Trend → Draft → Govern → Publish → Moderate.

**Deploy:** See [DEPLOY.md](./DEPLOY.md) for pushing to GitHub and publishing the frontend on Vercel (plus backend options).

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 15 (apps/web)
- **Backend**: Express (apps/api)
- **Worker**: BullMQ (apps/worker)
- **DB**: Postgres, **Queue**: Redis
- **Packages**: shared, db, ingest, rank, generate, linkedin, image-gen (post images with drafts)
- **LLM**: Anthropic Claude (via `@anthropic-ai/sdk`)

## Posting safety (manual-first)

- **Worker is off by default**: `.env.example` sets `ASTRA_WORKER_DISABLED=1`. No auto ingest/schedule/publish until you turn it on.
- **Post and test manually** via the app (Schedule → “Post now”, or approve drafts and schedule one at a time). Understand impact before enabling the worker.
- **Clear schedule backlog**: If you had runaway scheduled/failed jobs, run once from repo root:  
  `npm run stop-schedule`  
  This cancels all queued jobs and clears schedule + attempt history so the dashboard shows 0 Scheduled / 0 Recent failures.

## Quick start (get the server running)

1. Copy `.env.example` to `.env` and set at least `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY` (see Environment variables). Worker stays disabled until you set `ASTRA_WORKER_DISABLED=0`.
2. Start Postgres and Redis: `docker compose up -d` (Postgres on host port **5433**, Redis on 6379).
3. From repo root: `npm install` then `npm run db:migrate` then `node --import tsx scripts/seed.ts`. If using Docker ports: `DATABASE_URL=postgresql://astra:astra@localhost:5433/astra node --import tsx scripts/migrate.ts` and same for seed.
4. Start API and web (two terminals from repo root):
   - **Terminal 1:** `npm run dev:api` → API at http://localhost:4000
   - **Terminal 2:** `npm run dev:web` → App at http://localhost:3000
   Optionally run `./scripts/dev-start.sh all` to kill stale processes and start web + API + worker together.
5. Open http://localhost:3000 — select workspace, go to Dashboard. Run pipeline to ingest; generate posts from the **Trends from feed** section (each draft gets an auto-generated image when the worker runs). **Do not** run `npm run dev:worker` until you want automation.

## Dependencies and security

- All workspace `package.json` files use recent stable versions (Next 14, React 18, TypeScript 5.6, etc.).
- After pulling changes or editing dependencies, run from repo root:
  - `pnpm install` — install/update packages.
  - `pnpm audit` — list vulnerabilities.
  - `pnpm run audit:fix` — apply fixes where possible (may add overrides).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `ENCRYPTION_KEY` | Yes | AES key for LinkedIn token encryption |
| `ANTHROPIC_API_KEY` | For real LLM | Anthropic API key (falls back to mock if unset) |
| `LINKEDIN_CLIENT_ID` | For LinkedIn | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | For LinkedIn | LinkedIn OAuth app client secret |
| `LINKEDIN_CALLBACK_URL` | For LinkedIn | OAuth callback URL |
| `NEWSAPI_KEY` | Optional | NewsAPI key for news source adapter |
| `NEXT_PUBLIC_API_URL` | Optional | API URL for the web app (default `http://localhost:4000`) |

## Full end-to-end flow

1. **Start infra**: `docker-compose up -d`
2. **Migrate + seed**: `npm run db:migrate && node --import tsx scripts/seed.ts`
3. **Set env**: In `.env`, set `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`. Optionally `LINKEDIN_CLIENT_ID`/`SECRET`/`CALLBACK_URL` for real LinkedIn posting.
4. **Start services**: `npm run dev:api`, `npm run dev:worker`, `npm run dev:web` (3 terminals)
5. **Open app**: http://localhost:3000 -- enter token (dev token pre-filled) -- dashboard loads with "Default" workspace
6. **Add source**: Sources page -- add an RSS feed URL (e.g. `https://hnrss.org/frontpage`)
7. **Ingest**: Dashboard -- click "Ingest now" -- worker fetches RSS items
8. **Generate**: Via API: `curl -X POST http://localhost:4000/workspaces/<wid>/drafts/generate -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"post_type":"insight"}'` -- worker calls Claude -- draft appears in Drafts page
9. **Approve**: Drafts page -- click Approve on a pending draft
10. **Schedule**: Schedule page -- select the approved post, pick a future time, click Schedule
11. **Publish**: If LinkedIn is connected, the worker picks up the job and posts. Without LinkedIn credentials, the job fails (visible in Logs).

## Auth (v1 stub)

Send `Authorization: Bearer <user_id>` (UUID of a user in `users` table). The web app stores it in localStorage. The AuthGate on the dashboard prompts for it if missing.

## E2E

Browsers use project path `.playwright-browsers` (see `playwright.config.ts`). Install once: `npm run playwright:install` (or `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install`). Run with API and web up: `API_URL=http://localhost:4000 WEB_URL=http://localhost:3000 E2E_TOKEN=00000000-0000-0000-0000-000000000001 E2E_WORKSPACE_ID=00000000-0000-0000-0000-000000000002 npm run test:e2e`. Full setup: `docker compose up -d` → `DATABASE_URL=postgresql://astra:astra@localhost:5433/astra node --import tsx scripts/migrate.ts` → `node --import tsx scripts/seed.ts` → start API and web → run test:e2e as above.

## Plan

See execution plan in `.cursor/plans/` for API contracts, data model, and task backlog.
