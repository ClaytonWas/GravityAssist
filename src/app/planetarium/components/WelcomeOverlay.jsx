'use client';

import { cn } from '@/lib/utils';

const HIGHLIGHTS = [
  { title: 'Drag to fly', text: 'Orbit the system, scroll to zoom, click any world for its story.' },
  { title: 'Bend time', text: 'Speed up centuries of orbits, or pause to line up a shot.' },
  { title: 'Launch probes', text: 'Aim a trajectory from Earth and slingshot off the gravity of a planet.' }
];

export default function WelcomeOverlay({ onDismiss, onOpenHelp }) {
  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-[min(30rem,100%)] rounded-lg border border-line bg-surface shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <p className="text-[11px] uppercase tracking-[0.18em] text-dim mb-2">
            An orbital sandbox
          </p>
          <h1 className="text-xl font-medium text-fg">Gravity Assist</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            A live n-body solar system. Everything you see is being integrated in real time, so
            nudge a probe and the planets really will pull it off course.
          </p>
        </div>

        <div className="px-6 py-5 space-y-3.5">
          {HIGHLIGHTS.map(item => (
            <div key={item.title} className="flex gap-3 items-baseline">
              <span className="h-1 w-1 rounded-full bg-line-strong flex-shrink-0 translate-y-[-3px]" />
              <div className="min-w-0">
                <span className="text-sm text-fg">{item.title}. </span>
                <span className="text-sm text-muted leading-relaxed">{item.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 px-6 pb-6">
          <button
            onClick={onOpenHelp}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-md text-sm transition-colors',
              'bg-transparent hover:bg-raised text-muted hover:text-fg border border-line',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent'
            )}
          >
            Read the guide
          </button>
          <button
            onClick={onDismiss}
            autoFocus
            className={cn(
              'flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors',
              'bg-fg hover:bg-white text-ink',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent'
            )}
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
