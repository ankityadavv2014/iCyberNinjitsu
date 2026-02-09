import { ICNLogo } from '@/components/AstraLogo';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #0f172a 50%, #020617 100%)',
          backgroundSize: '200% 200%',
          animation: 'astra-gradient-shift 8s ease infinite',
        }}
      />
      {/* Blur orbs */}
      <div
        className="absolute w-[320px] h-[320px] rounded-full bg-blue-500/20 blur-[80px]"
        style={{ top: '20%', left: '10%', animation: 'astra-float 4s ease-in-out infinite' }}
        aria-hidden
      />
      <div
        className="absolute w-[280px] h-[280px] rounded-full bg-indigo-500/25 blur-[70px]"
        style={{ bottom: '20%', right: '10%', animation: 'astra-float 5s ease-in-out infinite 1s' }}
        aria-hidden
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
        aria-hidden
      />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center" style={{ animation: 'astra-fade-in-up 0.5s ease-out' }}>
        <div className="mb-6">
          <ICNLogo size={80} animated />
        </div>
        <p className="text-2xl font-semibold text-white tracking-tight mb-2">iCyberNinjitsu</p>
        <p className="text-sm font-medium text-slate-400 animate-pulse">Loading</p>
      </div>
    </div>
  );
}
