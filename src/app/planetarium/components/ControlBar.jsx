'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

// The simulation's internal time unit is ~1000 seconds: a velocity of 1 unit is
// ~1000 km/s (Earth's 29.8 km/s is stored as 0.0298), and the worker advances
// timeScale * 0.016 time units about 62 times a second. So one real second
// advances roughly timeScale * 1000 seconds of simulated time.
const SECONDS_PER_TIME_UNIT = 1000;

export function simSecondsPerSecond(timeScale) {
  return timeScale * SECONDS_PER_TIME_UNIT;
}

/** Human-readable "how much sky-time passes per real second". */
export function formatSimRate(timeScale) {
  const seconds = simSecondsPerSecond(timeScale);
  if (seconds < 120) return { value: seconds.toFixed(0), unit: 'sec' };
  if (seconds < 7200) return { value: (seconds / 60).toFixed(0), unit: 'min' };
  if (seconds < 172800) return { value: (seconds / 3600).toFixed(1), unit: 'hrs' };
  if (seconds < 63072000) return { value: (seconds / 86400).toFixed(1), unit: 'days' };
  return { value: (seconds / 31557600).toFixed(1), unit: 'yrs' };
}

function BarButton({ label, onClick, active, className, children, ...rest }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          aria-pressed={active === undefined ? undefined : active}
          className={cn(
            'flex items-center justify-center rounded-md border transition-colors',
            'touch-manipulation flex-shrink-0 h-9 w-9',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            active
              ? 'bg-raised border-line-strong text-fg'
              : 'bg-transparent border-transparent text-muted hover:text-fg hover:bg-raised',
            className
          )}
          {...rest}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          className="bg-raised text-fg-soft text-xs py-1.5 px-2.5 rounded-md shadow-lg border border-line z-[400]"
        >
          {label}
          <Tooltip.Arrow className="fill-raised" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const SPEED_PRESETS = [
  { label: 'Creep', value: 100 },
  { label: 'Slow', value: 500 },
  { label: 'Normal', value: 1000 },
  { label: 'Fast', value: 5000 },
  { label: 'Warp', value: 15000 }
];

export default function ControlBar({
  timeScale,
  onTimeScaleChange,
  minTimeScale,
  maxTimeScale,
  timeScaleStep,
  isPaused,
  onTogglePause,
  showOrbits,
  onToggleOrbits,
  showLabels,
  onToggleLabels,
  labelsAvailable,
  debugMode,
  onToggleDebug,
  onOpenHelp
}) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef(null);

  // Click-away and Esc close the speed popover, so it works on touch too
  // (unlike a hover-only menu).
  useEffect(() => {
    if (!speedOpen) return;
    const onPointerDown = (e) => {
      if (!speedRef.current?.contains(e.target)) setSpeedOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSpeedOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [speedOpen]);

  const rate = formatSimRate(timeScale);

  const nudge = (delta) => onTimeScaleChange(
    Math.min(maxTimeScale, Math.max(minTimeScale, timeScale + delta))
  );

  return (
    <Tooltip.Provider delayDuration={250}>
      <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-[200] max-w-[calc(100vw-1rem)]">
        <div className="flex items-center gap-0.5 sm:gap-1 rounded-lg border border-line bg-surface/95 backdrop-blur-md px-1.5 py-1.5 shadow-lg">
          {/* Time transport */}
          <BarButton label="Much slower (Shift -)" onClick={() => nudge(-timeScaleStep * 10)} className="hidden sm:flex">
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M19 20l-7-8 7-8M12 20l-7-8 7-8" />
            </svg>
          </BarButton>
          <BarButton label="Slower (-)" onClick={() => nudge(-timeScaleStep)}>
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </BarButton>

          <BarButton
            label={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
            onClick={onTogglePause}
            className="bg-raised border-line-strong text-fg hover:bg-line hover:text-fg"
          >
            {isPaused ? (
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path d="M6 4l14 8-14 8z" />
              </svg>
            ) : (
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            )}
          </BarButton>

          <BarButton label="Faster (=)" onClick={() => nudge(timeScaleStep)}>
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </BarButton>
          <BarButton label="Much faster (Shift =)" onClick={() => nudge(timeScaleStep * 10)} className="hidden sm:flex">
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M5 4l7 8-7 8M12 4l7 8-7 8" />
            </svg>
          </BarButton>

          {/* Speed readout and popover */}
          <div ref={speedRef} className="relative flex-shrink-0">
            <button
              onClick={() => setSpeedOpen(o => !o)}
              aria-expanded={speedOpen}
              aria-label="Simulation speed"
              className={cn(
                'flex flex-col items-center justify-center rounded-md border px-2.5 sm:px-3 py-1 min-w-[5rem] transition-colors',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                speedOpen
                  ? 'bg-raised border-line-strong'
                  : 'bg-transparent border-transparent hover:bg-raised'
              )}
            >
              <span className={cn('text-sm font-mono leading-tight', isPaused ? 'text-dim' : 'text-fg')}>
                {isPaused ? 'Paused' : `${rate.value} ${rate.unit}`}
              </span>
              <span className="text-[10px] text-dim leading-tight">
                per second
              </span>
            </button>

            {speedOpen && (
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface/98 backdrop-blur-md p-3.5 shadow-xl z-[400]">
                <div className="flex items-baseline justify-between mb-2.5">
                  <span className="text-[11px] uppercase tracking-wider text-dim">Simulation speed</span>
                  <span className="text-xs font-mono text-fg-soft">{rate.value} {rate.unit} / sec</span>
                </div>
                <input
                  type="range"
                  min={minTimeScale}
                  max={maxTimeScale}
                  step={timeScaleStep}
                  value={timeScale}
                  onChange={e => onTimeScaleChange(Number(e.target.value))}
                  aria-label="Simulation speed"
                  className="w-full touch-manipulation"
                />
                <div className="grid grid-cols-5 gap-1 mt-3.5">
                  {SPEED_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => onTimeScaleChange(preset.value)}
                      className={cn(
                        'py-1.5 rounded text-[10px] transition-colors border',
                        timeScale === preset.value
                          ? 'bg-raised border-line-strong text-fg'
                          : 'bg-transparent border-line text-muted hover:text-fg hover:bg-raised'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-line mx-0.5 flex-shrink-0" />

          <BarButton label="Orbit paths (O)" onClick={onToggleOrbits} active={showOrbits}>
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="w-[18px] h-[18px]">
              <ellipse cx="12" cy="12" rx="9.5" ry="5" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
          </BarButton>

          {labelsAvailable && (
            <BarButton label="Planet labels (L)" onClick={onToggleLabels} active={showLabels}>
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M7 8h10M7 12h10m-7 4h7" />
              </svg>
            </BarButton>
          )}

          <BarButton
            label="Performance stats (D)"
            onClick={onToggleDebug}
            active={debugMode}
            className="hidden sm:flex"
          >
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" />
            </svg>
          </BarButton>

          <BarButton label="Help and shortcuts (?)" onClick={onOpenHelp}>
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M9 9a3 3 0 115 2.2c-.8.5-1.4 1.2-1.4 2.1v.4M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </BarButton>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
