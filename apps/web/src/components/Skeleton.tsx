/**
 * Skeleton loaders — show immediately when content is loading.
 * "Trust builder" — better than blank panels.
 *
 * Exports both new (ICN motion system) and legacy names for backward compat.
 */

/* ── Legacy Skeleton (used throughout the dashboard) ── */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`icn-skeleton ${className}`} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="icn-skeleton h-4 rounded" style={{ width: `${85 - (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm min-h-[200px] flex flex-col gap-3">
      <div className="icn-skeleton h-5 w-32 rounded" />
      <div className="icn-skeleton h-3 w-24 rounded" />
      <div className="flex-1 space-y-2 pt-2">
        <div className="icn-skeleton h-4 w-full rounded" />
        <div className="icn-skeleton h-4 w-full rounded" />
        <div className="icn-skeleton h-4 w-4/5 rounded" />
      </div>
    </div>
  );
}

/* ── ICN Motion System skeleton variants ── */

export function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="icn-skeleton"
      style={{ width, height, borderRadius: height / 2 }}
    />
  );
}

export function SkeletonBlock({ width = '100%', height = 80 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="icn-skeleton"
      style={{ width, height }}
    />
  );
}

/** Table skeleton — n rows of alternating-width lines */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        <SkeletonLine width="30%" height={12} />
        <SkeletonLine width="20%" height={12} />
        <SkeletonLine width="25%" height={12} />
        <SkeletonLine width="15%" height={12} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonLine width={`${25 + (i % 3) * 10}%`} height={10} />
          <SkeletonLine width="18%" height={10} />
          <SkeletonLine width={`${20 + (i % 2) * 8}%`} height={10} />
          <SkeletonLine width="12%" height={10} />
        </div>
      ))}
    </div>
  );
}

/** Inspector panel skeleton */
export function SkeletonInspector() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonLine width="60%" height={16} />
      <SkeletonLine width="40%" height={12} />
      <div className="pt-2 space-y-2">
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="95%" />
        <SkeletonLine width="70%" />
      </div>
      <div className="pt-4">
        <SkeletonBlock height={120} />
      </div>
      <div className="pt-2 flex gap-2">
        <SkeletonLine width={80} height={32} />
        <SkeletonLine width={80} height={32} />
      </div>
    </div>
  );
}

// Default export for compatibility if any file imports Skeleton as default.
export default Skeleton;
