'use client';

export default function LoadingScreen({ progress = 0, status = 'Initializing' }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="absolute inset-0 z-[800] flex flex-col items-center justify-center bg-ink">
      <div className="flex flex-col items-start w-[min(20rem,80vw)]">
        <div className="text-fg text-base font-medium tracking-tight">Gravity Assist</div>
        <div className="text-dim text-xs mt-1 mb-6">Assembling the solar system</div>

        <div
          className="w-full h-px bg-line overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <div className="mt-3 flex w-full items-center justify-between text-[11px]">
          <span className="text-muted">{status}</span>
          <span className="text-dim font-mono">{Math.round(clamped)}%</span>
        </div>
      </div>
    </div>
  );
}
