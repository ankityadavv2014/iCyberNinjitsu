'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Select } from './Select';
import { api } from '@/lib/api';
import { useInspector } from '@/contexts/InspectorContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ICNLogo, ICNLogoCompact } from './AstraLogo';

type PipelineStatus = {
  lastIngestAt: string | null;
  queuePending: number;
  successRate: number | null;
};

function formatTimeAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 60) return m <= 0 ? 'just now' : `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusStrip({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const fetchStatus = useCallback(() => {
    api<PipelineStatus>(`/workspaces/${workspaceId}/pipeline-status`)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [workspaceId]);
  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 45000);
    return () => clearInterval(t);
  }, [fetchStatus]);
  if (!status) return null;
  return (
    <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 px-6 py-2 text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-4">
      <span>Last ingest: {formatTimeAgo(status.lastIngestAt)}</span>
      <span>Queue: {status.queuePending}</span>
      {status.successRate != null && <span>Publish success: {status.successRate}%</span>}
    </div>
  );
}

/* Icons for collapsed sidebar (24x24 outline) */
const IconDiscovery = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);
const IconSources = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
);
const IconDrafts = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
const IconSchedule = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const IconLogs = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
);
const IconHistory = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const IconSettings = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const IconDashboard = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);

const pipelineNav = [
  { href: '/pipeline/topics', label: 'Discovery', icon: IconDiscovery },
  { href: '/pipeline/sources', label: 'Sources', icon: IconSources },
  { href: '/pipeline/drafts', label: 'Drafts', icon: IconDrafts },
];

const operateNav = [
  { href: '/operate/schedule', label: 'Schedule', icon: IconSchedule },
  { href: '/operate/logs', label: 'Logs', icon: IconLogs },
  { href: '/operate/history', label: 'History', icon: IconHistory },
  { href: '/operate/settings', label: 'Settings', icon: IconSettings },
];

function NavSection({
  title,
  items,
  pathname,
  collapsed,
}: {
  title: string;
  items: { href: string; label: string; icon: React.ComponentType }[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all ${collapsed ? 'justify-center px-2' : ''} ${
                active
                  ? 'icn-nav-active bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              style={{ transitionDuration: 'var(--icn-dur-micro)', transitionTimingFunction: 'var(--icn-ease)' }}
            >
              {collapsed ? <Icon /> : <><Icon />{label}</>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  workspaceId,
  workspaces,
  onWorkspaceChange,
}: {
  children: ReactNode;
  workspaceId: string;
  workspaces: { id: string; name: string }[];
  onWorkspaceChange: (id: string) => void;
}) {
  const pathname = usePathname();
  const { content: inspectorContent, setContent: setInspectorContent } = useInspector();
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50/80 dark:bg-gray-900 bg-grid-pattern dark:bg-none bg-grid">
      <aside className={`icn-sidebar ${sidebarCollapsed ? 'w-16' : 'w-60'} flex-shrink-0 border-r border-gray-200/80 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 shadow-sm backdrop-blur-sm`}>
        <div className="sticky top-0 flex h-screen flex-col p-4">
          {/* Top row: logo + sidebar chrome */}
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 mb-4">
              <Link
                href="/dashboard"
                className="flex items-center justify-center shrink-0"
                title="iCyberNinjitsu"
              >
                <ICNLogoCompact size={22} />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Expand sidebar"
              >
                <svg className="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-900 dark:text-white transition-opacity hover:opacity-90 shrink-0 min-w-0"
              >
                <ICNLogo size={22} />
                <span className="truncate text-sm font-semibold tracking-tight font-tech">iCyberNinjitsu</span>
              </Link>
              <div className="flex-1 min-w-0" />
              <div className="flex items-center gap-1 shrink-0 rounded-full bg-gray-100/60 dark:bg-gray-800/80 px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  aria-label="Collapse sidebar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-300">Workspace</label>
              <Select
                value={workspaces.some((w) => w.id === workspaceId) ? workspaceId : ''}
                onChange={(e) => onWorkspaceChange(e.target.value)}
                className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800 text-sm dark:text-gray-200"
              >
                <option value="">Select</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <nav className="flex flex-1 flex-col overflow-y-auto">
            <Link
              href="/dashboard"
              title={sidebarCollapsed ? 'Home' : undefined}
              className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${sidebarCollapsed ? 'justify-center px-2' : ''} ${
                pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {sidebarCollapsed ? <IconDashboard /> : (<><IconDashboard /> Home</>)}
            </Link>
            <NavSection title="Pipeline" items={pipelineNav} pathname={pathname} collapsed={sidebarCollapsed} />
            <NavSection title="Publish & monitor" items={operateNav} pathname={pathname} collapsed={sidebarCollapsed} />
          </nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        {workspaceId ? <StatusStrip workspaceId={workspaceId} /> : null}
        <div className="flex-1 p-8 dark:bg-gray-900/50">{children}</div>
      </main>
      {inspectorContent != null && (
        <aside className="icn-drawer-enter w-[360px] flex-shrink-0 border-l border-gray-200/80 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 flex flex-col overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Inspector</span>
            <button
              type="button"
              onClick={() => setInspectorContent(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
              aria-label="Close inspector"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{inspectorContent}</div>
        </aside>
      )}
    </div>
  );
}
