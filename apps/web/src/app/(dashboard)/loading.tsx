import { Skeleton } from '@/components/Skeleton';

function PanelSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card min-h-[260px] max-h-[320px] flex flex-col">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-3 w-24 mb-4" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}
