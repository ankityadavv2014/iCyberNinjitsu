'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Select } from './Select';

const pipelineNav = [
  { href: '/pipeline/topics', label: 'Topics' },
  { href: '/pipeline/sources', label: 'Sources' },
  { href: '/pipeline/drafts', label: 'Drafts' },
];

const operateNav = [
  { href: '/operate/schedule', label: 'Schedule' },
  { href: '/operate/logs', label: 'Logs' },
  { href: '/operate/history', label: 'History' },
  { href: '/operate/settings', label: 'Settings' },
];

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {label}
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

  return (
    <div className="flex min-h-screen bg-gray-50/80 bg-grid-pattern bg-grid">
      <aside className="w-60 flex-shrink-0 border-r border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link
            href="/dashboard"
            className="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-900 transition-opacity hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
              A
            </span>
            Astra
          </Link>
          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Workspace</label>
            <Select
              value={workspaces.some((w) => w.id === workspaceId) ? workspaceId : ''}
              onChange={(e) => onWorkspaceChange(e.target.value)}
              className="w-full rounded-lg border-gray-200 bg-gray-50/80 text-sm"
            >
              <option value="">Select</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
          <nav className="flex flex-1 flex-col overflow-y-auto">
            <Link
              href="/dashboard"
              className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
            <NavSection title="Pipeline" items={pipelineNav} pathname={pathname} />
            <NavSection title="Publish & monitor" items={operateNav} pathname={pathname} />
          </nav>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
