'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

export type Source = {
  id: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  status?: string;
  lastFetchAt?: string | null;
  lastError?: string | null;
};

const SUGGESTED_SOURCES: { label: string; type: string; config: Record<string, unknown> }[] = [
  { label: 'CISA (US gov alerts)', type: 'rss', config: { url: 'https://www.cisa.gov/uscert/ncas/current-activity.xml' } },
  { label: 'Hacker News front page', type: 'rss', config: { url: 'https://hnrss.org/frontpage' } },
  { label: 'Reddit r/cybersecurity', type: 'reddit', config: { subreddit: 'cybersecurity', sort: 'hot', limit: 25 } },
  { label: 'Reddit r/netsec', type: 'reddit', config: { subreddit: 'netsec', sort: 'hot', limit: 25 } },
  { label: 'Krebs on Security', type: 'rss', config: { url: 'https://krebsonsecurity.com/feed/' } },
];

export function SourcesPanel() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('rss');
  const [newUrl, setNewUrl] = useState('');
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});
  const [addAsPending, setAddAsPending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingSuggested, setAddingSuggested] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchSources = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api<{ items: Source[] }>(`/workspaces/${workspaceId}/sources${params}`)
      .then((d) => setSources(d.items ?? []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [workspaceId, statusFilter]);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetchSources();
  }, [workspaceId, fetchSources]);

  const buildConfig = (): Record<string, unknown> => {
    if (newType === 'rss' || newType === 'url') return { url: newUrl.trim() };
    if (newType === 'reddit') return { subreddit: (newConfig.subreddit || newUrl).trim().replace(/^\/?r\//, '') || 'cybersecurity', sort: newConfig.sort || 'hot', limit: parseInt(newConfig.limit || '25', 10) };
    if (newType === 'twitter') return { query: (newConfig.query || newUrl).trim() || 'cybersecurity', maxResults: parseInt(newConfig.maxResults || '20', 10), bearerToken: newConfig.bearerToken || undefined };
    if (newType === 'quora' || newType === 'linkedin') return { rssUrl: newUrl.trim() || undefined, name: newConfig.name || undefined };
    if (newType === 'trend_provider') return { provider: 'newsapi', apiKey: newConfig.apiKey || undefined, country: newConfig.country || 'us' };
    return { url: newUrl.trim() };
  };

  const addSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if ((newType === 'rss' || newType === 'url' || newType === 'quora' || newType === 'linkedin') && !newUrl.trim()) {
      toast.error('URL is required for this source type.');
      return;
    }
    if (newType === 'reddit' && !(newConfig.subreddit || newUrl).trim()) {
      toast.error('Subreddit is required (e.g. cybersecurity).');
      return;
    }
    if (newType === 'twitter' && !(newConfig.query || newUrl).trim()) {
      toast.error('Search query is required for Twitter.');
      return;
    }
    setAdding(true);
    api(`/workspaces/${workspaceId}/sources`, {
      method: 'POST',
      body: JSON.stringify({ type: newType, config: buildConfig(), enabled: true, status: addAsPending ? 'candidate' : 'active' }),
    })
      .then(() => {
        setNewUrl('');
        setNewConfig({});
        fetchSources();
        toast.success(addAsPending ? 'Source added as candidate (approve to activate).' : 'Source added.');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setAdding(false));
  };

  const toggleSource = (id: string, currentlyEnabled: boolean) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/sources/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !currentlyEnabled }) })
      .then(() => setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !currentlyEnabled } : s))))
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
  };

  const approveSource = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/sources/${id}/approve`, { method: 'POST' })
      .then(() => {
        setSources((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s)));
        toast.success('Source activated.');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
  };

  const deleteSource = async (id: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Delete this source? This cannot be undone.');
    if (!confirmed) return;
    api(`/workspaces/${workspaceId}/sources/${id}`, { method: 'DELETE' })
      .then(() => setSources((prev) => prev.filter((s) => s.id !== id)))
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
  };

  const addSuggested = (label: string, type: string, config: Record<string, unknown>) => {
    if (!workspaceId) return;
    setAddingSuggested(label);
    api(`/workspaces/${workspaceId}/sources`, {
      method: 'POST',
      body: JSON.stringify({ type, config, enabled: true, status: 'active' }),
    })
      .then(() => { fetchSources(); toast.success(`Added: ${label}`); })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setAddingSuggested(null));
  };

  if (!workspaceId) {
    return <EmptyState message="Select a workspace in the sidebar." />;
  }

  const existingUrls = new Set(sources.map((s) => ((s.config as Record<string, string>).url ?? (s.config as Record<string, string>).subreddit ?? '').toLowerCase()));

  const activeCount = sources.filter((s) => (s.status ?? 'active') === 'active').length;
  const candidateCount = sources.filter((s) => s.status === 'candidate').length;
  const disabledCount = sources.filter((s) => s.status === 'disabled' || !s.enabled).length;
  const errorCount = sources.filter((s) => s.lastError).length;

  return (
    <>
      {/* Sources HUD strip */}
      <Card className="mb-6 bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.18em] text-gray-400 mb-2">Sources HUD</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900/80">
              <span className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {activeCount} active
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900/80">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              {candidateCount} candidate
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900/80">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              {disabledCount} disabled
            </span>
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-900/40 text-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {errorCount} with errors
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-8 bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70">
        <CardHeader>
          <CardTitle>Suggested sources</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">One-click add from common providers. Duplicates are skipped.</p>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_SOURCES.map(({ label, type, config }) => {
            const key = (config.url as string) ?? (type === 'reddit' ? `r/${(config.subreddit as string) ?? ''}` : label);
            const exists = (config.url && existingUrls.has((config.url as string).toLowerCase())) || (type === 'reddit' && config.subreddit && existingUrls.has((config.subreddit as string).toLowerCase()));
            return (
              <Button
                key={key}
                variant="secondary"
                onClick={() => addSuggested(label, type, config)}
                disabled={!!addingSuggested || exists}
                className="text-sm"
              >
                {addingSuggested === label ? '…' : exists ? 'Added' : `+ ${label}`}
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-8 bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70">
        <CardHeader>
          <CardTitle>Add a source</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            RSS, Reddit, X (Twitter), Quora, LinkedIn, or NewsAPI. Active sources feed into discovery and trends.
          </p>
        </CardHeader>
        <form onSubmit={addSource} className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-shrink-0">
              <Label htmlFor="source-type">Type</Label>
              <Select id="source-type" value={newType} onChange={(e) => { setNewType(e.target.value); setNewConfig({}); }} className="mt-1">
                <option value="rss">RSS</option>
                <option value="reddit">Reddit</option>
                <option value="twitter">X (Twitter)</option>
                <option value="quora">Quora (RSS)</option>
                <option value="linkedin">LinkedIn (RSS)</option>
                <option value="trend_provider">NewsAPI</option>
              </Select>
            </div>
            {(newType === 'rss' || newType === 'url' || newType === 'quora' || newType === 'linkedin') && (
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="source-url">{newType === 'quora' || newType === 'linkedin' ? 'RSS or feed URL' : 'Feed URL'}</Label>
                <Input id="source-url" type="url" placeholder={newType === 'linkedin' ? 'https://...' : 'https://hnrss.org/frontpage'} value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="w-full mt-1" />
              </div>
            )}
            {newType === 'reddit' && (
              <>
                <div className="min-w-[140px]">
                  <Label>Subreddit</Label>
                  <Input placeholder="cybersecurity" value={newConfig.subreddit ?? ''} onChange={(e) => setNewConfig((c) => ({ ...c, subreddit: e.target.value }))} className="mt-1" />
                </div>
                <div className="w-28">
                  <Label>Sort</Label>
                  <Select value={newConfig.sort ?? 'hot'} onChange={(e) => setNewConfig((c) => ({ ...c, sort: e.target.value }))} className="mt-1">
                    <option value="hot">Hot</option>
                    <option value="new">New</option>
                    <option value="top">Top</option>
                    <option value="rising">Rising</option>
                  </Select>
                </div>
              </>
            )}
            {newType === 'twitter' && (
              <div className="flex-1 min-w-[180px]">
                <Label>Search query</Label>
                <Input placeholder="cybersecurity OR ransomware" value={newConfig.query ?? ''} onChange={(e) => setNewConfig((c) => ({ ...c, query: e.target.value }))} className="mt-1" />
              </div>
            )}
            {newType === 'trend_provider' && (
              <div className="min-w-[120px]">
                <Label>Country</Label>
                <Input placeholder="us" value={newConfig.country ?? 'us'} onChange={(e) => setNewConfig((c) => ({ ...c, country: e.target.value }))} className="mt-1" />
              </div>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <input type="checkbox" id="add-pending" checked={addAsPending} onChange={(e) => setAddAsPending(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
              <Label htmlFor="add-pending" className="text-sm text-gray-600 dark:text-gray-400">Add to pool only (pending approval)</Label>
            </div>
            <Button type="submit" disabled={adding} className="flex-shrink-0">{adding ? 'Adding...' : 'Add'}</Button>
          </div>
        </form>
      </Card>

      <Card className="mb-8 bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70">
        <CardHeader>
          <CardTitle>Your sources</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active = ingested by pipeline. Candidate = pending. Disabled = excluded.</p>
        </CardHeader>
        <div className="flex gap-2 mb-4">
          {['', 'active', 'candidate', 'disabled'].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {loading ? (
          <SkeletonList rows={2} />
        ) : sources.length === 0 ? (
          <EmptyState message="No sources yet. Add RSS or other feeds above to power discovery." />
        ) : (
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start gap-3 text-sm rounded-lg bg-slate-900/60 px-3 py-2 border border-slate-800/70">
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Badge status={s.status === 'active' ? 'completed' : s.status === 'candidate' ? 'pending' : 'cancelled'}>
                    {s.status ?? 'active'}
                  </Badge>
                  <span className="font-medium text-gray-100 uppercase tracking-[0.14em] text-[11px]">{s.type}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-gray-300 truncate block">
                    {(s.config as Record<string, string>).subreddit && `r/${(s.config as Record<string, string>).subreddit}`}
                    {(s.config as Record<string, string>).query && `"${(s.config as Record<string, string>).query}"`}
                    {(s.config as Record<string, string>).url && (s.config as Record<string, string>).url}
                    {!(s.config as Record<string, string>).subreddit && !(s.config as Record<string, string>).query && !(s.config as Record<string, string>).url && JSON.stringify(s.config).slice(0, 60)}
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {s.lastFetchAt && <span>Last fetch: {new Date(s.lastFetchAt).toLocaleString()}</span>}
                    {s.lastError && <span className="text-red-400">Last error: {s.lastError.slice(0, 80)}{s.lastError.length > 80 ? '…' : ''}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.status === 'candidate' && (
                    <Button variant="secondary" onClick={() => approveSource(s.id)} className="text-xs px-2 py-1">Activate</Button>
                  )}
                  {s.status === 'active' && (
                    <Button variant="ghost" onClick={() => toggleSource(s.id, s.enabled)} className="text-xs px-2 py-1">{s.enabled ? 'Disable' : 'Enable'}</Button>
                  )}
                  <Button variant="danger" onClick={() => deleteSource(s.id)} className="text-xs px-2 py-1">Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
