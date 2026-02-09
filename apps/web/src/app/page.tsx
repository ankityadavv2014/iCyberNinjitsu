'use client';

import { useRouter } from 'next/navigation';

const isDev = process.env.NODE_ENV === 'development';
const DEV_TOKEN = '00000000-0000-0000-0000-000000000001';

export default function Home() {
  const router = useRouter();

  const goToDashboard = () => {
    if (isDev && typeof window !== 'undefined') {
      const stored = localStorage.getItem('astra_token');
      if (!stored) {
        localStorage.setItem('astra_token', DEV_TOKEN);
      }
    }
    router.push('/dashboard');
  };

  return (
    <main className="astra-landing min-h-screen bg-slate-950 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="astra-landing-grid absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" aria-hidden />
      <div className="astra-landing-inner relative z-10 flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-3 drop-shadow-sm">
          Astra
        </h1>
        <p className="astra-landing-tagline text-lg md:text-xl text-slate-300 mb-10 font-medium">
          LinkedIn Social Media Automation
        </p>
        <button type="button" onClick={goToDashboard} className="astra-cta">
          Go to Dashboard
        </button>
        {isDev && (
          <p className="astra-dev text-sm text-slate-400 text-center">
            <span className="astra-dev-badge">Dev only</span>
            <br />
            <span className="text-slate-500">
              The button above sets the API token for you if missing. Ensure the API is running at{' '}
              <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</code>
            </span>
          </p>
        )}
      </div>
    </main>
  );
}
