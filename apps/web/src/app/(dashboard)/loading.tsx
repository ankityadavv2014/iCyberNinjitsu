export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-24 animate-fade-in bg-gray-50">
      <div className="flex flex-col items-center">
        <p className="text-lg font-semibold text-gray-900 tracking-tight mb-6">Astra</p>
        <div className="h-12 w-12 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="mt-5 text-sm font-medium text-gray-600">Loading</p>
        <div className="mt-3 h-1 w-28 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-primary/30 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
