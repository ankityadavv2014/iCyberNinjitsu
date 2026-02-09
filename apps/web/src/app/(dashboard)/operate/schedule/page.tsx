'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardHeader, CardTitle } from '@/components/Card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/components/Table';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type Job = { id: string; approvedPostId: string; status: string; jobId: string | null };
type ApprovedPost = { id: string; draftPostId: string; approvedAt: string };

type AutoScheduleSettings = {
  enabled: boolean;
  postsPerDay: number;
  preferredTimes: string[];
  timezone: string;
  daysOfWeek: number[];
};

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulePage() {
  const { workspaceId } = useWorkspace();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<ApprovedPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postingNow, setPostingNow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-schedule state
  const [autoSettings, setAutoSettings] = useState<AutoScheduleSettings>({
    enabled: false,
    postsPerDay: 1,
    preferredTimes: ['09:00'],
    timezone: 'America/New_York',
    daysOfWeek: [1, 2, 3, 4, 5],
  });
  const [autoLoading, setAutoLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const refetch = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api<{ items: Job[] }>(`/workspaces/${workspaceId}/schedule`).then((d) => d.items ?? []).catch(() => [] as Job[]),
      api<{ items: ApprovedPost[] }>(`/workspaces/${workspaceId}/approved-posts`).then((d) => d.items ?? []).catch(() => [] as ApprovedPost[]),
    ]).then(([j, ap]) => {
      setJobs(j);
      setApprovedPosts(ap);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  const fetchAutoSettings = useCallback(() => {
    if (!workspaceId) return;
    setAutoLoading(true);
    api<AutoScheduleSettings>(`/workspaces/${workspaceId}/auto-schedule`)
      .then((d) => {
        setAutoSettings({
          enabled: d.enabled ?? false,
          postsPerDay: d.postsPerDay ?? 1,
          preferredTimes: d.preferredTimes ?? ['09:00'],
          timezone: d.timezone ?? 'America/New_York',
          daysOfWeek: d.daysOfWeek ?? [1, 2, 3, 4, 5],
        });
      })
      .catch(() => {})
      .finally(() => setAutoLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); setAutoLoading(false); return; }
    refetch();
    fetchAutoSettings();
  }, [workspaceId, refetch, fetchAutoSettings]);

  const saveAutoSettings = () => {
    if (!workspaceId) return;
    setAutoSaving(true);
    setAutoSaved(false);
    api<AutoScheduleSettings>(`/workspaces/${workspaceId}/auto-schedule`, {
      method: 'PUT',
      body: JSON.stringify({
        enabled: autoSettings.enabled,
        posts_per_day: autoSettings.postsPerDay,
        preferred_times: autoSettings.preferredTimes,
        timezone: autoSettings.timezone,
        days_of_week: autoSettings.daysOfWeek,
      }),
    })
      .then((d) => {
        setAutoSettings({
          enabled: d.enabled ?? false,
          postsPerDay: d.postsPerDay ?? 1,
          preferredTimes: d.preferredTimes ?? ['09:00'],
          timezone: d.timezone ?? 'America/New_York',
          daysOfWeek: d.daysOfWeek ?? [1, 2, 3, 4, 5],
        });
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 3000);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setAutoSaving(false));
  };

  const toggleDay = (day: number) => {
    setAutoSettings((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  const addTimeSlot = () => {
    setAutoSettings((prev) => ({
      ...prev,
      preferredTimes: [...prev.preferredTimes, '12:00'],
    }));
  };

  const removeTimeSlot = (idx: number) => {
    setAutoSettings((prev) => ({
      ...prev,
      preferredTimes: prev.preferredTimes.filter((_, i) => i !== idx),
    }));
  };

  const updateTimeSlot = (idx: number, value: string) => {
    setAutoSettings((prev) => ({
      ...prev,
      preferredTimes: prev.preferredTimes.map((t, i) => (i === idx ? value : t)),
    }));
  };

  const postNow = async (approvedPostId: string) => {
    if (!workspaceId) return;
    const confirmed = await toast.confirm('Publish this post to LinkedIn immediately?');
    if (!confirmed) return;
    setPostingNow(approvedPostId);
    api(`/workspaces/${workspaceId}/schedule/now`, {
      method: 'POST',
      body: JSON.stringify({ approvedPostId }),
    })
      .then(() => {
        toast.success('Post queued for immediate publish!');
        refetch();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setPostingNow(null));
  };

  const submitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selectedPostId || !scheduledFor) return;
    setSubmitting(true);
    api<{ id: string }>(`/workspaces/${workspaceId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ approved_post_id: selectedPostId, scheduled_for: new Date(scheduledFor).toISOString() }),
    })
      .then(() => {
        setSelectedPostId('');
        setScheduledFor('');
        refetch();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setSubmitting(false));
  };

  // Build status line
  const statusLine = autoSettings.enabled
    ? `Auto-posting enabled: ${autoSettings.postsPerDay} post${autoSettings.postsPerDay > 1 ? 's' : ''}/day at ${autoSettings.preferredTimes.join(', ')} ${autoSettings.timezone.split('/').pop()?.replace('_', ' ')} ${autoSettings.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')}`
    : 'Auto-posting is disabled';

  return (
    <>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Schedule</h1>
      {!workspaceId ? (
        <EmptyState message="Select a workspace in the sidebar." />
      ) : loading && autoLoading ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          {/* Auto-post settings card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Auto-post settings</CardTitle>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${autoSettings.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {autoSettings.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardHeader>

            <p className="text-sm text-gray-500 mb-6">{statusLine}</p>

            {autoLoading ? (
              <SkeletonList rows={3} />
            ) : (
              <div className="space-y-5">
                {/* Enable toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSettings.enabled}
                    onClick={() => setAutoSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${autoSettings.enabled ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSettings.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                  <Label>Enable auto-posting</Label>
                </div>

                {/* Posts per day */}
                <div className="max-w-xs">
                  <Label htmlFor="ppd">Posts per day</Label>
                  <Input
                    id="ppd"
                    type="number"
                    min={1}
                    max={10}
                    value={autoSettings.postsPerDay}
                    onChange={(e) =>
                      setAutoSettings((prev) => ({
                        ...prev,
                        postsPerDay: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="w-24 mt-1"
                  />
                </div>

                {/* Preferred times */}
                <div>
                  <Label>Preferred times</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {autoSettings.preferredTimes.map((t, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Input
                          type="time"
                          value={t}
                          onChange={(e) => updateTimeSlot(i, e.target.value)}
                          className="w-28"
                        />
                        {autoSettings.preferredTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(i)}
                            className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                            aria-label="Remove time slot"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" type="button" onClick={addTimeSlot} className="text-sm">
                      + Add time
                    </Button>
                  </div>
                </div>

                {/* Days of week */}
                <div>
                  <Label>Days of week</Label>
                  <div className="flex gap-2 mt-1">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                          autoSettings.daysOfWeek.includes(idx)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
                <div className="max-w-xs">
                  <Label htmlFor="tz">Timezone</Label>
                  <Select
                    id="tz"
                    value={autoSettings.timezone}
                    onChange={(e) => setAutoSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                    className="w-full mt-1"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Save */}
                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={saveAutoSettings} disabled={autoSaving}>
                    {autoSaving ? 'Saving...' : 'Save auto-post settings'}
                  </Button>
                  {autoSaved && (
                    <span className="text-sm text-green-600 font-medium">Saved!</span>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Manual schedule card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Schedule a post</CardTitle>
            </CardHeader>
            <form onSubmit={submitSchedule} className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="approved-post">Approved post</Label>
                <Select
                  id="approved-post"
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  required
                  className="w-full mt-1"
                >
                  <option value="">Select post</option>
                  {approvedPosts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id.slice(0, 8)} (approved {new Date(p.approvedAt).toLocaleDateString()})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="scheduled-for">Scheduled for</Label>
                <Input
                  id="scheduled-for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                  className="w-full mt-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting || approvedPosts.length === 0}>
                  {submitting ? 'Scheduling...' : 'Schedule'}
                </Button>
                {selectedPostId && (
                  <Button
                    type="button"
                    onClick={() => postNow(selectedPostId)}
                    disabled={postingNow === selectedPostId}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {postingNow === selectedPostId ? 'Publishing...' : 'Post Now'}
                  </Button>
                )}
              </div>
            </form>
            {approvedPosts.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Approve a draft first to see posts here.</p>
            )}
          </Card>

          {/* Scheduled jobs table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-6 pb-0">
              <CardTitle>Scheduled jobs</CardTitle>
            </div>
            {jobs.length === 0 ? (
              <div className="p-6">
                <EmptyState message="Nothing scheduled. Approve a draft and schedule it." />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableHeader>ID</TableHeader>
                  <TableHeader>Approved Post</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Job ID</TableHeader>
                </TableHead>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs">{j.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs">{j.approvedPostId.slice(0, 8)}</TableCell>
                      <TableCell><Badge status={j.status}>{j.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{j.jobId ?? '-'}</TableCell>
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
