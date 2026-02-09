'use client';

import Link from 'next/link';
import { Button } from '@/components/Button';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 font-sans bg-gray-50">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard error</h2>
      <p className="text-sm text-gray-600 mb-6 max-w-md text-center">{error.message}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/">
          <Button variant="secondary">Home</Button>
        </Link>
      </div>
    </div>
  );
}
