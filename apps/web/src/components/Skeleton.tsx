export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
