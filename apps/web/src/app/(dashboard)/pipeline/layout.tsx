'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/pipeline/topics', label: 'Topics' },
  { href: '/pipeline/sources', label: 'Sources' },
  { href: '/pipeline/drafts', label: 'Drafts' },
];

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Pipeline</h1>
        <nav className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  active ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
