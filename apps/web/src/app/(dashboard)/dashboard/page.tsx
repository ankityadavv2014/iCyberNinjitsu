'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard, SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useInspector } from '@/contexts/InspectorContext';
import { PipelineHUD, type PipelineHUDStep } from '@/components/PipelineHUD';

type Draft = { id: string; content: string; status: string; postType: string };
type Job = { id: string; approvedPostId: string; status: string };
type TrendItem = { id: string; title: string; summary: string | null; score: number | null; sourceId: string; url: string; fetchedAt: string };
type DiscoveryItem = { id: string; title: string; url: string; score: number | null; hotScore: number; fetchedAt: string };
type DiscoveryResponse = { items: DiscoveryItem[]; sparkline: number[] };
type MomentumItem = { id: string; label: string; keywords: unknown; hotScore: number; velocity: number; sourceDiversity: number; confidence: number; computedAt: string | null };
type MomentumResponse = { items: MomentumItem[] };
type ActionQueueItem = { id: string; topicId: string; topicLabel: string; hotScore: number; triggeredAt: string; status: string };

const TOPIC_RADAR_CAP = 8;
const ACTION_QUEUE_CAP = 5;
const TIMELINE_CAP = 10;
const PANEL_MAX_H = 'min-h-[260px] max-h-[320px]';

function MiniSparkline({ data, className = '' }: { data: number[]; className?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data);
  const w = 80;
  const h = 24;
  const pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - 2 * pad);
    const y = h - pad - (v / max) * (h - 2 * pad);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1" points={points} />
    </svg>
  );
}

