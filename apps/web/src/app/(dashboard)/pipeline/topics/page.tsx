'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SourcesPanel } from '@/components/pipeline/SourcesPanel';
import { PipelineFlow } from '@/components/pipeline/PipelineFlow';
import { Card, CardHeader, CardTitle } from '@/components/Card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/Table';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Select } from '@/components/Select';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type Topic = { id: string; keyword: string; weight: number; bundleId?: string | null; createdAt: string };
type TopicBundle = { id: string; name: string; slug: string; description?: string | null; sortOrder: number };
type DiscoveryItem = { id: string; title: string; url: string; score: number | null; hotScore: number; fetchedAt: string };
type DiscoveryResponse = { items: DiscoveryItem[]; sparkline: number[] };

const CYBER_PRESETS = [
  { keyword: 'ransomware', weight: 3 },
  { keyword: 'zero-day', weight: 3 },
  { keyword: 'data breach', weight: 2 },
  { keyword: 'phishing', weight: 2 },
  { keyword: 'CVE', weight: 2 },
  { keyword: 'APT', weight: 2 },
  { keyword: 'supply chain attack', weight: 2 },
  { keyword: 'malware', weight: 2 },
  { keyword: 'vulnerability', weight: 1 },
  { keyword: 'threat intelligence', weight: 1 },
  { keyword: 'CISA', weight: 1 },
  { keyword: 'incident response', weight: 1 },
];

