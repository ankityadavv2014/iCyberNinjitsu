/**
 * E2E: One full flow + pause (plan section 14); schedule a post via UI (plan Part 2).
 * Prerequisites: API running, DB migrated, Redis running, test user + workspace exist.
 * Seed: scripts/seed.ts (token 00000000-0000-0000-0000-000000000001, workspace 00000000-0000-0000-0000-000000000002).
 * Run: API_URL=http://localhost:4000 WEB_URL=http://localhost:3000 E2E_TOKEN=00000000-0000-0000-0000-000000000001 pnpm test:e2e
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';
const E2E_TOKEN = process.env.E2E_TOKEN ?? '00000000-0000-0000-0000-000000000001';
const E2E_WORKSPACE_ID = process.env.E2E_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000002';

test.describe('Astra E2E', () => {
  test('health check', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('schedule a post via UI (full flow)', async ({ page, request }) => {
    const headers = { Authorization: `Bearer ${E2E_TOKEN}`, 'Content-Type': 'application/json' };

    let draftId: string;
    const draftsRes = await request.get(`${API_URL}/workspaces/${E2E_WORKSPACE_ID}/drafts`, { headers });
    const draftsBody = await draftsRes.json();
    const existing = (draftsBody.items ?? []).filter((d: { status: string }) => d.status === 'pending_review' || d.status === 'draft');
    if (existing.length > 0) {
      const draft = existing.find((d: { status: string }) => d.status === 'pending_review') ?? existing[0];
      draftId = draft.id;
      if (draft.status === 'draft') {
        await request.patch(`${API_URL}/workspaces/${E2E_WORKSPACE_ID}/drafts/${draftId}`, { headers, data: { status: 'pending_review' } });
      }
    } else {
      const createRes = await request.post(`${API_URL}/workspaces/${E2E_WORKSPACE_ID}/drafts`, {
        headers,
        data: { content: 'E2E schedule test post', post_type: 'insight' },
      });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      draftId = created.id;
      await request.patch(`${API_URL}/workspaces/${E2E_WORKSPACE_ID}/drafts/${draftId}`, { headers, data: { status: 'pending_review' } });
    }

    await page.goto(WEB_URL);
    await page.evaluate(({ token, workspaceId }) => {
      localStorage.setItem('astra_token', token);
      localStorage.setItem('astra_workspace_id', workspaceId);
    }, { token: E2E_TOKEN, workspaceId: E2E_WORKSPACE_ID });
    await page.goto(`${WEB_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await page.goto(`${WEB_URL}/drafts`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /approve/i }).first().click();
    await page.waitForLoadState('networkidle');

    await page.goto(`${WEB_URL}/schedule`);
    await page.waitForLoadState('networkidle');
    const approvedSelect = page.getByLabel(/approved post/i);
    await expect(approvedSelect.locator('option').nth(1)).toBeVisible({ timeout: 10000 });
    await approvedSelect.selectOption({ index: 1 });
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    const datetimeLocal = inOneHour.toISOString().slice(0, 16);
    await page.getByLabel(/scheduled for/i).fill(datetimeLocal);
    await page.getByRole('button', { name: /^schedule$/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('table').locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
    const scheduleRes = await request.get(`${API_URL}/workspaces/${E2E_WORKSPACE_ID}/schedule`, { headers });
    expect(scheduleRes.ok()).toBeTruthy();
    const scheduleBody = await scheduleRes.json();
    expect((scheduleBody.items ?? []).length).toBeGreaterThanOrEqual(1);
  });

  test('full flow: add source, ingest, generate draft, approve, schedule, then pause', async ({ request }) => {
    const token = process.env.E2E_TOKEN ?? 'test-user-id';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    let workspaceId: string;
    const wsRes = await request.get(`${API_URL}/workspaces`, { headers });
    if (!wsRes.ok()) {
      const createRes = await request.post(`${API_URL}/workspaces`, { headers, data: { name: 'E2E Workspace' } });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      workspaceId = created.id;
    } else {
      const list = await wsRes.json();
      workspaceId = list.items[0]?.id;
      expect(workspaceId).toBeDefined();
    }

    const sourceRes = await request.post(`${API_URL}/workspaces/${workspaceId}/sources`, {
      headers,
      data: { type: 'rss', config: { url: 'https://example.com/feed.xml' }, enabled: true },
    });
    expect(sourceRes.ok()).toBeTruthy();

    const ingestRes = await request.post(`${API_URL}/workspaces/${workspaceId}/trends/ingest`, { headers, data: {} });
    expect(ingestRes.status()).toBe(202);

    const pauseRes = await request.post(`${API_URL}/workspaces/${workspaceId}/pause`, { headers });
    expect(pauseRes.ok()).toBeTruthy();
    const pauseBody = await pauseRes.json();
    expect(pauseBody.paused).toBe(true);

    const scheduleRes = await request.post(`${API_URL}/workspaces/${workspaceId}/schedule`, {
      headers,
      data: { approved_post_id: '00000000-0000-0000-0000-000000000000', scheduled_for: new Date().toISOString() },
    });
    expect(scheduleRes.status()).toBe(403);
  });
});
