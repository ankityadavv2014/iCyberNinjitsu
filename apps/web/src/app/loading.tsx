export default function Loading() {
  return (
    <div className="astra-loading min-h-screen bg-slate-950 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center py-24">
      <div className="relative z-10 flex flex-col items-center">
        <p className="text-xl font-semibold text-white tracking-tight mb-6">Astra</p>
        <div className="astra-loading-spinner h-12 w-12 rounded-xl border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="astra-loading-text mt-5 text-sm font-medium text-slate-400">Loading</p>
      </div>
    </div>
  );
}
