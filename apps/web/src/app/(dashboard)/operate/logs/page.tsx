'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardTitle } from '@/components/Card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/Table';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type Attempt = {
  id: string;
  scheduleJobId: string;
  success: boolean;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  attemptedAt: string;
  postUrn: string | null;
  rolledBack: boolean;
  linkedInPostUrl: string | null;
};

export default function LogsPage() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [rollingBackDupes, setRollingBackDupes] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAttempts = useCallback(() => {
    if (!workspaceId) return;
    setError(null);
    api<{ items: Attempt[] }>(`/workspaces/${workspaceId}/attempts`)
      .then((d) => setAttempts(d.items ?? []))
      .catch((e) => {
        setAttempts([]);
        setError(e instanceof Error ? e.message : String(e));
        toast.error('Failed to load publish attempts');
      })
      .finally(() => setLoading(false));
  }, [workspaceId, toast]);

  const fetchDuplicates = useCallback(() => {
    if (!workspaceId) return;
    api<{ duplicateAttemptIds: string[] }>(`/workspaces/${workspaceId}/attempts/duplicates`)
      .then((d) => setDuplicateIds(new Set(d.duplicateAttemptIds ?? [])))
      .catch(() => setDuplicateIds(new Set()));
  }, [workspaceId]);

  const rollbackOne = async (id: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Remove this post from LinkedIn? This cannot be undone.');
    if (!confirmed) return;
    setRollingBack(id);
    api(`/workspaces/${workspaceId}/attempts/${id}/rollback`, { method: 'DELETE' })
      .then(() => {
        toast.success('Post removed from LinkedIn');
        setAttempts((prev) => prev.map((a) => a.id === id ? { ...a, rolledBack: true } : a));
        setDuplicateIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setRollingBack(null));
  };

  const rollbackDuplicates = async () => {
    if (!workspaceId || duplicateIds.size === 0) return;
    const confirmed = await toast.confirm(`Remove ${duplicateIds.size} duplicate post(s) from LinkedIn? The first post of each duplicate set will be kept.`);
    if (!confirmed) return;
    setRollingBackDupes(true);
    api<{ rolledBack: number; total: number; errors: { attemptId: string; message: string }[] }>(`/workspaces/${workspaceId}/attempts/rollback-duplicates`, { method: 'POST' })
      .then((d) => {
        toast.success(`Removed ${d.rolledBack} duplicate post(s) from LinkedIn.${d.errors?.length ? ` ${d.errors.length} failed.` : ''}`);
        fetchAttempts();
        fetchDuplicates();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setRollingBackDupes(false));
  };

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    fetchAttempts();
    fetchDuplicates();
    refreshRef.current = setInterval(() => { fetchAttempts(); fetchDuplicates(); }, 30000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [workspaceId, fetchAttempts, fetchDuplicates]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Logs & Attempts</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
          <Button
            variant="secondary"
            onClick={() => { setLoading(true); fetchAttempts(); }}
            disabled={loading}
            className="text-xs"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {!workspaceId ? (
        <EmptyState message="Select a workspace in the sidebar." />
      ) : loading && attempts.length === 0 ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <Card>
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-4">
            <p className="font-medium">Error loading logs</p>
            <p className="text-xs mt-1">{error}</p>
            <Button variant="secondary" onClick={() => { setLoading(true); fetchAttempts(); }} className="mt-3 text-xs">
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {duplicateIds.size > 0 && (
            <Card className="mb-6 border-amber-200 bg-amber-50/50">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-amber-800">
                  <strong>{duplicateIds.size} duplicate post(s)</strong> detected (same content published more than once). You can remove the duplicates from LinkedIn and keep the first of each.
                </p>
                <Button
                  variant="secondary"
                  onClick={rollbackDuplicates}
                  disabled={rollingBackDupes}
                >
                  {rollingBackDupes ? 'Removing...' : `Rollback ${duplicateIds.size} duplicate(s)`}
                </Button>
              </div>
            </Card>
          )}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 pb-0 flex items-center justify-between">
            <CardTitle>Publish attempts ({attempts.length})</CardTitle>
          </div>
          {attempts.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No publish attempts yet. Schedule and publish a post to see results here." />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Time</TableHeader>
                <TableHeader>Success</TableHeader>
                <TableHeader>HTTP Status</TableHeader>
                <TableHeader>Error</TableHeader>
                <TableHeader className="text-right">Details</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {attempts.map((a) => (
                  <>
                    <TableRow key={a.id}>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {new Date(a.attemptedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge status={a.success ? 'completed' : 'failed'}>
                          {a.success ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.responseStatus ?? '-'}</TableCell>
                      <TableCell className="max-w-xs text-sm">
                        {a.errorMessage ? (
                          <span className="text-red-600">{a.errorMessage.slice(0, 120)}{a.errorMessage.length > 120 ? '...' : ''}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(a.responseBody || a.errorMessage) && (
                          <Button
                            variant="ghost"
                            onClick={() => toggleExpand(a.id)}
                            className="text-xs px-2 py-1"
                          >
                            {expandedId === a.id ? 'Hide' : 'Show'}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.success && !a.rolledBack && (a.postUrn || a.linkedInPostUrl) && (
                          <Button
                            variant="secondary"
                            onClick={() => rollbackOne(a.id)}
                            disabled={rollingBack === a.id}
                            className="text-xs px-2 py-1"
                          >
                            {rollingBack === a.id ? 'Removing...' : 'Rollback'}
                          </Button>
                        )}
                        {duplicateIds.has(a.id) && (
                          <span className="text-xs text-amber-600 font-medium ml-1">duplicate</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === a.id && (
                      <tr key={`${a.id}-detail`}>
                        <td colSpan={6} className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                          {a.errorMessage && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-500">Error:</span>
                              <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap break-words bg-red-50 rounded p-2">
                                {a.errorMessage}
                              </pre>
                            </div>
                          )}
                          {a.responseBody && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Response body:</span>
                              <pre className="text-xs text-gray-700 mt-1 whitespace-pre-wrap break-words bg-white border border-gray-100 rounded p-2 max-h-48 overflow-y-auto">
                                {a.responseBody}
                              </pre>
                            </div>
                          )}
                          {!a.errorMessage && !a.responseBody && (
                            <p className="text-xs text-gray-400">No additional details.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
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
