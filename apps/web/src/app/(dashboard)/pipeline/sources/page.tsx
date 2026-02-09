'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

type Source = { id: string; type: string; config: Record<string, unknown>; enabled: boolean; status?: string };

export default function PipelineSourcesPage() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('rss');
  const [newUrl, setNewUrl] = useState('');
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});
  const [addAsPending, setAddAsPending] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchSources = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    api<{ items: Source[] }>(`/workspaces/${workspaceId}/sources`)
      .then((d) => setSources(d.items ?? []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
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
      body: JSON.stringify({ type: newType, config: buildConfig(), enabled: true, status: addAsPending ? 'pending' : 'approved' }),
    })
      .then(() => { setNewUrl(''); setNewConfig({}); fetchSources(); toast.success(addAsPending ? 'Source added to pool (pending approval).' : 'Source added.'); })
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
      .then(() => { setSources((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'approved' } : s))); toast.success('Source approved.'); })
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

  if (!workspaceId) {
    return <EmptyState message="Select a workspace in the sidebar." />;
  }

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a source (pool)</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-4">
          Add RSS, Reddit, X (Twitter), Quora, LinkedIn feeds, or NewsAPI. Approved sources are included in pipeline ingestion.
        </p>
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
              <input type="checkbox" id="add-pending" checked={addAsPending} onChange={(e) => setAddAsPending(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="add-pending" className="text-sm text-gray-600">Add to pool only (pending approval)</Label>
            </div>
            <Button type="submit" disabled={adding} className="flex-shrink-0">{adding ? 'Adding...' : 'Add'}</Button>
          </div>
        </form>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current sources</CardTitle>
        </CardHeader>
        {loading ? (
          <SkeletonList rows={2} />
        ) : sources.length === 0 ? (
          <EmptyState message="No sources configured yet. Add your first RSS feed above." />
        ) : (
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 text-sm">
                <Badge status={s.enabled ? 'completed' : 'cancelled'}>{s.enabled ? 'active' : 'disabled'}</Badge>
                {(s.status ?? 'approved') === 'pending' && <Badge status="pending">pending</Badge>}
                {(s.status ?? 'approved') === 'approved' && <span className="text-xs text-green-600 font-medium">approved</span>}
                <span className="font-medium text-gray-900">{s.type}</span>
                <span className="text-gray-700 truncate flex-1 min-w-0">
                  {(s.config as Record<string, string>).subreddit && `r/${(s.config as Record<string, string>).subreddit}`}
                  {(s.config as Record<string, string>).query && `"${(s.config as Record<string, string>).query}"`}
                  {(s.config as Record<string, string>).url && (s.config as Record<string, string>).url}
                  {!(s.config as Record<string, string>).subreddit && !(s.config as Record<string, string>).query && !(s.config as Record<string, string>).url && JSON.stringify(s.config).slice(0, 60)}
                </span>
                {(s.status ?? 'approved') === 'pending' && (
                  <Button variant="secondary" onClick={() => approveSource(s.id)} className="text-xs px-2 py-1">Approve</Button>
                )}
                <Button variant="ghost" onClick={() => toggleSource(s.id, s.enabled)} className="text-xs px-2 py-1">{s.enabled ? 'Disable' : 'Enable'}</Button>
                <Button variant="danger" onClick={() => deleteSource(s.id)} className="text-xs px-2 py-1">Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Link href="/pipeline/topics">
        <Button variant="secondary">Topics</Button>
      </Link>
    </>
  );
}
