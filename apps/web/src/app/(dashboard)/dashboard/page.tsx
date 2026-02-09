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
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/Table';

type Draft = { id: string; content: string; status: string; postType: string };
type Job = { id: string; approvedPostId: string; status: string };
type TrendItem = { id: string; title: string; summary: string | null; score: number | null; sourceId: string; url: string; fetchedAt: string };

function IconDrafts() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
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

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [postingNow, setPostingNow] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trendsRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTrends = useCallback(() => {
    if (!selectedId) return;
    setTrendsLoading(true);
    api<{ items: TrendItem[] }>(`/workspaces/${selectedId}/trends?sort=score&limit=15`)
      .then((d) => setTrends(d.items ?? []))
      .catch(() => setTrends([]))
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
      api<{ items: Draft[] }>(`/workspaces/${selectedId}/drafts`).then((d) => (d.items ?? []).slice(0, 5)).catch(() => [] as Draft[]),
      api<{ items: Job[] }>(`/workspaces/${selectedId}/schedule`).then((d) => (d.items ?? []).slice(0, 3)).catch(() => [] as Job[]),
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/sources`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ items: unknown[] }>(`/workspaces/${selectedId}/topics`).then((d) => d.items?.length ?? 0).catch(() => 0),
      api<{ connected: boolean }>(`/workspaces/${selectedId}/credentials/linkedin`).then((d) => d.connected).catch(() => false),
      api<{ duplicateAttemptIds: string[] }>(`/workspaces/${selectedId}/attempts/duplicates`).then((d) => (d.duplicateAttemptIds ?? []).length).catch(() => 0),
    ])
      .then(([draftsPending, scheduledToday, recentFailures, drafts, jobs, sourcesCount, topicsCount, linkedInConnected, dupCount]) => {
        setStats({ draftsPending: draftsPending as number, scheduledToday: scheduledToday as number, recentFailures: recentFailures as number });
        setHealth({ sourcesCount: sourcesCount as number, topicsCount: topicsCount as number, linkedInConnected: linkedInConnected as boolean });
        setDuplicateCount(dupCount as number);
        setRecentDrafts(drafts as Draft[]);
        setUpcomingJobs(jobs as Job[]);
      })
      .catch(() => {
        setStats({ draftsPending: 0, scheduledToday: 0, recentFailures: 0 });
      })
      .finally(() => setLoading(false));
  }, [selectedId, workspaces]);

  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    setLoading(true);
    fetchData();
    fetchTrends();

    // Auto-refresh every 30 seconds
    refreshRef.current = setInterval(fetchData, 30000);
    // Trends from feed: live refresh every 20 seconds
    trendsRefreshRef.current = setInterval(fetchTrends, 20000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (trendsRefreshRef.current) clearInterval(trendsRefreshRef.current);
    };
  }, [selectedId, fetchData, fetchTrends]);

  const triggerIngest = () => {
    if (!selectedId) return;
    setIngesting(true);
    api<{ jobId: string }>(`/workspaces/${selectedId}/trends/ingest`, { method: 'POST', body: '{}' })
      .then((d) => {
        toast.success(`Pipeline triggered (job: ${d.jobId})`);
        setTimeout(fetchTrends, 3000);
        setTimeout(fetchTrends, 10000);
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setIngesting(false));
  };

  const generatePost = (trendItemId: string) => {
    if (!selectedId) return;
    setGeneratingId(trendItemId);
    api<{ jobId: string }>(`/workspaces/${selectedId}/drafts/generate`, {
      method: 'POST',
      body: JSON.stringify({ trend_item_id: trendItemId }),
    })
      .then(() => {
        toast.success('Generate job queued. Check Drafts in a few seconds.');
        setTimeout(fetchData, 4000);
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setGeneratingId(null));
  };

  const approveDraft = (id: string) => {
    if (!selectedId) return;
    api(`/workspaces/${selectedId}/drafts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_for: new Date(Date.now() + 86400000).toISOString() }),
    })
      .then(() => {
        setRecentDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d)));
        fetchData();
      })
      .catch((e) => toast.error(String(e)));
  };

  const rejectDraft = (id: string) => {
    if (!selectedId) return;
    api(`/workspaces/${selectedId}/drafts/${id}/reject`, { method: 'POST' })
      .then(() => {
        setRecentDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d)));
        fetchData();
      })
      .catch((e) => toast.error(String(e)));
  };

  const postNow = async (id: string) => {
    if (!selectedId) return;
    const confirmed = await toast.confirm('Approve and publish this draft to LinkedIn immediately?');
    if (!confirmed) return;
    setPostingNow(id);
    api(`/workspaces/${selectedId}/schedule/now`, {
      method: 'POST',
      body: JSON.stringify({ draftId: id }),
    })
      .then(() => {
        toast.success('Post queued for immediate publish!');
        fetchData();
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setPostingNow(null));
  };

  const startEdit = (draft: Draft) => {
    setEditingId(draft.id);
    setEditContent(draft.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = (id: string) => {
    if (!selectedId) return;
    setSaving(true);
    api(`/workspaces/${selectedId}/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editContent }),
    })
      .then(() => {
        setRecentDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, content: editContent } : d)));
        setEditingId(null);
        setEditContent('');
      })
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

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Pipeline state, health, and reporting</p>
      </div>

      {wsInfo && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-gray-600">Workspace: <span className="font-medium text-gray-900">{wsInfo.name}</span></span>
          {wsInfo.paused && <Badge status="cancelled">Paused</Badge>}
        </div>
      )}

      {/* Pipeline state visualization */}
      <Card className="mb-8 overflow-hidden">
        <CardHeader>
          <CardTitle>Pipeline state</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Ingest</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium text-gray-700">Rank</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium text-gray-700">Generate</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium text-gray-700">Schedule</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium text-gray-700">Publish</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Run pipeline to ingest from sources, rank by topics, and generate drafts for review.</p>
      </Card>

      {/* Health check */}
      {health && (
        <Card className="mb-8 border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle>Health check</CardTitle>
          </CardHeader>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <li className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.sourcesCount > 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-gray-700">{health.sourcesCount} source(s)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.topicsCount > 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-gray-700">{health.topicsCount} topic(s)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.linkedInConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-gray-700">LinkedIn {health.linkedInConnected ? 'connected' : 'not connected'}</span>
            </li>
          </ul>
          {(health.sourcesCount === 0 || health.topicsCount === 0 || !health.linkedInConnected) && (
            <p className="text-xs text-gray-500 mt-3">
              Add <Link href="/pipeline/sources" className="text-primary hover:underline">sources</Link>, <Link href="/pipeline/topics" className="text-primary hover:underline">topics</Link>, and connect <Link href="/operate/settings" className="text-primary hover:underline">LinkedIn</Link> for full pipeline health.
            </p>
          )}
        </Card>
      )}

      {/* Duplicate alert */}
      {duplicateCount > 0 && (
        <Link href="/operate/logs" className="block mb-8">
          <Card className="border-amber-200 bg-amber-50/50 hover:ring-2 hover:ring-amber-200 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-800 font-medium">
                {duplicateCount} duplicate post(s) detected — fix in Logs
              </p>
              <span className="text-xs text-amber-600 font-medium">View Logs →</span>
            </div>
          </Card>
        </Link>
      )}

      {/* Reporting / stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/pipeline/drafts" className="block">
            <Card className="border-l-4 border-l-amber-400 cursor-pointer hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-amber-500"><IconDrafts /></span>
                <CardTitle>Drafts pending</CardTitle>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{stats.draftsPending}</p>
              <p className="text-xs text-gray-400 mt-1">Click to review</p>
            </Card>
          </Link>
          <Link href="/operate/schedule" className="block">
            <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-blue-500"><IconCalendar /></span>
                <CardTitle>Scheduled</CardTitle>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{stats.scheduledToday}</p>
              <p className="text-xs text-gray-400 mt-1">Click to manage</p>
            </Card>
          </Link>
          <Link href="/operate/logs" className="block">
            <Card className="border-l-4 border-l-red-400 cursor-pointer hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-red-500"><IconAlert /></span>
                <CardTitle>Recent failures</CardTitle>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{stats.recentFailures}</p>
              <p className="text-xs text-gray-400 mt-1">Click to view logs</p>
            </Card>
          </Link>
        </div>
      ) : (
        <EmptyState message="No data yet. Add a source and run Ingest to get started." className="mb-8" />
      )}

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Button onClick={triggerIngest} disabled={!selectedId || ingesting}>
          {ingesting ? 'Running pipeline…' : 'Run pipeline'}
        </Button>
        <Link href="/pipeline/drafts">
          <Button variant="secondary">View drafts</Button>
        </Link>
        <Link href="/pipeline/topics">
          <Button variant="secondary">Topics</Button>
        </Link>
        <Link href="/pipeline/sources">
          <Button variant="ghost">Add source</Button>
        </Link>
        <Link href="/operate/settings">
          <Button variant="ghost">Settings</Button>
        </Link>
      </div>

      {/* Trends from feed (live, auto-refresh) */}
      <Card className="mb-8 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <CardTitle>Trends from feed</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Live · refreshes every 20s</span>
              <Button variant="ghost" onClick={fetchTrends} disabled={trendsLoading} className="text-xs">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-4">
          Ingested items from your sources, ranked by topics. Generate a post from any row to create a draft (with image).
        </p>
        {trendsLoading && trends.length === 0 ? (
          <SkeletonList rows={5} />
        ) : trends.length === 0 ? (
          <EmptyState
            message="No trend items yet. Add sources and run the pipeline to ingest content."
            actionLabel="Run pipeline"
            onAction={triggerIngest}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeader>Title</TableHeader>
                <TableHeader>Score</TableHeader>
                <TableHeader>Fetched</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {trends.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 hover:text-primary line-clamp-2"
                        title={t.title}
                      >
                        {t.title}
                      </a>
                      {t.summary && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.summary}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge status={t.score != null && t.score > 0 ? 'completed' : 'pending'}>
                        {t.score != null ? t.score.toFixed(1) : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(t.fetchedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => generatePost(t.id)}
                        disabled={generatingId === t.id}
                        className="text-xs px-2 py-1"
                      >
                        {generatingId === t.id ? 'Generating…' : 'Generate post'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Recent drafts (interactive) + Upcoming schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent drafts</CardTitle>
              <Link href="/pipeline/drafts" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          {recentDrafts.length === 0 ? (
            <p className="text-sm text-gray-500">No drafts yet. Run a pipeline or create one manually.</p>
          ) : (
            <ul className="space-y-4">
              {recentDrafts.map((d) => (
                <li key={d.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <Badge status={d.status}>{d.status}</Badge>
                    <span className="text-xs text-gray-400">{d.postType}</span>
                  </div>

                  {editingId === d.id ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[80px]"
                        rows={4}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        maxLength={3000}
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${editContent.length > 2800 ? 'text-red-500' : 'text-gray-400'}`}>
                          {editContent.length}/3000
                        </span>
                        <div className="flex gap-2">
                          <Button onClick={() => saveEdit(d.id)} disabled={saving} className="text-xs px-2 py-1">
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button variant="ghost" onClick={cancelEdit} className="text-xs px-2 py-1">Cancel</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                      {d.content.slice(0, 150)}{d.content.length > 150 ? '...' : ''}
                    </p>
                  )}

                  {editingId !== d.id && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(d.status === 'pending_review' || d.status === 'draft') && (
                        <Button variant="ghost" onClick={() => startEdit(d)} className="text-xs px-2 py-1">
                          Edit
                        </Button>
                      )}
                      {d.status === 'pending_review' && (
                        <>
                          <Button onClick={() => approveDraft(d.id)} className="text-xs px-2 py-1">
                            Approve
                          </Button>
                          <Button
                            onClick={() => postNow(d.id)}
                            disabled={postingNow === d.id}
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {postingNow === d.id ? 'Publishing...' : 'Post Now'}
                          </Button>
                          <Button variant="danger" onClick={() => rejectDraft(d.id)} className="text-xs px-2 py-1">
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming schedule</CardTitle>
              <Link href="/operate/schedule" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          {upcomingJobs.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing scheduled. Approve a draft and schedule it.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingJobs.map((j) => (
                <li key={j.id}>
                  <Link href="/operate/schedule" className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700 font-mono">{j.id.slice(0, 8)}</span>
                    <Badge status={j.status}>{j.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-gray-300 mt-6 text-center">Auto-refreshes every 30s</p>
    </div>
  );
}
