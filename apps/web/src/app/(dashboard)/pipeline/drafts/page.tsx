'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type Draft = { id: string; content: string; status: string; postType: string; publishFailedReason?: string };

const LINKEDIN_CHAR_LIMIT = 3000;

export default function PipelineDraftsPage() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [postingNow, setPostingNow] = useState<string | null>(null);

  const fetchDrafts = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    api<{ items: Draft[] }>(`/workspaces/${workspaceId}/drafts`)
      .then((d) => setDrafts(d.items ?? []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetchDrafts();
  }, [workspaceId, fetchDrafts]);

  const approve = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/drafts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_for: new Date(Date.now() + 86400000).toISOString() }),
    })
      .then(() => setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d))))
      .catch((e) => toast.error(String(e)));
  };

  const reject = (id: string) => {
    if (!workspaceId) return;
    api(`/workspaces/${workspaceId}/drafts/${id}/reject`, { method: 'POST' })
      .then(() => setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d))))
      .catch((e) => toast.error(String(e)));
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
    if (!workspaceId) return;
    setSaving(true);
    api(`/workspaces/${workspaceId}/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editContent }),
    })
      .then(() => {
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, content: editContent } : d)));
        setEditingId(null);
        setEditContent('');
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setSaving(false));
  };

  const deleteDraft = async (id: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Delete this draft? This cannot be undone.');
    if (!confirmed) return;
    setDeleting(id);
    api(`/workspaces/${workspaceId}/drafts/${id}`, { method: 'DELETE' })
      .then(() => setDrafts((prev) => prev.filter((d) => d.id !== id)))
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
      .then(() => {
        toast.success('Post queued for immediate publish!');
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d)));
      })
      .catch((e) => toast.error(String(e)))
      .finally(() => setPostingNow(null));
  };

  const charCount = editContent.length;
  const charWarning = charCount > LINKEDIN_CHAR_LIMIT * 0.9;
  const charOver = charCount > LINKEDIN_CHAR_LIMIT;

  if (!workspaceId) {
    return <EmptyState message="Select a workspace in the sidebar." />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <EmptyState
        message="No drafts yet. Run a pipeline or create one manually."
        actionLabel="Go to Pipeline config"
        onAction={() => { window.location.href = '/pipelines'; }}
      />
    );
  }

  return (
    <ul className="space-y-4 list-none p-0">
      {drafts.map((d) => (
        <li key={d.id}>
          <Card>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge status={d.status}>{d.status}</Badge>
                {d.publishFailedReason && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Previously failed ({d.publishFailedReason}) — edit & re-approve
                  </span>
                )}
                <span className="text-xs text-gray-400 font-mono">{d.id.slice(0, 8)}</span>
              </div>
              <span className="text-sm text-gray-500">{d.postType}</span>
            </div>

            {editingId === d.id ? (
              <div className="space-y-3">
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-sans leading-relaxed"
                  rows={10}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${charOver ? 'text-red-500' : charWarning ? 'text-amber-500' : 'text-gray-400'}`}>
                    {charCount.toLocaleString()}/{LINKEDIN_CHAR_LIMIT.toLocaleString()} characters
                    {charOver && ' (over limit)'}
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(d.id)} disabled={saving || charOver}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap font-sans mb-4 leading-relaxed">
                {d.content}
              </div>
            )}

            {editingId !== d.id && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-50">
                {(d.status === 'pending_review' || d.status === 'draft') && (
                  <Button variant="secondary" onClick={() => startEdit(d)} className="text-xs">Edit</Button>
                )}
                {d.status === 'pending_review' && (
                  <>
                    <Button onClick={() => approve(d.id)} className="text-xs">Approve</Button>
                    <Button onClick={() => postNow(d.id)} disabled={postingNow === d.id} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                      {postingNow === d.id ? 'Publishing...' : 'Post Now'}
                    </Button>
                    <Button variant="danger" onClick={() => reject(d.id)} className="text-xs">Reject</Button>
                  </>
                )}
                {d.status === 'draft' && (
                  <Button variant="danger" onClick={() => deleteDraft(d.id)} disabled={deleting === d.id} className="text-xs ml-auto">
                    {deleting === d.id ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
                <span className="text-xs text-gray-400 ml-auto">{d.content.length.toLocaleString()} chars</span>
              </div>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
