'use client';

import { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  /** Returns a promise that resolves to true (OK) or false (Cancel). */
  confirm: (msg: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  // Confirm dialog state
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const confirmResolve = useRef<((value: boolean) => void) | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), DISMISS_MS);
  }, [dismiss]);

  const success = useCallback((msg: string) => push('success', msg), [push]);
  const error = useCallback((msg: string) => push('error', msg), [push]);
  const info = useCallback((msg: string) => push('info', msg), [push]);

  const confirm = useCallback((msg: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolve.current = resolve;
      setConfirmMsg(msg);
    });
  }, []);

  const handleConfirm = (accepted: boolean) => {
    confirmResolve.current?.(accepted);
    confirmResolve.current = null;
    setConfirmMsg(null);
  };

  // Escape key to dismiss confirm dialog
  useEffect(() => {
    if (confirmMsg === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleConfirm(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirmMsg]);

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-gray-800 text-white',
  };

  return (
    <ToastContext.Provider value={{ success, error, info, confirm }}>
      {children}

      {/* Toast stack */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto cursor-pointer rounded-lg px-4 py-3 text-sm shadow-lg transition-all animate-slide-in ${typeStyles[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmMsg !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6 space-y-4 animate-fade-in">
            <p className="text-sm text-gray-700">{confirmMsg}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
