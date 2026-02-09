'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useInspector } from '@/contexts/InspectorContext';

const LINKEDIN_CHAR_LIMIT = 3000;
const PAGE_SIZE = 20;

type Evidence = { url: string; title: string; fetchedAt: string };

type Draft = {
  id: string;
  content: string;
  status: string;
  postType: string;
  trendItemId: string | null;
  version?: number;
  confidenceScore?: number | null;
  platform?: string;
  createdAt: string;
  updatedAt: string;
  publishFailedReason?: string;
  evidence?: Evidence;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function formatSourceAge(iso: string) {
  const d = new Date(iso);
  const h = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PipelineDraftsPage() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [items, setItems] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Draft | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [postingNow, setPostingNow] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAttached, setImageAttached] = useState(false);
  const { setContent: setInspectorContent } = useInspector();

  const fetchList = useCallback((off = 0, append = false) => {
    if (!workspaceId) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(off));
    if (statusFilter) params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    api<{ items: Draft[]; total: number }>(`/workspaces/${workspaceId}/drafts?${params}`)
      .then((d) => {
        setItems(append ? (prev) => [...prev, ...d.items] : d.items);
        setTotal(d.total);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [workspaceId, statusFilter, search]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetchList(0, false);
  }, [workspaceId, fetchList]);

  const fetchDetail = useCallback((id: string) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    setSelectedId(id);
    setImageAttached(false);
    setInspectorContent(<div className="p-4 text-sm text-gray-500">Loading draft…</div>);
    api<Draft>(`/workspaces/${workspaceId}/drafts/${id}`)
      .then((d) => {
        setDetail(d);
        setEditingContent(d.content);
      })
      .catch(() => { setDetail(null); setInspectorContent(null); })
      .finally(() => setDetailLoading(false));
  }, [workspaceId, setInspectorContent]);

  const refetchList = useCallback(() => { fetchList(0, false); }, [fetchList]);
  const refetchDetail = useCallback(() => { if (selectedId && workspaceId) api<Draft>(`/workspaces/${workspaceId}/drafts/${selectedId}`).then(setDetail); }, [selectedId, workspaceId]);

  const approve = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/drafts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_for: new Date(Date.now() + 86400000).toISOString() }),
    })
      .then(() => { refetchList(); refetchDetail(); setDetail((d) => d && d.id === id ? { ...d, status: 'approved' } : d); })
      .catch((e) => toast.error(String(e)));
  };

  const reject = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/drafts/${id}/reject`, { method: 'POST' })
      .then(() => { refetchList(); setSelectedId(null); setDetail(null); })
      .catch((e) => toast.error(String(e)));
  };

  const saveEdit = (id: string) => {
    if (!workspaceId) return;
    setSaving(true);
    api(`/workspaces/${workspaceId}/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editingContent }),
    })
      .then(() => { setDetail((d) => d?.id === id ? { ...d, content: editingContent } : d); refetchList(); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setSaving(false));
  };

  const deleteDraft = async (id: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Delete this draft? This cannot be undone.');
    if (!confirmed) return;
    setDeleting(id);
    api(`/workspaces/${workspaceId}/drafts/${id}`, { method: 'DELETE' })
      .then(() => { setDetail(null); setSelectedId(null); refetchList(); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setDeleting(null));
  };

  const postNow = async (id: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Approve and publish this draft to LinkedIn immediately?');
    if (!confirmed) return;
    setPostingNow(id);
    api(`/workspaces/${workspaceId}/schedule/now`, {
      method: 'POST',
      body: JSON.stringify({ draftId: id }),
    })
      .then(() => { toast.success('Post queued for immediate publish!'); refetchList(); refetchDetail(); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setPostingNow(null));
  };

  const runBulkApprove = () => {
    const ids = Array.from(selectedIds).filter((id) => items.some((d) => d.id === id && (d.status === 'pending_review' || d.status === 'approved')));
    if (ids.length === 0) { toast.error('No eligible drafts selected.'); return; }
    setBulkAction('approve');
    api(`/workspaces/${workspaceId}/drafts/bulk-approve`, {
      method: 'POST',
      body: JSON.stringify({ draftIds: ids, scheduled_for: new Date(Date.now() + 86400000).toISOString() }),
    })
      .then(() => { setSelectedIds(new Set()); refetchList(); if (selectedId && ids.includes(selectedId)) refetchDetail(); toast.success(`Approved ${ids.length} draft(s).`); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setBulkAction(null));
  };

  const runBulkReject = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.error('Select at least one draft.'); return; }
    setBulkAction('reject');
    api(`/workspaces/${workspaceId}/drafts/bulk-reject`, {
      method: 'POST',
      body: JSON.stringify({ draftIds: ids }),
    })
      .then(() => { setSelectedIds(new Set()); refetchList(); setDetail(null); setSelectedId(null); toast.success(`Rejected ${ids.length} draft(s).`); })
      .catch((e) => toast.error(String(e)))
      .finally(() => setBulkAction(null));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size >= items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((d) => d.id)));
  };

  const applySearch = () => setSearch(searchInput.trim());

  const uploadImage = (draftId: string, file: File) => {
    if (!workspaceId || !file.type.startsWith('image/')) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      api(`/workspaces/${workspaceId}/drafts/${draftId}/images`, {
        method: 'POST',
        body: JSON.stringify({ image: dataUrl }),
      })
        .then(() => { setImageAttached(true); toast.success('Image attached. It will be used when publishing.'); })
        .catch((e) => toast.error(String(e)))
        .finally(() => setUploadingImage(false));
    };
    reader.readAsDataURL(file);
  };

  const charCount = editingContent.length;
  const charOver = charCount > LINKEDIN_CHAR_LIMIT;

  // Sync inspector with selected draft
  useEffect(() => {
    if (!selectedId) {
      setInspectorContent(null);
      return;
    }
    if (detailLoading || !detail) return;
    setInspectorContent(
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge status={detail.status}>{detail.status}</Badge>
          {detail.version != null && <span className="text-xs text-gray-500">v{detail.version}</span>}
          {detail.confidenceScore != null && <span className="text-xs text-gray-500">{(detail.confidenceScore * 100).toFixed(0)}% conf</span>}
          {detail.publishFailedReason && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Previously failed</span>
          )}
          <span className="text-xs text-gray-400 font-mono">{detail.id.slice(0, 8)}</span>
          <span className="text-sm text-gray-500">{detail.postType}</span>
        </div>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[180px]"
          rows={8}
          value={editingContent}
          onChange={(e) => setEditingContent(e.target.value)}
        />
        <p className={`text-xs mt-1 ${charOver ? 'text-red-500' : 'text-gray-400'}`}>
          {charCount} / {LINKEDIN_CHAR_LIMIT} chars
        </p>
        {detail.evidence && (
          <section className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Evidence</h3>
            <a href={detail.evidence.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline break-all">{detail.evidence.title}</a>
            <p className="text-xs text-gray-500 mt-0.5">Source from {formatSourceAge(detail.evidence.fetchedAt)}</p>
          </section>
        )}
        <section className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Image</h3>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploadingImage}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(detail.id, f); e.target.value = ''; }}
            />
            <span>{uploadingImage ? 'Uploading…' : imageAttached ? 'Image attached ✓ — Choose another to replace' : 'Upload image for this post'}</span>
          </label>
          <p className="text-xs text-gray-500 mt-0.5">Used when publishing to LinkedIn. Max 10MB.</p>
        </section>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              api<{ items: { version: number; content: string; createdAt: string | null; current: boolean }[] }>(`/workspaces/${workspaceId}/drafts/${detail.id}/versions`)
                .then((d) => setInspectorContent(
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Version history</h3>
                    {d.items.map((v) => (
                      <div key={v.version} className="border border-gray-100 rounded p-2 text-sm">
                        <span className="font-medium">v{v.version}</span>
                        {v.current && <span className="ml-2 text-xs text-primary">current</span>}
                        <p className="text-gray-600 mt-1 line-clamp-2">{v.content.slice(0, 120)}{v.content.length > 120 ? '…' : ''}</p>
                      </div>
                    ))}
                  </div>
                ))
                .catch(() => toast.error('Could not load versions'));
            }}
          >
            Versions
          </Button>
          <Button onClick={() => saveEdit(detail.id)} disabled={saving || charOver} className="text-xs">Save</Button>
          {(detail.status === 'pending_review' || detail.status === 'draft') && (
            <>
              <Button onClick={() => approve(detail.id)} className="text-xs">Approve</Button>
              <Button onClick={() => postNow(detail.id)} disabled={postingNow === detail.id} className="text-xs bg-green-600 hover:bg-green-700 text-white">{postingNow === detail.id ? '…' : 'Post now'}</Button>
              <Button variant="danger" onClick={() => reject(detail.id)} className="text-xs">Reject</Button>
            </>
          )}
          {detail.status === 'draft' && (
            <Button variant="danger" onClick={() => deleteDraft(detail.id)} disabled={deleting === detail.id} className="text-xs">{deleting === detail.id ? '…' : 'Delete'}</Button>
          )}
        </div>
      </div>
    );
  }, [selectedId, detailLoading, detail, editingContent, saving, postingNow, deleting, charOver, uploadingImage, imageAttached, setInspectorContent]);

  if (!workspaceId) {
    return <EmptyState message="Select a workspace in the sidebar." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search content..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Search drafts"
          />
          <Button variant="secondary" onClick={applySearch}>Search</Button>
        </div>
        {selectedIds.size > 0 && (
          <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" onClick={runBulkApprove} disabled={!!bulkAction}>
            {bulkAction === 'approve' ? 'Approving...' : 'Bulk approve'}
          </Button>
          <Button variant="danger" onClick={runBulkReject} disabled={!!bulkAction}>
            {bulkAction === 'reject' ? 'Rejecting...' : 'Bulk reject'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div className="w-[40%] min-w-[280px] flex flex-col rounded-xl border border-gray-100 bg-white shadow-card overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <input
              type="checkbox"
              checked={items.length > 0 && selectedIds.size >= items.length}
              onChange={toggleSelectAll}
              aria-label="Select all on page"
            />
            <span className="text-xs font-medium text-gray-500">Drafts</span>
            <span className="text-xs text-gray-400 ml-auto">{total} total</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonList rows={8} />
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {total === 0 && !statusFilter && !search
                  ? 'No drafts yet. Run a pipeline or add one from Topics.'
                  : 'No drafts match your filters.'}
              </div>
            ) : (
              <ul className="list-none p-0">
                {items.map((d) => (
                  <li
                    key={d.id}
                    className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50/80 ${selectedId === d.id ? 'bg-primary/5' : ''}`}
                    onClick={() => fetchDetail(d.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(d.id); }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select draft ${d.id.slice(0, 8)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate" title={d.evidence?.title ?? d.content.slice(0, 120)}>
                        {d.evidence?.title || d.content.slice(0, 60) || '—'}
                        {(d.evidence?.title ? '' : d.content.length > 60) ? '…' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge status={d.status}>{d.status}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(d.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {total > PAGE_SIZE && (
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-gray-100">
              <Button
                variant="ghost"
                className="py-1.5 px-2 text-xs"
                disabled={offset === 0 || loading}
                onClick={() => { const o = Math.max(0, offset - PAGE_SIZE); setOffset(o); fetchList(o, false); }}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <Button
                variant="ghost"
                className="py-1.5 px-2 text-xs"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => { const o = offset + PAGE_SIZE; setOffset(o); fetchList(o, false); }}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-center rounded-xl border border-gray-100 bg-white/50 text-sm text-gray-500">
          {selectedId ? (detailLoading ? 'Loading…' : 'Draft detail in Inspector →') : 'Select a draft to view in the Inspector'}
        </div>
      </div>
    </div>
  );
}
