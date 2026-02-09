'use client';

import { Button } from '@/components/Button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-8 font-sans"
      style={{ minHeight: '100vh', padding: '2rem', textAlign: 'center' }}
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ marginBottom: '0.5rem' }}>
        Something went wrong
      </h2>
      <p className="text-sm text-gray-600 mb-6 max-w-md text-center" style={{ marginBottom: '1.5rem', maxWidth: '28rem' }}>
        {error.message}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
