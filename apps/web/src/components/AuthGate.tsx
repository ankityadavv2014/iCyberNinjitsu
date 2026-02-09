'use client';

import { useState, useEffect, ReactNode } from 'react';
import { setToken } from '@/lib/api';
import { Card, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';

const isDev = process.env.NODE_ENV === 'development';
const DEV_TOKEN = '00000000-0000-0000-0000-000000000001';

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'missing' | 'invalid' | 'ok'>('checking');
  // Only pre-fill the dev token in development mode
  const [tokenInput, setTokenInput] = useState(isDev ? DEV_TOKEN : '');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('astra_token') : null;
    if (!stored) {
      setStatus('missing');
      return;
    }
    // Verify token by calling /workspaces (with timeout so we never hang on "Checking authentication...")
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    fetch(`${API_URL}/workspaces`, {
      headers: { Authorization: `Bearer ${stored}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) setStatus('ok');
        else setStatus('invalid');
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setStatus('invalid');
      });
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const handleSave = () => {
    if (!tokenInput.trim()) {
      setError('Token is required');
      return;
    }
    setToken(tokenInput.trim());
    window.location.reload();
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'missing' || status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {status === 'missing' ? 'Welcome to Astra' : 'Session expired or API unreachable'}
            </CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-600 mb-4">
            {status === 'missing'
              ? 'Enter your API token to access the dashboard.'
              : 'Your token is invalid or the API is not running. Start the API (e.g. pnpm dev:api from repo root) and ensure the DB is up, then save the token again.'}
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="auth-token">API Token (User UUID)</Label>
              <Input
                id="auth-token"
                type="text"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setError(''); }}
                placeholder="Enter your user UUID"
                className="w-full mt-1 font-mono text-xs"
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
            <Button onClick={handleSave} className="w-full">
              Save and continue
            </Button>
            {isDev && (
              <p className="text-xs text-gray-400 text-center mt-2">
                <span className="text-xs font-medium text-amber-600 bg-amber-50 rounded px-1 py-0.5">Dev</span>{' '}
                From repo root run <code className="bg-gray-100 px-1 rounded text-xs">pnpm dev:api</code> (and have
                PostgreSQL + Redis running). API: <code className="bg-gray-100 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}</code>. Dev token is pre-filled above.
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
