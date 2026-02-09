import { ReactNode } from 'react';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
  queued: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function Badge({
  children,
  status,
  className = '',
}: {
  children: ReactNode;
  status?: string;
  className?: string;
}) {
  const style = status ? statusStyles[status] ?? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style} ${className}`}
    >
      {children}
    </span>
  );
}
