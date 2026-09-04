'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100'
};

const MAX_VISIBLE = 3;

/**
 * Lightweight toast queue. Returns { toasts, push, dismiss }.
 * push(message, { tone, icon, detail, duration }) -> id
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((message, options = {}) => {
    const id = ++nextIdRef.current;
    const toast = {
      id,
      message,
      tone: options.tone || 'info',
      icon: options.icon,
      detail: options.detail
    };
    setToasts(prev => [...prev, toast].slice(-MAX_VISIBLE));
    const handle = setTimeout(() => dismiss(id), options.duration ?? 3500);
    timersRef.current.set(id, handle);
    return id;
  }, [dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(handle => clearTimeout(handle));
      timers.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[600] flex flex-col items-center gap-2 pointer-events-none w-[min(22rem,calc(100vw-2rem))]"
      role="status"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <button
          key={toast.id}
          onClick={() => onDismiss?.(toast.id)}
          className={cn(
            'pointer-events-auto w-full text-left flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5',
            'bg-slate-900/90 backdrop-blur-xl shadow-2xl animate-slideDownFade',
            'hover:bg-slate-800/90 transition-colors',
            TONE_STYLES[toast.tone] || TONE_STYLES.info
          )}
        >
          {toast.icon && <span className="text-base leading-5 flex-shrink-0">{toast.icon}</span>}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white truncate">{toast.message}</span>
            {toast.detail && (
              <span className="block text-xs text-slate-400 mt-0.5">{toast.detail}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