export default function DashboardPage() {
  const { workspaceId: selectedId, workspaces } = useWorkspace();
  const toast = useToast();
  const [stats, setStats] = useState<{ draftsPending: number; scheduledToday: number; recentFailures: number } | null>(null);
  const [health, setHealth] = useState<{ sourcesCount: number; topicsCount: number; linkedInConnected: boolean } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentDrafts, setRecentDrafts] = useState<Draft[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [wsInfo, setWsInfo] = useState<{ name: string; paused: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [postingNow, setPostingNow] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [momentum, setMomentum] = useState<MomentumResponse | null>(null);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [actionGenId, setActionGenId] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trendsRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setContent: setInspectorContent } = useInspector();

  const fetchTrends = useCallback(() => {
    if (!selectedId) return;
    setTrendsLoading(true);
    Promise.all([
      api<DiscoveryResponse>(`/workspaces/${selectedId}/trends/discovery?limit=${TOPIC_RADAR_CAP}`).catch(() => null),
      api<MomentumResponse>(`/workspaces/${selectedId}/trends/momentum?limit=${TOPIC_RADAR_CAP}`).catch(() => null),
    ])
      .then(([d, m]) => {
        setDiscovery(d ?? null);
        setMomentum(m ?? null);
      })
      .finally(() => setTrendsLoading(false));
  }, [selectedId]);

  const fetchData = useCallback(() => {
    if (!selectedId) return;
    const ws = workspaces.find((w) => w.id === selectedId);
    if (ws) setWsInfo({ name: ws.name ?? 'Workspace', paused: ws.paused ?? false });
    Promise.all([
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/drafts?status=pending_review`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/schedule`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/attempts?success=false`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ items: Draft[] }>(`/workspaces/${selectedId}/drafts`).then((d) => (d.items ?? []).slice(0, ACTION_QUEUE_CAP)).catch(() => [] as Draft[]),
      api<{ items: Job[] }>(`/workspaces/${selectedId}/schedule`).then((d) => (d.items ?? []).slice(0, TIMELINE_CAP)).catch(() => [] as Job[]),
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/sources`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/topics`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ connected: boolean }>(`/workspaces/${selectedId}/credentials/linkedin`).then((d) => d.connected).catch(() => false),
      api<{ duplicateAttemptIds: string[] }>(`/workspaces/${selectedId}/attempts/duplicates`).then((d) => (d.duplicateAttemptIds ?? []).length).catch(() => 0),
      api<{ items: ActionQueueItem[] }>(`/workspaces/${selectedId}/action-queue?status=pending&limit=${ACTION_QUEUE_CAP}`).then((d) => d.items ?? []).catch(() => []),
    ])
      .then(([draftsPending, scheduledToday, recentFailures, drafts, jobs, sourcesCount, topicsCount, linkedInConnected, dupCount, aq]) => {
        setStats({ draftsPending: draftsPending as number, scheduledToday: scheduledToday as number, recentFailures: recentFailures as number });
        setHealth({ sourcesCount: sourcesCount as number, topicsCount: topicsCount as number, linkedInConnected: linkedInConnected as boolean });
        setDuplicateCount(dupCount as number);
        setRecentDrafts(drafts as Draft[]);
        setUpcomingJobs(jobs as Job[]);
        setActionQueue((aq ?? []) as ActionQueueItem[]);
      })
      .catch(() => setStats({ draftsPending: 0, scheduledToday: 0, recentFailures: 0 }))
      .finally(() => setLoading(false));
  }, [selectedId, workspaces]);

  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    setLoading(true);
    fetchData();
    fetchTrends();
    refreshRef.current = setInterval(fetchData, 30000);
    trendsRefreshRef.current = setInterval(fetchTrends, 20000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (trendsRefreshRef.current) clearInterval(trendsRefreshRef.current);
    };
  }, [selectedId, fetchData, fetchTrends]);

  const [pipelineStep, setPipelineStep] = useState<'fetching' | 'ranking' | 'ready' | null>(null);
  const triggerIngest = () => {
    if (!selectedId) return;
    setIngesting(true);
    setPipelineStep('fetching');
    api<{ jobId: string }>(`/workspaces/${selectedId}/trends/ingest`, { method: 'POST', body: '{}' })
      .then(() => {
        toast.success('Pipeline started');
        setTimeout(() => setPipelineStep('ranking'), 2000);
        setTimeout(() => { setPipelineStep('ready'); fetchTrends(); fetchData(); }, 5000);
        setTimeout(() => setPipelineStep(null), 8000);
      })
      .catch((e) => { toast.error(String(e)); setPipelineStep(null); })
      .finally(() => setIngesting(false));
  };

  const generatePost = (trendItemId: string) => {
    if (!selectedId) return;
    setGeneratingId(trendItemId);
    api<{ jobId: string }>(`/workspaces/${selectedId}/drafts/generate`, { method: 'POST', body: JSON.stringify({ trend_item_id: trendItemId }) })
      .then(() => { toast.success('Generate job queued. Check Drafts in a few seconds.'); setTimeout(fetchData, 4000); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setGeneratingId(null));
  };

  const generateFromTopic = (topicId: string) => {
    if (!selectedId) return;
    setGeneratingId(topicId);
    api<{ jobId: string }>(`/workspaces/${selectedId}/drafts/generate`, { method: 'POST', body: JSON.stringify({ topic_id: topicId }) })
      .then(() => { toast.success('Generate job queued.'); setTimeout(fetchData, 4000); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setGeneratingId(null));
  };

  const actionQueueGenerate = (actionId: string) => {
    if (!selectedId) return;
    setActionGenId(actionId);
    api(`/workspaces/${selectedId}/action-queue/${actionId}/generate`, { method: 'POST', body: JSON.stringify({}) })
      .then(() => { toast.success('Generate job queued.'); setActionQueue((prev) => prev.filter((a) => a.id !== actionId)); fetchData(); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setActionGenId(null));
  };

  const actionQueueIgnore = (actionId: string) => {
    if (!selectedId) return;
    api(`/workspaces/${selectedId}/action-queue/${actionId}/ignore`, { method: 'POST' })
      .then(() => { setActionQueue((prev) => prev.filter((a) => a.id !== actionId)); fetchData(); })
      .catch((e) => toast.error(String(e)));
  };

  const approveDraft = (id: string) => {
    if (!selectedId) return;
    api(`/workspaces/${selectedId}/drafts/${id}/approve`, { method: 'POST', body: JSON.stringify({ scheduled_for: new Date(Date.now() + 86400000).toISOString() }) })
      .then(() => { setRecentDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d))); fetchData(); })
      .catch((e) => toast.error(String(e)));
  };

  const rejectDraft = (id: string) => {
    if (!selectedId) return;
    api(`/workspaces/${selectedId}/drafts/${id}/reject`, { method: 'POST' })
      .then(() => { setRecentDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d))); fetchData(); })
      .catch((e) => toast.error(String(e)));
  };

  const postNow = async (id: string) => {
    if (!selectedId) return;
    const confirmed = await toast.confirm('Approve and publish this draft to LinkedIn immediately?');
    if (!confirmed) return;
    setPostingNow(id);
    api(`/workspaces/${selectedId}/schedule/now`, { method: 'POST', body: JSON.stringify({ draftId: id }) })
      .then(() => { toast.success('Post queued for immediate publish!'); fetchData(); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setPostingNow(null));
  };

  const startEdit = (draft: Draft) => { setEditingId(draft.id); setEditContent(draft.content); };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };

  const saveEdit = (id: string) => {
    if (!selectedId) return;
    setSaving(true);
    api(`/workspaces/${selectedId}/drafts/${id}`, { method: 'PATCH', body: JSON.stringify({ content: editContent }) })
      .then(() => { setRecentDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, content: editContent } : d))); setEditingId(null); setEditContent(''); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setSaving(false));
  };

  if (!selectedId) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard</h1>
        <EmptyState message="Select a workspace in the sidebar to get started." />
      </>
    );
  }

  const hudSteps: PipelineHUDStep[] = [
    {
      label: 'Fetch',
      state: pipelineStep === 'fetching' ? 'active' : pipelineStep ? 'done' : 'idle',
      statusLine: pipelineStep === 'fetching' ? 'Fetching sources…' : undefined,
    },
    {
      label: 'Parse',
      state: pipelineStep === 'ranking' || pipelineStep === 'ready' ? 'done' : pipelineStep ? 'active' : 'idle',
      statusLine: pipelineStep === 'ranking' ? 'Parsing & clustering items…' : undefined,
    },
    {
      label: 'Rank',
      state: pipelineStep === 'ranking' ? 'active' : pipelineStep === 'ready' ? 'done' : 'idle',
      statusLine: pipelineStep === 'ranking' ? 'Ranking momentum & confidence…' : undefined,
    },
    {
      label: 'Generate',
      state: pipelineStep === 'ready' ? 'active' : 'idle',
      statusLine: pipelineStep === 'ready' ? 'Generating drafts from top signals…' : undefined,
    },
    {
      label: 'Queue',
      state: pipelineStep === 'ready' ? 'active' : 'idle',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Global pipeline HUD */}
      <PipelineHUD steps={hudSteps} onViewLogs={() => window.location.assign('/operate/logs')} />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 mt-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Control Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{wsInfo?.name ?? 'Workspace'} · at-a-glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {wsInfo?.paused && <Badge status="cancelled">Paused</Badge>}
          {pipelineStep && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 dark:bg-primary/20 px-3 py-1.5 text-sm text-primary">
              {pipelineStep === 'fetching' && <span className="animate-pulse">1. Fetching sources…</span>}
              {pipelineStep === 'ranking' && <span className="animate-pulse">2. Ranking…</span>}
              {pipelineStep === 'ready' && <span className="font-medium">3. Ready — check Discovery</span>}
            </div>
          )}
          <Button onClick={triggerIngest} disabled={!selectedId || ingesting} className="shrink-0">
            {ingesting ? 'Running…' : 'Run pipeline'}
          </Button>
        </div>
      </div>

      {duplicateCount > 0 && (
        <Link href="/operate/logs" className="block mb-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2 text-sm text-amber-800 hover:ring-2 hover:ring-amber-200 transition-all">
            {duplicateCount} duplicate post(s) — fix in Logs →
          </div>
        </Link>
      )}

      {/* 2x2 mission control grid: panels with internal scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Heat Ladder — signals by hotness */}
        <Card className={`flex flex-col overflow-hidden bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70 ${PANEL_MAX_H}`}>
          <CardHeader className="shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-[0.18em] mb-1">
              <span>Signals</span>
              <span className="text-[10px] text-gray-500">Ladder</span>
            </div>
            <div className="flex items-center justify-between">
              <CardTitle>Signal ladder</CardTitle>
              <Link href="/pipeline/topics" className="text-xs text-primary hover:underline">Discovery</Link>
            </div>
            {discovery?.sparkline?.length ? (
              <div className="mt-1 flex items-center gap-1" title="Feed activity (7d)">
                <MiniSparkline data={discovery.sparkline} className="h-5 w-16" />
              </div>
            ) : null}
          </CardHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {trendsLoading && !discovery && !momentum ? (
              <SkeletonList rows={4} />
            ) : (momentum?.items?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                      <th className="py-1.5 pr-2 font-medium">Topic</th>
                      <th className="py-1.5 pr-2 font-medium w-16">Hot</th>
                      <th className="py-1.5 pr-2 font-medium w-14">Vel</th>
                      <th className="py-1.5 pr-2 font-medium w-14">Conf</th>
                      <th className="py-1.5 font-medium text-right">Sources</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momentum.items.slice(0, TOPIC_RADAR_CAP).map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer"
                        onClick={() => {
                          api<{ topic: { label: string; keywords: unknown }; topSources: { sourceId: string; strength: number; type: string }[]; recommendedStrategies: { id: string; name: string; slug: string }[] }>(`/workspaces/${selectedId}/trends/topic-clusters/${t.id}`)
                            .then((data) => setInspectorContent(
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">{data.topic.label}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Hot: {t.hotScore.toFixed(2)} · Vel: {t.velocity.toFixed(2)} · Conf: {(t.confidence * 100).toFixed(0)}%</p>
                                {data.topSources?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Top sources</p>
                                    <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                                      {data.topSources.slice(0, 5).map((s) => (
                                        <li key={s.sourceId}>{(s.type || 'source')} — strength {(s.strength * 100).toFixed(0)}%</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {data.recommendedStrategies?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Recommended strategies</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{data.recommendedStrategies.map((r) => r.name).join(', ')}</p>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-2">
                                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); generateFromTopic(t.id); }} disabled={generatingId === t.id} className="text-xs">
                                    {generatingId === t.id ? '…' : 'Generate LinkedIn'}
                                  </Button>
                                  <span className="text-xs text-gray-400">Multi-post (soon)</span>
                                </div>
                              </div>
                            ))
                            .catch(() => setInspectorContent(<div className="space-y-2"><h4 className="font-semibold">{t.label}</h4><p className="text-xs text-gray-500">Hot: {t.hotScore.toFixed(2)}</p><Button variant="secondary" onClick={(e) => { e.stopPropagation(); generateFromTopic(t.id); }} disabled={generatingId === t.id} className="text-xs">Generate LinkedIn</Button></div>));
                        }}
                      >
                        <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-gray-100 line-clamp-1" title={t.label}>{t.label}</td>
                        <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{t.hotScore.toFixed(1)}</td>
                        <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{t.velocity.toFixed(1)}</td>
                        <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{(t.confidence * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">{(t.sourceDiversity * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : discovery?.items?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                      <th className="py-1.5 pr-2 font-medium">Topic / Trend</th>
                      <th className="py-1.5 pr-2 font-medium w-16">Hot</th>
                      <th className="py-1.5 pr-2 font-medium w-14">Vel</th>
                      <th className="py-1.5 pr-2 font-medium w-14">Div</th>
                      <th className="py-1.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discovery.items.slice(0, TOPIC_RADAR_CAP).map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => setInspectorContent(
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Hot score: {t.hotScore.toFixed(2)}</p>
                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline break-all">{t.url}</a>
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button variant="secondary" onClick={(e) => { e.stopPropagation(); generatePost(t.id); }} disabled={generatingId === t.id} className="text-xs">
                                {generatingId === t.id ? '…' : 'Generate LinkedIn'}
                              </Button>
                              <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">Open brief</a>
                              <span className="text-xs text-gray-400">Multi-post (soon)</span>
                            </div>
                          </div>
                        )}
                      >
                        <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-gray-100 line-clamp-1" title={t.title}>{t.title}</td>
                        <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{t.hotScore.toFixed(1)}</td>
                        <td className="py-1.5 pr-2 text-gray-400 dark:text-gray-500">—</td>
                        <td className="py-1.5 pr-2 text-gray-400 dark:text-gray-500">—</td>
                        <td className="py-1.5 text-right">
                          <Button variant="secondary" onClick={(e) => { e.stopPropagation(); generatePost(t.id); }} disabled={generatingId === t.id} className="text-xs px-2 py-0.5">
                            {generatingId === t.id ? '…' : 'Generate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No trends yet. Run pipeline." actionLabel="Run pipeline" onAction={triggerIngest} />
            )}
          </div>
        </Card>

        {/* Action Queue: momentum-triggered decisions, then recent drafts */}
        <Card className={`flex flex-col overflow-hidden bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70 ${PANEL_MAX_H}`}>
          <CardHeader className="shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-[0.18em] mb-1">
              <span>Decisions</span>
              <span className="text-[10px] text-gray-500">Queue</span>
            </div>
            <div className="flex items-center justify-between">
              <CardTitle>Action queue</CardTitle>
              <Link href="/pipeline/drafts" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {stats != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {actionQueue.length > 0 ? `${actionQueue.length} decision(s)` : ''}
                {actionQueue.length > 0 && stats.draftsPending > 0 ? ' · ' : ''}
                {stats.draftsPending > 0 ? `${stats.draftsPending} pending` : ''}
                {stats.recentFailures > 0 ? ` · ${stats.recentFailures} failures` : ''}
              </p>
            )}
          </CardHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {loading ? (
              <SkeletonList rows={3} />
            ) : actionQueue.length > 0 ? (
              <ul className="space-y-2">
                {actionQueue.slice(0, ACTION_QUEUE_CAP).map((a) => (
                  <li key={a.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{a.topicLabel}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Hot {a.hotScore.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button onClick={() => actionQueueGenerate(a.id)} disabled={actionGenId === a.id} className="text-xs px-2 py-0.5">
                        {actionGenId === a.id ? '…' : 'Generate LinkedIn'}
                      </Button>
                      <Button variant="ghost" onClick={() => actionQueueIgnore(a.id)} className="text-xs px-2 py-0.5">Ignore</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : recentDrafts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No decisions or drafts. Run pipeline for momentum-triggered actions.</p>
            ) : (
              <ul className="space-y-2">
                {recentDrafts.map((d) => (
                  <li key={d.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge status={d.status}>{d.status}</Badge>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{d.postType}</span>
                    </div>
                    {editingId === d.id ? (
                      <div className="space-y-1.5">
                        <textarea className="w-full text-sm border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-primary/30 resize-y min-h-[60px]" value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={3000} />
                        <div className="flex gap-2">
                          <Button onClick={() => saveEdit(d.id)} disabled={saving} className="text-xs px-2 py-1">{saving ? 'Saving…' : 'Save'}</Button>
                          <Button variant="ghost" onClick={cancelEdit} className="text-xs px-2 py-1">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-1.5">{d.content.slice(0, 120)}{d.content.length > 120 ? '…' : ''}</p>
                        <div className="flex flex-wrap gap-1">
                          {(d.status === 'pending_review' || d.status === 'draft') && <Button variant="ghost" onClick={() => startEdit(d)} className="text-xs px-2 py-0.5">Edit</Button>}
                          {d.status === 'pending_review' && (
                            <>
                              <Button onClick={() => approveDraft(d.id)} className="text-xs px-2 py-0.5">Approve</Button>
                              <Button onClick={() => postNow(d.id)} disabled={postingNow === d.id} className="text-xs px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white">{postingNow === d.id ? '…' : 'Post Now'}</Button>
                              <Button variant="danger" onClick={() => rejectDraft(d.id)} className="text-xs px-2 py-0.5">Reject</Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Publish Timeline */}
        <Card className={`flex flex-col overflow-hidden bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70 ${PANEL_MAX_H}`}>
          <CardHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle>Publish Timeline</CardTitle>
              <Link href="/operate/schedule" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {stats != null && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.scheduledToday} scheduled</p>}
          </CardHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {loading ? (
              <SkeletonList rows={3} />
            ) : upcomingJobs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nothing scheduled. Approve a draft and schedule.</p>
            ) : (
              <ul className="space-y-1.5">
                {upcomingJobs.map((j) => (
                  <li key={j.id}>
                    <Link href="/operate/schedule" className="flex items-center justify-between gap-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 -mx-2 transition-colors">
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{j.id.slice(0, 8)}</span>
                      <Badge status={j.status}>{j.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Pipeline Health */}
        <Card className={`flex flex-col overflow-hidden bg-slate-950/40 dark:bg-slate-950/60 border-slate-800/70 ${PANEL_MAX_H}`}>
          <CardHeader className="shrink-0">
            <CardTitle>Pipeline Health</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3 text-gray-700 dark:text-gray-300">
              <span className="font-medium">Ingest</span>
              <span className="text-gray-400 dark:text-gray-500">→</span>
              <span className="font-medium">Rank</span>
              <span className="text-gray-400 dark:text-gray-500">→</span>
              <span className="font-medium">Generate</span>
              <span className="text-gray-400 dark:text-gray-500">→</span>
              <span className="font-medium">Schedule</span>
              <span className="text-gray-400 dark:text-gray-500">→</span>
              <span className="font-medium">Publish</span>
            </div>
            {health ? (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.sourcesCount > 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {health.sourcesCount} source(s)
                </li>
                <li className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.topicsCount > 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {health.topicsCount} topic(s)
                </li>
                <li className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.linkedInConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
                  LinkedIn {health.linkedInConnected ? 'connected' : 'not connected'}
                </li>
              </ul>
            ) : (
              <SkeletonList rows={3} />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              <Link href="/pipeline/sources" className="text-primary hover:underline">Sources</Link>
              {' · '}
              <Link href="/pipeline/topics" className="text-primary hover:underline">Topics</Link>
              {' · '}
              <Link href="/operate/settings" className="text-primary hover:underline">Settings</Link>
            </p>
          </div>
        </Card>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">Auto-refresh every 20–30s</p>
    </div>
  );
}
