'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PipelineSourcesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/pipeline/topics?tab=sources');
  }, [router]);
  return (
    <div className="text-sm text-gray-500 dark:text-gray-400 p-4">
      Redirecting to Discovery → Sources…
    </div>
  );
}
