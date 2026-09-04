'use client';

export default function LoadingScreen({ progress = 0, status = 'Initializing…' }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="absolute inset-0 z-[800] flex flex-col items-center justify-center bg-slate-950">
      {/* Faint starfield stand-in so the screen isn't a flat black rectangle */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #cbd5e1, transparent), radial-gradient(1px 1px at 40% 70%, #fff, transparent), radial-gradient(1px 1px at 85% 60%, #94a3b8, transparent), radial-gradient(1.5px 1.5px at 55% 45%, #fff, transparent), radial-gradient(1px 1px at 10% 80%, #e2e8f0, transparent)',
          backgroundSize: '100% 100%'
        }}
      />
      <div className="relative flex flex-col items-center w-[min(20rem,80vw)]">
        <div className="mb-6 h-14 w-14 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600 shadow-[0_0_45px_12px_rgba(249,115,22,0.35)] animate-pulse" />
        <div className="text-white text-xl font-bold tracking-tight">Gravity Assist</div>
        <div className="text-slate-500 text-xs mt-1 mb-6">Assembling the solar system</div>

        <div
          className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <div className="mt-3 flex w-full items-center justify-between text-[11px]">
          <span className="text-slate-400">{status}</span>
          <span className="text-slate-500 font-mono">{Math.round(clamped)}%</span>
        </div>
      </div>
    </div>
  );
}
