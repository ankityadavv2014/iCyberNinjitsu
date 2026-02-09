import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="astra-landing min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="astra-landing-inner">
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-slate-300 mb-8">This page doesn&apos;t exist.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="astra-cta inline-block text-center no-underline"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-primary text-primary bg-transparent text-white font-semibold hover:bg-primary/20 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
