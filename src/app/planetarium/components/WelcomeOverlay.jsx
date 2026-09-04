'use client';

import { cn } from '@/lib/utils';

const HIGHLIGHTS = [
  { icon: '🖱️', title: 'Drag to fly', text: 'Orbit the system, scroll to zoom, click any world for its story.' },
  { icon: '⏱️', title: 'Bend time', text: 'Speed up centuries of orbits, or pause to line up a shot.' },
  { icon: '🚀', title: 'Launch probes', text: 'Aim a trajectory from Earth and slingshot off a planet’s gravity.' }
];

export default function WelcomeOverlay({ onDismiss, onOpenHelp }) {
  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-[min(34rem,100%)] rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-blue-600/15 via-purple-600/10 to-transparent">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-2">
            An orbital sandbox
          </p>
          <h1 className="text-2xl font-bold text-white">Gravity Assist</h1>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
            A live n-body solar system. Everything you see is being integrated in real time — nudge a
            probe and the planets really will pull it off course.
          </p>
        </div>

        <div className="px-6 pb-2 space-y-3">
          {HIGHLIGHTS.map(item => (
            <div key={item.title} className="flex gap-3 items-start">
              <span className="text-lg leading-6 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{item.title}</div>
                <div className="text-[13px] text-slate-400 leading-relaxed">{item.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 p-6 pt-4">
          <button
            onClick={onOpenHelp}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors',
              'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            )}
          >
            Read the guide
          </button>
          <button
            onClick={onDismiss}
            autoFocus
            className={cn(
              'flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all',
              'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500',
              'text-white shadow-lg active:scale-[0.98]'
            )}
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
