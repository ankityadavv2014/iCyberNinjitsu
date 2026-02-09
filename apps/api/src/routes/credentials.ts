import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import { buildAuthUrl, exchangeCode, encryptTokens } from 'linkedin';
import { getLinkedInConfig } from './providerConfig.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { insertAuditEvent } from '../lib/audit.js';

export const router = Router({ mergeParams: true });

const LINKEDIN_PROVIDER = 'linkedin';

router.get('/linkedin', requireAuth, requireWorkspaceMember, asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows } = await query<{ refresh_at: Date | null }>(
    'SELECT refresh_at FROM credentials WHERE workspace_id = $1 AND provider = $2',
    [wId, LINKEDIN_PROVIDER]
  );
  const connected = rows.length > 0;
  const refreshAt = rows[0]?.refresh_at ?? null;
  res.json({ connected, refreshAt });
}));

// DELETE /linkedin -- disconnect (remove OAuth tokens)
router.delete('/linkedin', requireAuth, requireWorkspaceMember, asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  await query('DELETE FROM credentials WHERE workspace_id = $1 AND provider = $2', [wId, LINKEDIN_PROVIDER]);
  await insertAuditEvent(wId, req.userId!, 'credential.disconnected', 'credential', LINKEDIN_PROVIDER, { provider: LINKEDIN_PROVIDER });
  res.status(204).send();
}));

// GET /linkedin/connect -- browser navigates here to start OAuth
// Auth is passed via ?token= query param since browser redirect can't send headers
router.get('/linkedin/connect', asyncHandler(async (req, res) => {
  // Manual auth check: browser redirect can't send Authorization header,
  // so we accept the token as a query parameter
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  if (!token || token.length !== 36) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing auth token' });
    return;
  }

  // Validate user
  const { rows: userRows } = await query<{ id: string }>('SELECT id FROM users WHERE id = $1', [token]);
  if (userRows.length === 0) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
    return;
  }

  // Get workspace from URL params and verify membership
  const workspaceId = req.params.workspaceId;
  const { rows: wsRows } = await query<{ workspace_id: string }>('SELECT workspace_id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, token]);
  if (wsRows.length === 0) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Not a workspace member' });
    return;
  }

  // Read LinkedIn config from DB first, fall back to .env
  const config = await getLinkedInConfig(workspaceId);
  if (!config) {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    res.redirect(302, `${appUrl}/operate/settings?error=not_configured`);
    return;
  }

  const state = `${workspaceId}:${Date.now()}`;
  const url = buildAuthUrl({ clientId: config.clientId, redirectUri: config.callbackUrl, state });
  res.redirect(302, url);
}));

// POST /linkedin/token -- manually store an access token (from LinkedIn token generator)
router.post('/linkedin/token', requireAuth, requireWorkspaceMember, asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { access_token, owner_urn } = req.body ?? {};
  if (!access_token || typeof access_token !== 'string' || access_token.trim().length === 0) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'access_token is required' });
    return;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    res.status(500).json({ code: 'INTERNAL', message: 'ENCRYPTION_KEY not set' });
    return;
  }

  // Verify the token works by fetching the user's profile
  let resolvedUrn = (typeof owner_urn === 'string' && owner_urn.trim().length > 0) ? owner_urn.trim() : '';
  try {
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token.trim()}` },
    });
    if (!profileRes.ok) {
      const errText = await profileRes.text();
      res.status(400).json({ code: 'INVALID_TOKEN', message: `LinkedIn rejected this token (HTTP ${profileRes.status}): ${errText.slice(0, 200)}` });
      return;
    }
    const profile = await profileRes.json() as { sub?: string; name?: string };
    if (!resolvedUrn && profile.sub) {
      resolvedUrn = `urn:li:person:${profile.sub}`;
    }
    console.log(`[credentials] LinkedIn token verified for: ${profile.name ?? 'unknown'} (${resolvedUrn})`);
  } catch (e) {
    res.status(400).json({ code: 'INVALID_TOKEN', message: `Failed to verify token: ${e instanceof Error ? e.message : String(e)}` });
    return;
  }

  const encrypted = encryptTokens({
    access_token: access_token.trim(),
    owner_urn: resolvedUrn || undefined,
  }, encryptionKey);

  // Token generator tokens typically expire in 60 days
  const refreshAt = new Date(Date.now() + 59 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO credentials (workspace_id, provider, encrypted_tokens, refresh_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (workspace_id, provider) DO UPDATE SET encrypted_tokens = EXCLUDED.encrypted_tokens, refresh_at = EXCLUDED.refresh_at`,
    [wId, LINKEDIN_PROVIDER, encrypted, refreshAt]
  );

  res.json({ connected: true, ownerUrn: resolvedUrn, message: 'LinkedIn token saved and verified.' });
}));

export async function handleLinkedInCallback(req: { query: { code?: string; state?: string } }, res: { redirect: (code: number, url: string) => void }): Promise<void> {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  if (!code || !state) {
    res.redirect(302, `${appUrl}/operate/settings?error=missing_params`);
    return;
  }
  const [workspaceId] = state.split(':');
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    res.redirect(302, `${appUrl}/operate/settings?error=config`);
    return;
  }

  // Read LinkedIn config from DB first, fall back to .env
  const config = await getLinkedInConfig(workspaceId);
  if (!config) {
    res.redirect(302, `${appUrl}/operate/settings?error=config`);
    return;
  }

  try {
    const tokens = await exchangeCode({
      code,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.callbackUrl,
    });
    const encrypted = encryptTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    }, encryptionKey);
    const refreshAt = tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in - 300) * 1000)
      : null;
    await query(
      `INSERT INTO credentials (workspace_id, provider, encrypted_tokens, refresh_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, provider) DO UPDATE SET encrypted_tokens = EXCLUDED.encrypted_tokens, refresh_at = EXCLUDED.refresh_at`,
      [workspaceId, LINKEDIN_PROVIDER, encrypted, refreshAt]
    );
    await insertAuditEvent(workspaceId, null, 'credential.connected', 'credential', LINKEDIN_PROVIDER, { provider: LINKEDIN_PROVIDER });
  } catch {
    res.redirect(302, `${appUrl}/operate/settings?error=exchange`);
    return;
  }
  res.redirect(302, `${appUrl}/operate/settings?linkedin=connected`);
}
