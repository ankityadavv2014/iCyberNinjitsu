import { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({
  message,
  actionLabel,
  onAction,
  className = '',
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 px-6 text-center ${className}`}
    >
      <p className="text-sm text-gray-500">{message}</p>
      {actionLabel && onAction && (
        <Button variant="primary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
