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

function BarButton({ label, onClick, active, accent = 'emerald', className, children, ...rest }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          aria-pressed={active === undefined ? undefined : active}
          className={cn(
            'flex items-center justify-center rounded-lg border transition-all duration-200',
            'touch-manipulation flex-shrink-0 h-9 w-9',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            active
              ? accent === 'amber'
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700/60 hover:border-slate-600',
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
          className="bg-slate-800 text-white text-xs py-1.5 px-2.5 rounded-lg shadow-xl border border-slate-700 z-[400]"
        >
          {label}
          <Tooltip.Arrow className="fill-slate-800" />
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

  // Click-away / Esc closes the speed popover (tap-friendly, unlike hover-only menus).
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
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-slate-700/50 bg-slate-900/90 backdrop-blur-xl px-2 py-2 shadow-2xl">
          {/* Time transport */}
          <BarButton label="Much slower (Shift -)" onClick={() => nudge(-timeScaleStep * 10)} className="hidden sm:flex">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20l-7-8 7-8M12 20l-7-8 7-8" />
            </svg>
          </BarButton>
          <BarButton label="Slower (-)" onClick={() => nudge(-timeScaleStep)}>
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </BarButton>

          <BarButton
            label={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
            onClick={onTogglePause}
            className={cn(
              'h-10 w-10 border-transparent text-white shadow-lg',
              'bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500',
              'hover:border-transparent active:scale-95'
            )}
          >
            {isPaused ? (
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M6 4l14 8-14 8z" />
              </svg>
            ) : (
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            )}
          </BarButton>

          <BarButton label="Faster (=)" onClick={() => nudge(timeScaleStep)}>
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </BarButton>
          <BarButton label="Much faster (Shift =)" onClick={() => nudge(timeScaleStep * 10)} className="hidden sm:flex">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 4l7 8-7 8M12 4l7 8-7 8" />
            </svg>
          </BarButton>

          {/* Speed readout + popover */}
          <div ref={speedRef} className="relative flex-shrink-0">
            <button
              onClick={() => setSpeedOpen(o => !o)}
              aria-expanded={speedOpen}
              aria-label="Simulation speed"
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border px-2.5 sm:px-3 py-1 min-w-[5.25rem] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                speedOpen
                  ? 'bg-slate-700/70 border-slate-500'
                  : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-700/60 hover:border-slate-600'
              )}
            >
              <span className={cn('text-sm font-semibold font-mono leading-tight', isPaused ? 'text-slate-500' : 'text-blue-400')}>
                {isPaused ? 'Paused' : `${rate.value} ${rate.unit}`}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                per second
              </span>
            </button>

            {speedOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl p-3.5 shadow-2xl z-[400]">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Simulation speed</span>
                  <span className="text-xs font-mono text-blue-400">{rate.value} {rate.unit} / sec</span>
                </div>
                <input
                  type="range"
                  min={minTimeScale}
                  max={maxTimeScale}
                  step={timeScaleStep}
                  value={timeScale}
                  onChange={e => onTimeScaleChange(Number(e.target.value))}
                  aria-label="Simulation speed"
                  className="w-full h-2 touch-manipulation"
                />
                <div className="grid grid-cols-5 gap-1 mt-3">
                  {SPEED_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => onTimeScaleChange(preset.value)}
                      className={cn(
                        'py-1.5 rounded-md text-[10px] font-medium transition-colors border',
                        timeScale === preset.value
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-7 bg-slate-700/60 mx-0.5 flex-shrink-0" />

          <BarButton label="Orbit paths (O)" onClick={onToggleOrbits} active={showOrbits}>
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-[18px] h-[18px]">
              <ellipse cx="12" cy="12" rx="10" ry="5.5" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            </svg>
          </BarButton>

          {labelsAvailable && (
            <BarButton label="Planet labels (L)" onClick={onToggleLabels} active={showLabels}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h10m-7 4h7" />
              </svg>
            </BarButton>
          )}

          <BarButton
            label="Performance stats (D)"
            onClick={onToggleDebug}
            active={debugMode}
            accent="amber"
            className="hidden sm:flex"
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V8" />
            </svg>
          </BarButton>

          <BarButton label="Help & shortcuts (?)" onClick={onOpenHelp}>
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 9a3.5 3.5 0 115 3.2c-.9.5-1.5 1.3-1.5 2.3v.5M12 17.5h.01" />
              <circle cx="12" cy="12" r="9.5" />
            </svg>
          </BarButton>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
