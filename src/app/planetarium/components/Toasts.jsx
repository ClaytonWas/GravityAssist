'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Tone is carried by a single hairline rule, not a coloured panel.
const TONE_RULES = {
  info: 'bg-accent',
  success: 'bg-positive',
  warning: 'bg-caution'
};

const MAX_VISIBLE = 3;

/**
 * Lightweight toast queue. Returns { toasts, push, dismiss }.
 * push(message, { tone, detail, duration }) -> id
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
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[600] flex flex-col items-center gap-2 pointer-events-none w-[min(21rem,calc(100vw-2rem))]"
      role="status"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <button
          key={toast.id}
          onClick={() => onDismiss?.(toast.id)}
          className={cn(
            'pointer-events-auto w-full text-left flex items-stretch gap-3 rounded-md border border-line',
            'bg-surface/95 backdrop-blur-md py-2.5 pr-3.5 pl-0 shadow-lg animate-slideDownFade',
            'hover:border-line-strong transition-colors overflow-hidden'
          )}
        >
          <span className={cn('w-0.5 flex-shrink-0 rounded-full', TONE_RULES[toast.tone] || TONE_RULES.info)} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-fg truncate">{toast.message}</span>
            {toast.detail && (
              <span className="block text-xs text-muted mt-0.5">{toast.detail}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