export default function PipelineTopicsPage() {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<'sources' | 'trends' | 'topics'>('trends');
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [bundles, setBundles] = useState<TopicBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [newWeight, setNewWeight] = useState(1);
  const [newBundleId, setNewBundleId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState(1);
  const [editBundleId, setEditBundleId] = useState<string>('');
  const [seeding, setSeeding] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [topicsPage, setTopicsPage] = useState(0);
  const [viewpointOpen, setViewpointOpen] = useState(false);
  const [sourcesCount, setSourcesCount] = useState(0);
  const [trendFilter, setTrendFilter] = useState<'all' | 'hot'>('all');
  const TOPICS_PAGE_SIZE = 10;

  const fetchDiscovery = useCallback(() => {
    if (!workspaceId) return;
    setDiscoveryLoading(true);
    api<DiscoveryResponse>(`/workspaces/${workspaceId}/trends/discovery?limit=15`)
      .then(setDiscovery)
      .catch(() => setDiscovery(null))
      .finally(() => setDiscoveryLoading(false));
  }, [workspaceId]);

  const fetchTopics = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api<{ items: Topic[] }>(`/workspaces/${workspaceId}/topics`),
      api<{ items: TopicBundle[] }>(`/workspaces/${workspaceId}/topic-bundles`),
      api<{ items: unknown[] }>(`/workspaces/${workspaceId}/sources`).catch(() => ({ items: [] as unknown[] })),
    ])
      .then(([topicsRes, bundlesRes, sourcesRes]) => {
        setTopics(topicsRes.items ?? []);
        setBundles(bundlesRes.items ?? []);
        setSourcesCount(sourcesRes.items?.length ?? 0);
      })
      .catch(() => { setTopics([]); setBundles([]); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetchTopics();
    fetchDiscovery();
  }, [workspaceId, fetchTopics, fetchDiscovery]);

  const generatePost = (trendItemId: string) => {
    if (!workspaceId) return;
    setGeneratingId(trendItemId);
    api<{ jobId: string }>(`/workspaces/${workspaceId}/drafts/generate`, { method: 'POST', body: JSON.stringify({ trend_item_id: trendItemId }) })
      .then(() => toast.success('Generate job queued. Check Drafts in a few seconds.'))
      .catch((e) => toast.error(String(e)))
      .finally(() => setGeneratingId(null));
  };

  const pinAsTopic = (trendItemId: string) => {
    if (!workspaceId) return;
    setPinningId(trendItemId);
    api<{ id: string; keyword: string }>(`/workspaces/${workspaceId}/topics/from-trend`, {
      method: 'POST',
      body: JSON.stringify({ trendItemId }),
    })
      .then((r) => { toast.success(`Pinned as topic: ${r.keyword}`); fetchTopics(); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setPinningId(null));
  };

  const addTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newKeyword.trim()) return;
    setAdding(true);
    api(`/workspaces/${workspaceId}/topics`, {
      method: 'POST',
      body: JSON.stringify({ keyword: newKeyword.trim(), weight: newWeight, bundleId: newBundleId || null }),
    })
      .then(() => { setNewKeyword(''); setNewWeight(1); setNewBundleId(''); fetchTopics(); })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setAdding(false));
  };

  const updateTopic = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/topics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ weight: editWeight, bundleId: editBundleId || null }),
    })
      .then(() => { setEditingId(null); fetchTopics(); })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
  };

  const deleteTopic = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/topics/${id}`, { method: 'DELETE' })
      .then(() => fetchTopics())
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
  };

  const seedCyberTopics = async () => {
    if (!workspaceId) return;
    setSeeding(true);
    const existing = new Set(topics.map((t) => t.keyword.toLowerCase()));
    let added = 0;
    for (const preset of CYBER_PRESETS) {
      if (existing.has(preset.keyword.toLowerCase())) continue;
      try {
        await api(`/workspaces/${workspaceId}/topics`, {
          method: 'POST',
          body: JSON.stringify({ keyword: preset.keyword, weight: preset.weight }),
        });
        added++;
      } catch { /* skip */ }
    }
    fetchTopics();
    setSeeding(false);
    if (added > 0) toast.success(`Added ${added} cybersecurity topics.`);
    else toast.info('All cybersecurity topics already exist.');
  };

  if (!workspaceId) {
    return <EmptyState message="Select a workspace in the sidebar." />;
  }

  function MiniSparkline({ data, className = '' }: { data: number[]; className?: string }) {
    if (!data?.length) return null;
    const max = Math.max(1, ...data);
    const w = 120;
    const h = 28;
    const pad = 2;
    const points = data.map((v, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * (w - 2 * pad);
      const y = h - pad - (v / max) * (h - 2 * pad);
      return `${x},${y}`;
    }).join(' ');
    return <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden><polyline fill="none" stroke="currentColor" strokeWidth="1" points={points} /></svg>;
  }

  const pipelineNodes = [
    {
      id: 'sources',
      label: 'Sources',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      description: 'RSS, Reddit, News',
      count: sourcesCount,
      status: activeView === 'sources' ? 'active' as const : sourcesCount > 0 ? 'pending' as const : 'idle' as const,
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      description: 'Hot items from feed',
      count: discovery?.items.length,
      status: activeView === 'trends' ? 'active' as const : (discoveryLoading ? 'pending' as const : (discovery && discovery.items.length > 0 ? 'pending' as const : 'idle' as const)),
    },
    {
      id: 'topics',
      label: 'Topics',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      description: 'Pinned keywords',
      count: topics.length,
      status: activeView === 'topics' ? 'active' as const : (topics.length > 0 ? 'pending' as const : 'idle' as const),
    },
  ];

  return (
    <>
      {/* Content Studio pipeline */}
      <Card className="mb-8 overflow-hidden border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Content studio</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Signals → trends → topics that feed your drafts</p>
          </div>
          <PipelineFlow nodes={pipelineNodes} activeNodeId={activeView} onNodeClick={(id) => setActiveView(id as 'sources' | 'trends' | 'topics')} />
          {/* Source health + trend filters */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <span className="uppercase tracking-[0.18em] text-[10px] text-gray-400">Source health</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900/80 text-gray-100">
                <span className={`w-1.5 h-1.5 rounded-full ${sourcesCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {sourcesCount > 0 ? `${sourcesCount} source${sourcesCount === 1 ? '' : 's'} configured` : 'No sources yet'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.18em] text-[10px] text-gray-400">Trend view</span>
              <div className="inline-flex items-center gap-1 rounded-full bg-gray-900/80 p-1">
                <button
                  type="button"
                  onClick={() => setTrendFilter('all')}
                  className={`px-2 py-0.5 rounded-full text-[11px] ${trendFilter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTrendFilter('hot')}
                  className={`px-2 py-0.5 rounded-full text-[11px] ${trendFilter === 'hot' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  Hot only
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {activeView === 'sources' ? (
        <SourcesPanel />
      ) : activeView === 'trends' ? (
        <Card className="mb-6">
        <CardHeader>
          <CardTitle>Discover topics from trends</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Patterns and trends from your sources — pin what matters and we&apos;ll rank and suggest content from them.</p>
        </CardHeader>
        {discoveryLoading && !discovery ? (
          <div className="p-4"><SkeletonList rows={4} /></div>
        ) : discovery && discovery.items.length > 0 ? (
          <div className="p-4">
            {discovery.sparkline?.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Activity (7d):</span>
                <MiniSparkline data={discovery.sparkline} className="h-7 w-28 text-primary" />
              </div>
            )}
            <ul className="space-y-2">
              {discovery.items
                .filter((t) => trendFilter === 'all' ? true : (t.hotScore ?? 0) >= 0.5)
                .map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary line-clamp-1 flex-1 min-w-0">
                    {t.title}
                  </a>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t.hotScore.toFixed(1)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="secondary" onClick={() => generatePost(t.id)} disabled={generatingId === t.id} className="text-xs px-2 py-1">
                      {generatingId === t.id ? '…' : 'Generate'}
                    </Button>
                    <Button variant="ghost" onClick={() => pinAsTopic(t.id)} disabled={pinningId === t.id} className="text-xs px-2 py-1">
                      {pinningId === t.id ? '…' : 'Pin as topic'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Run pipeline to see trending items from your sources.</p>
        )}
        </Card>
      ) : (
        <>
          {bundles.length > 0 && (
            <Card className="mb-6">
              <button
                type="button"
                onClick={() => setViewpointOpen((o) => !o)}
                className="w-full text-left p-4 flex items-center justify-between rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <CardTitle className="!mb-0">Viewpoint bundles</CardTitle>
                <span className="text-gray-400 text-sm">{viewpointOpen ? 'Collapse' : 'Expand'}</span>
              </button>
              {viewpointOpen && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Post as these experts would — choose CEO, CISO, Engineer, etc. so generated content matches that perspective and audience.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bundles.map((b) => (
                      <span key={b.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {b.name}
                        {b.description && <span className="ml-1 text-gray-500 dark:text-gray-400 text-xs">— {b.description}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add a topic manually</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Override or add keywords that aren&apos;t in discovery yet.</p>
            </CardHeader>
            <form onSubmit={addTopic} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="keyword">Keyword</Label>
                  <Input id="keyword" placeholder="e.g. ransomware, zero-day" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} required className="w-full mt-1" />
                </div>
                <div className="w-24">
                  <Label htmlFor="weight">Weight</Label>
                  <Input id="weight" type="number" min={1} max={10} value={newWeight} onChange={(e) => setNewWeight(Math.max(1, parseInt(e.target.value) || 1))} className="w-full mt-1" />
                </div>
                {bundles.length > 0 && (
                  <div className="min-w-[140px]">
                    <Label htmlFor="bundle">Viewpoint</Label>
                    <Select id="bundle" value={newBundleId} onChange={(e) => setNewBundleId(e.target.value)} className="mt-1">
                      <option value="">None</option>
                      {bundles.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <Button type="submit" disabled={adding} className="flex-shrink-0">{adding ? 'Adding...' : 'Add topic'}</Button>
              </div>
            </form>
            {topics.length === 0 && (
              <div className="mt-4">
                <Button variant="secondary" onClick={seedCyberTopics} disabled={seeding} className="text-sm">
                  {seeding ? 'Adding...' : 'Add cybersecurity topics'}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-6 pb-0 flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Your topics ({topics.length})</CardTitle>
              {topics.length > TOPICS_PAGE_SIZE && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <button
                    type="button"
                    onClick={() => setTopicsPage((p) => Math.max(0, p - 1))}
                    disabled={topicsPage === 0}
                    className="disabled:opacity-50 hover:text-primary"
                  >
                    Previous
                  </button>
                  <span>Page {topicsPage + 1} of {Math.ceil(topics.length / TOPICS_PAGE_SIZE)}</span>
                  <button
                    type="button"
                    onClick={() => setTopicsPage((p) => Math.min(Math.ceil(topics.length / TOPICS_PAGE_SIZE) - 1, p + 1))}
                    disabled={topicsPage >= Math.ceil(topics.length / TOPICS_PAGE_SIZE) - 1}
                    className="disabled:opacity-50 hover:text-primary"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            {loading ? (
              <div className="p-6"><SkeletonList rows={3} /></div>
            ) : topics.length === 0 ? (
              <div className="p-6">
                <EmptyState message="No topics yet. Discover from trends above or add cybersecurity topics." actionLabel="Add cybersecurity topics" onAction={seedCyberTopics} />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableHeader>Keyword</TableHeader>
                  <TableHeader>Viewpoint</TableHeader>
                  <TableHeader>Weight</TableHeader>
                  <TableHeader>Added</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableHead>
                <TableBody>
                  {topics.slice(topicsPage * TOPICS_PAGE_SIZE, (topicsPage + 1) * TOPICS_PAGE_SIZE).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.keyword}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {editingId === t.id ? (
                          <Select value={editBundleId} onChange={(e) => setEditBundleId(e.target.value)} className="w-36 text-xs">
                            <option value="">None</option>
                            {bundles.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </Select>
                        ) : (
                          bundles.find((b) => b.id === t.bundleId)?.name ?? '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === t.id ? (
                          <div className="flex items-center gap-2">
                            <Input type="number" min={1} max={10} value={editWeight} onChange={(e) => setEditWeight(Math.max(1, parseInt(e.target.value) || 1))} className="w-16" />
                            <Button onClick={() => updateTopic(t.id)} className="text-xs px-2 py-1">Save</Button>
                            <Button variant="ghost" onClick={() => setEditingId(null)} className="text-xs px-2 py-1">Cancel</Button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(t.id); setEditWeight(t.weight); setEditBundleId(t.bundleId ?? ''); }} className="text-gray-700 hover:text-primary cursor-pointer underline decoration-dotted" title="Click to edit">
                            {t.weight}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="danger" onClick={() => deleteTopic(t.id)} className="text-xs px-2 py-1">Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
