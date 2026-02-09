import { Router } from 'express';
import { query } from 'db';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceOwner } from '../middleware/workspaceAccess.js';
import { encryptTokens, decryptTokens } from 'linkedin';
import { asyncHandler } from '../lib/asyncHandler.js';

export const router = Router({ mergeParams: true });

router.use(requireAuth, requireWorkspaceOwner);

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not set');
  return key;
}

// GET /provider-config/linkedin -- returns { configured: true/false } (never returns raw keys)
router.get('/linkedin', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { rows } = await query<{ updated_at: Date }>(
    'SELECT updated_at FROM provider_configs WHERE workspace_id = $1 AND provider = $2',
    [wId, 'linkedin']
  );
  res.json({
    configured: rows.length > 0,
    updatedAt: rows[0]?.updated_at ?? null,
  });
}));

// PUT /provider-config/linkedin -- accepts { client_id, client_secret, callback_url }, encrypts and upserts
router.put('/linkedin', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  const { client_id, client_secret, callback_url } = req.body ?? {};

  if (!client_id || typeof client_id !== 'string' || client_id.trim().length === 0) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'client_id is required' });
    return;
  }
  if (!client_secret || typeof client_secret !== 'string' || client_secret.trim().length === 0) {
    res.status(422).json({ code: 'UNPROCESSABLE', message: 'client_secret is required' });
    return;
  }

  const callbackUrl = (typeof callback_url === 'string' && callback_url.trim().length > 0)
    ? callback_url.trim()
    : (process.env.LINKEDIN_CALLBACK_URL ?? 'http://localhost:4000/oauth/linkedin/callback');

  const encryptionKey = getEncryptionKey();
  // Use encryptTokens for generic JSON encryption (same AES-256-GCM)
  const encrypted = encryptTokens(
    { access_token: client_id.trim(), refresh_token: client_secret.trim(), owner_urn: callbackUrl } as Parameters<typeof encryptTokens>[0],
    encryptionKey
  );

  await query(
    `INSERT INTO provider_configs (workspace_id, provider, encrypted_config, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (workspace_id, provider) DO UPDATE SET
       encrypted_config = EXCLUDED.encrypted_config,
       updated_at = now()`,
    [wId, 'linkedin', encrypted]
  );

  res.json({ configured: true, message: 'LinkedIn credentials saved and encrypted.' });
}));

// DELETE /provider-config/linkedin -- removes the config
router.delete('/linkedin', asyncHandler(async (req, res) => {
  const wId = req.workspaceId!;
  await query('DELETE FROM provider_configs WHERE workspace_id = $1 AND provider = $2', [wId, 'linkedin']);
  // Also remove OAuth tokens when config is removed
  await query('DELETE FROM credentials WHERE workspace_id = $1 AND provider = $2', [wId, 'linkedin']);
  res.status(204).send();
}));

/**
 * Helper: read LinkedIn config from DB, fall back to .env
 * Used by credentials.ts for OAuth flow.
 */
export async function getLinkedInConfig(workspaceId: string): Promise<{
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  source: 'db' | 'env';
} | null> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey) {
    const { rows } = await query<{ encrypted_config: string }>(
      'SELECT encrypted_config FROM provider_configs WHERE workspace_id = $1 AND provider = $2',
      [workspaceId, 'linkedin']
    );
    if (rows.length > 0) {
      try {
        const decrypted = decryptTokens(rows[0].encrypted_config, encryptionKey);
        return {
          clientId: decrypted.access_token,        // stored as access_token field
          clientSecret: decrypted.refresh_token!,   // stored as refresh_token field
          callbackUrl: decrypted.owner_urn!,        // stored as owner_urn field
          source: 'db',
        };
      } catch (e) {
        console.error('[provider-config] Decryption failed:', e);
      }
    }
  }

  // Fall back to .env
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const callbackUrl = process.env.LINKEDIN_CALLBACK_URL;
  if (clientId && clientSecret && callbackUrl) {
    return { clientId, clientSecret, callbackUrl, source: 'env' };
  }

  return null;
}
