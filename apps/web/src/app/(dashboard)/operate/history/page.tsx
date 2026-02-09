'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type HistoryItem = {
  id: string;
  scheduleJobId: string;
  success: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  attemptedAt: string;
  content: string | null;
  platform: string;
  linkedInPostUrl: string | null;
  postUrn: string | null;
  rolledBack: boolean;
  rolledBackAt: string | null;
};

function IconLinkedIn() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryPage() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [rollingBackDupes, setRollingBackDupes] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = useCallback(() => {
    if (!workspaceId) return;
    const qs = filter === 'all' ? '' : `?success=${filter === 'success'}`;
    api<{ items: HistoryItem[] }>(`/workspaces/${workspaceId}/attempts${qs}`)
      .then((d) => setItems(d.items ?? []))
      .catch((e) => { toast.error(String(e)); setItems([]); })
      .finally(() => setLoading(false));
  }, [workspaceId, filter, toast]);

  const fetchDuplicates = useCallback(() => {
    if (!workspaceId) return;
    api<{ duplicateAttemptIds: string[] }>(`/workspaces/${workspaceId}/attempts/duplicates`)
      .then((d) => setDuplicateIds(new Set(d.duplicateAttemptIds ?? [])))
      .catch(() => setDuplicateIds(new Set()));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    fetchHistory();
    fetchDuplicates();
    refreshRef.current = setInterval(() => { fetchHistory(); fetchDuplicates(); }, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [workspaceId, fetchHistory, fetchDuplicates]);

  const rollbackDuplicates = async () => {
    if (!workspaceId || duplicateIds.size === 0) return;
    const confirmed = await toast.confirm(`Remove ${duplicateIds.size} duplicate post(s) from LinkedIn? The first of each duplicate set will be kept.`);
    if (!confirmed) return;
    setRollingBackDupes(true);
    api<{ rolledBack: number; errors: { attemptId: string; message: string }[] }>(`/workspaces/${workspaceId}/attempts/rollback-duplicates`, { method: 'POST' })
      .then((d) => {
        toast.success(`Removed ${d.rolledBack} duplicate post(s) from LinkedIn.${d.errors?.length ? ` ${d.errors.length} failed.` : ''}`);
        fetchHistory();
        fetchDuplicates();
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setRollingBackDupes(false));
  };

  const rollback = async (id: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Remove this post from LinkedIn? This cannot be undone.');
    if (!confirmed) return;
    setRollingBack(id);
    api(`/workspaces/${workspaceId}/attempts/${id}/rollback`, { method: 'DELETE' })
      .then(() => {
        toast.success('Post removed from LinkedIn');
        setItems((prev) => prev.map((item) =>
          item.id === id ? { ...item, rolledBack: true, rolledBackAt: new Date().toISOString() } : item
        ));
        setDuplicateIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setRollingBack(null));
  };

  const successCount = items.filter((i) => i.success).length;
  const failedCount = items.filter((i) => !i.success).length;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Post History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Everything that was published from this workspace
          </p>
        </div>
        <Button variant="secondary" onClick={() => { setLoading(true); fetchHistory(); }}>
          Refresh
        </Button>
      </div>

      {!workspaceId ? (
        <EmptyState message="Select a workspace in the sidebar." />
      ) : loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          message="No posts yet. Approve a draft, schedule it, and it will appear here after publishing."
          actionLabel="Go to Drafts"
          onAction={() => { window.location.href = '/pipeline/drafts'; }}
        />
      ) : (
        <>
          {duplicateIds.size > 0 && (
            <Card className="mb-6 border-amber-200 bg-amber-50/50">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-amber-800">
                  <strong>{duplicateIds.size} duplicate post(s)</strong> — same content was published more than once. Remove duplicates from LinkedIn (first of each set is kept).
                </p>
                <Button variant="secondary" onClick={rollbackDuplicates} disabled={rollingBackDupes}>
                  {rollingBackDupes ? 'Removing...' : `Rollback ${duplicateIds.size} duplicate(s)`}
                </Button>
              </div>
            </Card>
          )}
          {/* Summary bar + filter */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{items.length} posts</span>
              <span className="text-gray-300">|</span>
              <span className="text-green-600 font-medium">{successCount} succeeded</span>
              <span className="text-gray-300">|</span>
              <span className="text-red-500 font-medium">{failedCount} failed</span>
            </div>
            <div className="flex gap-1 ml-auto">
              {(['all', 'success', 'failed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    filter === f
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'success' ? 'Succeeded' : 'Failed'}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {items.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <Card key={item.id} className="relative">
                  {/* Status indicator stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${item.success ? 'bg-green-500' : 'bg-red-400'}`} />

                  <div className="pl-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {item.rolledBack ? (
                          <Badge status="cancelled">Rolled back</Badge>
                        ) : (
                          <Badge status={item.success ? 'completed' : 'failed'}>
                            {item.success ? 'Published' : 'Failed'}
                          </Badge>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                          <IconLinkedIn />
                          {item.platform ?? 'linkedin'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <IconClock />
                        <span title={formatDate(item.attemptedAt)}>{timeAgo(item.attemptedAt)}</span>
                      </div>
                    </div>

                    {/* Post content */}
                    {item.content ? (
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                        {expanded ? item.content : (
                          <>
                            {item.content.slice(0, 280)}
                            {item.content.length > 280 && (
                              <button
                                onClick={() => setExpandedId(item.id)}
                                className="text-primary hover:underline ml-1 font-medium"
                              >
                                ...show more
                              </button>
                            )}
                          </>
                        )}
                        {expanded && item.content.length > 280 && (
                          <button
                            onClick={() => setExpandedId(null)}
                            className="block text-primary hover:underline mt-1 text-xs font-medium"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic mb-3">Content not available</p>
                    )}

                    {/* Footer row */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50 text-xs">
                      <span className="text-gray-400 font-mono">{item.id.slice(0, 8)}</span>
                      {duplicateIds.has(item.id) && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">duplicate</span>
                      )}
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">{formatDate(item.attemptedAt)}</span>

                      {item.responseStatus && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className={item.success ? 'text-green-600' : 'text-red-500'}>
                            HTTP {item.responseStatus}
                          </span>
                        </>
                      )}

                      {item.linkedInPostUrl && !item.rolledBack && (
                        <a
                          href={item.linkedInPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View on LinkedIn <IconExternalLink />
                        </a>
                      )}

                      {/* Rollback button for successful, non-rolled-back posts */}
                      {item.success && !item.rolledBack && (
                        <Button
                          variant="danger"
                          onClick={() => rollback(item.id)}
                          disabled={rollingBack === item.id}
                          className="text-xs ml-auto"
                        >
                          {rollingBack === item.id ? 'Removing...' : 'Rollback'}
                        </Button>
                      )}

                      {item.rolledBack && item.rolledBackAt && (
                        <span className="text-xs text-gray-400 ml-auto">
                          Rolled back {formatDate(item.rolledBackAt)}
                        </span>
                      )}

                      {!item.success && item.errorMessage && (
                        <button
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          className="text-red-500 hover:underline ml-auto"
                        >
                          {expanded ? 'Hide error' : 'Show error'}
                        </button>
                      )}
                    </div>

                    {/* Error details (expanded) */}
                    {expanded && !item.success && item.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 font-mono whitespace-pre-wrap">
                        {item.errorMessage}
                        {item.responseBody && (
                          <>
                            {'\n\n--- Response Body ---\n'}
                            {item.responseBody}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-gray-300 mt-6 text-center">Auto-refreshes every 30s</p>
        </>
      )}
    </>
  );
}
