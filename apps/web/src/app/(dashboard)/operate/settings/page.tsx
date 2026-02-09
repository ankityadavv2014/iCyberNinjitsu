'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/Toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ProviderStatus = { configured: boolean; updatedAt: string | null };
type LinkedInStatus = { connected: boolean; refreshAt: string | null };

function StatusDot({ color }: { color: 'green' | 'yellow' | 'gray' }) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-300',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[color]}`} />;
}

export default function SettingsPage() {
  const { workspaceId, workspaces } = useWorkspace();
  const toast = useToast();

  // LinkedIn provider config state
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({ configured: false, updatedAt: null });
  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInStatus>({ connected: false, refreshAt: null });
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('http://localhost:4000/oauth/linkedin/callback');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Manual token paste state
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);

  const fetchStatuses = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api<ProviderStatus>(`/workspaces/${workspaceId}/provider-config/linkedin`).catch(() => ({ configured: false, updatedAt: null })),
      api<LinkedInStatus>(`/workspaces/${workspaceId}/credentials/linkedin`).catch(() => ({ connected: false, refreshAt: null })),
    ]).then(([prov, cred]) => {
      setProviderStatus(prov);
      setLinkedInStatus(cred);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetchStatuses();
  }, [workspaceId, fetchStatuses]);

  // Check for URL params from OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'connected') {
      setConfigMessage({ type: 'success', text: 'LinkedIn connected successfully!' });
      fetchStatuses();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('error')) {
      setConfigMessage({ type: 'error', text: `LinkedIn connection error: ${params.get('error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatuses]);

  const saveConfig = () => {
    if (!workspaceId) return;
    setConfigSaving(true);
    setConfigMessage(null);
    api(`/workspaces/${workspaceId}/provider-config/linkedin`, {
      method: 'PUT',
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        callback_url: callbackUrl,
      }),
    })
      .then(() => {
        setConfigMessage({ type: 'success', text: 'LinkedIn credentials saved and encrypted.' });
        setShowConfigForm(false);
        setClientId('');
        setClientSecret('');
        fetchStatuses();
      })
      .catch((e) => setConfigMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) }))
      .finally(() => setConfigSaving(false));
  };

  const connectLinkedIn = () => {
    if (!workspaceId) return;
    // Pass auth token as query param since browser redirect can't send Authorization header
    const token = typeof window !== 'undefined' ? localStorage.getItem('astra_token') : null;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    window.location.href = `${API_URL}/workspaces/${workspaceId}/credentials/linkedin/connect${qs}`;
  };

  const saveManualToken = () => {
    if (!workspaceId || !manualToken.trim()) return;
    setTokenSaving(true);
    setConfigMessage(null);
    api<{ connected: boolean; ownerUrn: string; message: string }>(`/workspaces/${workspaceId}/credentials/linkedin/token`, {
      method: 'POST',
      body: JSON.stringify({ access_token: manualToken.trim() }),
    })
      .then((d) => {
        setConfigMessage({ type: 'success', text: d.message || 'LinkedIn connected!' });
        setShowTokenForm(false);
        setManualToken('');
        fetchStatuses();
      })
      .catch((e) => setConfigMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) }))
      .finally(() => setTokenSaving(false));
  };

  const disconnectLinkedIn = async () => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Disconnect LinkedIn? You will need to reconnect to post.');
    if (!confirmed) return;
    setDisconnecting(true);
    api(`/workspaces/${workspaceId}/credentials/linkedin`, { method: 'DELETE' })
      .then(() => {
        setLinkedInStatus({ connected: false, refreshAt: null });
        setConfigMessage({ type: 'success', text: 'LinkedIn disconnected.' });
      })
      .catch((e) => setConfigMessage({ type: 'error', text: String(e) }))
      .finally(() => setDisconnecting(false));
  };

  const removeConfig = async () => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Remove LinkedIn configuration? This will also disconnect LinkedIn.');
    if (!confirmed) return;
    setRemoving(true);
    api(`/workspaces/${workspaceId}/provider-config/linkedin`, { method: 'DELETE' })
      .then(() => {
        setProviderStatus({ configured: false, updatedAt: null });
        setLinkedInStatus({ connected: false, refreshAt: null });
        setConfigMessage({ type: 'success', text: 'LinkedIn configuration removed.' });
      })
      .catch((e) => setConfigMessage({ type: 'error', text: String(e) }))
      .finally(() => setRemoving(false));
  };

  // Determine status indicator
  const statusColor: 'green' | 'yellow' | 'gray' = providerStatus.configured && linkedInStatus.connected
    ? 'green'
    : providerStatus.configured
      ? 'yellow'
      : 'gray';
  const statusLabel = providerStatus.configured && linkedInStatus.connected
    ? 'Configured and connected'
    : providerStatus.configured
      ? 'Configured, not connected'
      : 'Not configured';

  const wsName = workspaces.find((w) => w.id === workspaceId)?.name ?? 'Workspace';

  return (
    <>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      {/* Workspace info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-600">
          Current workspace: <span className="font-medium text-gray-900">{wsName}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Switch workspace using the sidebar dropdown.</p>
      </Card>

      {/* LinkedIn Integration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>LinkedIn Integration</CardTitle>
            <div className="flex items-center gap-2">
              <StatusDot color={statusColor} />
              <span className="text-xs text-gray-500">{statusLabel}</span>
            </div>
          </div>
        </CardHeader>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-100 rounded w-48" />
            <div className="h-4 bg-gray-100 rounded w-32" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status details */}
            <div className="flex flex-wrap gap-3">
              <Badge status={providerStatus.configured ? 'completed' : 'pending'}>
                {providerStatus.configured ? 'App configured' : 'App not configured'}
              </Badge>
              <Badge status={linkedInStatus.connected ? 'completed' : 'cancelled'}>
                {linkedInStatus.connected ? 'OAuth connected' : 'OAuth not connected'}
              </Badge>
            </div>

            {linkedInStatus.refreshAt && (
              <p className="text-xs text-gray-400">
                Token refreshes at: {new Date(linkedInStatus.refreshAt).toLocaleString()}
              </p>
            )}
            {providerStatus.updatedAt && (
              <p className="text-xs text-gray-400">
                Config last updated: {new Date(providerStatus.updatedAt).toLocaleString()}
              </p>
            )}

            {/* Message */}
            {configMessage && (
              <div className={`text-sm px-3 py-2 rounded-lg ${configMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {configMessage.text}
              </div>
            )}

            {/* Config form */}
            {showConfigForm ? (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700">
                  Enter your LinkedIn App credentials
                </p>
                <p className="text-xs text-gray-400">
                  Create a LinkedIn app at linkedin.com/developers with &quot;Share on LinkedIn&quot; (w_member_social) and &quot;Sign In with LinkedIn&quot; (openid, profile) products enabled.
                </p>
                <div>
                  <Label htmlFor="li-client-id">Client ID</Label>
                  <Input
                    id="li-client-id"
                    type="password"
                    placeholder="Enter LinkedIn Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full mt-1 font-mono"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="li-client-secret">Client Secret</Label>
                  <Input
                    id="li-client-secret"
                    type="password"
                    placeholder="Enter LinkedIn Client Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full mt-1 font-mono"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="li-callback">Callback URL</Label>
                  <Input
                    id="li-callback"
                    type="url"
                    value={callbackUrl}
                    onChange={(e) => setCallbackUrl(e.target.value)}
                    className="w-full mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Must match the redirect URL in your LinkedIn app settings.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={saveConfig}
                    disabled={configSaving || !clientId.trim() || !clientSecret.trim()}
                  >
                    {configSaving ? 'Saving...' : 'Save credentials'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowConfigForm(false); setClientId(''); setClientSecret(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : showTokenForm ? (
              <div className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50/30">
                <p className="text-sm font-medium text-gray-700">
                  Paste LinkedIn Access Token
                </p>
                <p className="text-xs text-gray-500">
                  Go to{' '}
                  <a href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    LinkedIn Token Generator
                  </a>
                  , select your app, check <strong>openid</strong>, <strong>profile</strong>, and <strong>w_member_social</strong> scopes, generate a token, and paste it below.
                </p>
                <div>
                  <Label htmlFor="li-manual-token">Access Token</Label>
                  <Input
                    id="li-manual-token"
                    type="password"
                    placeholder="Paste your LinkedIn access token here"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-full mt-1 font-mono text-xs"
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={saveManualToken}
                    disabled={tokenSaving || !manualToken.trim()}
                  >
                    {tokenSaving ? 'Verifying & saving...' : 'Save token'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowTokenForm(false); setManualToken(''); }}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  The token will be verified against LinkedIn&apos;s API, encrypted with AES-256-GCM, and stored securely. Tokens from the generator typically expire in 60 days.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowConfigForm(true)}
                  >
                    {providerStatus.configured ? 'Update credentials' : 'Configure LinkedIn app'}
                  </Button>

                  {providerStatus.configured && !linkedInStatus.connected && (
                    <Button onClick={connectLinkedIn}>
                      Connect LinkedIn (OAuth)
                    </Button>
                  )}

                  {!linkedInStatus.connected && (
                    <Button variant="secondary" onClick={() => setShowTokenForm(true)}>
                      Paste token manually
                    </Button>
                  )}

                  {linkedInStatus.connected && (
                    <Button
                      variant="danger"
                      onClick={disconnectLinkedIn}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  )}

                  {providerStatus.configured && (
                    <Button
                      variant="ghost"
                      onClick={removeConfig}
                      disabled={removing}
                      className="text-red-500 hover:text-red-600"
                    >
                      {removing ? 'Removing...' : 'Remove config'}
                    </Button>
                  )}
                </div>

                {!linkedInStatus.connected && (
                  <p className="text-xs text-gray-400">
                    <strong>Tip:</strong> OAuth redirect won&apos;t work on localhost. Use &quot;Paste token manually&quot; with{' '}
                    <a href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      LinkedIn&apos;s Token Generator
                    </a>{' '}
                    for local development.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Security note */}
      <Card className="mb-6 bg-gray-50/50">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-700">Security by design</p>
            <p className="text-xs text-gray-500 mt-1">
              All credentials are encrypted at rest using AES-256-GCM with scrypt key derivation. They are never stored in plaintext or transmitted back to the browser after saving. OAuth tokens are encrypted separately from app credentials.
            </p>
          </div>
        </div>
      </Card>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-400">Coming soon -- manage prompt templates for post generation.</p>
        </Card>
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-400">Coming soon -- configure brand voice, citation, and safety rules.</p>
        </Card>
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-400">Coming soon -- view all actions taken in this workspace.</p>
        </Card>
      </div>
    </>
  );
}
