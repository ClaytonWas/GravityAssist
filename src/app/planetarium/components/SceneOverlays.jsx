'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CloseIcon } from './icons';

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
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface/95 backdrop-blur-md px-2.5 py-1.5 shadow-lg">
        <span className="text-xs font-medium text-fg whitespace-nowrap">{hovered.name}</span>
        {hovered.subtitle && (
          <span className="text-[10px] text-dim whitespace-nowrap">{hovered.subtitle}</span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-dim pl-0.5 whitespace-nowrap">click for details</div>
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
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface/90 backdrop-blur-md pl-3 pr-1.5 py-1 shadow-lg pointer-events-auto">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
        <span className="text-xs text-muted whitespace-nowrap">
          Following <span className="text-fg">{targetName}</span>
        </span>
        <button
          onClick={onRelease}
          aria-label={`Stop following ${targetName}`}
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0',
            'text-dim hover:text-fg hover:bg-raised transition-colors',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent'
          )}
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
