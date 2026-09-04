'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Cursor-following label for the body under the pointer. Purely informational,
 * so it never intercepts pointer events.
 */
export function HoverLabel({ hovered }) {
  if (!hovered) return null;
  return (
    <div
      className="fixed z-[550] pointer-events-none select-none"
      style={{ left: hovered.x, top: hovered.y, transform: 'translate(14px, -50%)' }}
    >
      <div className="flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 shadow-xl">
        <span className="text-xs font-semibold text-white whitespace-nowrap">{hovered.name}</span>
        {hovered.subtitle && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap">{hovered.subtitle}</span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-slate-500 pl-0.5 whitespace-nowrap">click for details</div>
    </div>
  );
}

/**
 * Owns the hover state so pointer movement re-renders only this subtree instead
 * of the whole scene. The scene publishes updates through `apiRef.current(...)`.
 */
export function HoverLabelHost({ apiRef }) {
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    apiRef.current = setHovered;
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  return <HoverLabel hovered={hovered} />;
}

/** Badge shown while the camera is locked onto a body. */
export function FocusBadge({ targetName, onRelease }) {
  if (!targetName) return null;
  return (
    <div className="fixed bottom-[4.75rem] sm:bottom-[5.5rem] left-1/2 -translate-x-1/2 z-[190] pointer-events-none">
      <div className="flex items-center gap-2 rounded-full border border-blue-500/40 bg-slate-900/85 backdrop-blur-md pl-3 pr-1.5 py-1 shadow-xl pointer-events-auto">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <span className="text-xs text-slate-300 whitespace-nowrap">
          Following <span className="font-semibold text-white">{targetName}</span>
        </span>
        <button
          onClick={onRelease}
          aria-label={`Stop following ${targetName}`}
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0',
            'text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
