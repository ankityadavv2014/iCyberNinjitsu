'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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

  const fetchTopics = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api<{ items: Topic[] }>(`/workspaces/${workspaceId}/topics`),
      api<{ items: TopicBundle[] }>(`/workspaces/${workspaceId}/topic-bundles`),
    ])
      .then(([topicsRes, bundlesRes]) => {
        setTopics(topicsRes.items ?? []);
        setBundles(bundlesRes.items ?? []);
      })
      .catch(() => { setTopics([]); setBundles([]); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    fetchTopics();
  }, [workspaceId, fetchTopics]);

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

  return (
    <>
      {bundles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Viewpoint bundles</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-500 mb-3">
            Group topics by audience (CEO, CISO, Engineer, etc.).
          </p>
          <div className="flex flex-wrap gap-2">
            {bundles.map((b) => (
              <span key={b.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {b.name}
                {b.description && <span className="ml-1 text-gray-500 text-xs">— {b.description}</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add a topic</CardTitle>
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
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick setup</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-4">
          Pre-populate with cybersecurity keywords for the ranking engine.
        </p>
        <Button onClick={seedCyberTopics} disabled={seeding} variant="secondary">
          {seeding ? 'Adding...' : 'Add cybersecurity topics'}
        </Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <CardTitle>Current topics ({topics.length})</CardTitle>
        </div>
        {loading ? (
          <div className="p-6"><SkeletonList rows={3} /></div>
        ) : topics.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No topics configured." actionLabel="Add cybersecurity topics" onAction={seedCyberTopics} />
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
              {topics.map((t) => (
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
  );
}
