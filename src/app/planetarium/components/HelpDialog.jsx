'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { SHORTCUT_GROUPS, GUIDE_SECTIONS } from '../core/shortcuts';

function Key({ children }) {
  if (children === '–') return <span className="text-slate-500 px-0.5">–</span>;
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-1 rounded-md bg-slate-800 border border-slate-600 border-b-2 text-[11px] font-medium text-slate-200 shadow-sm">
      {children}
    </kbd>
  );
}

export default function HelpDialog({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[700] data-[state=open]:animate-fadeIn" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[701]',
            'w-[min(46rem,calc(100vw-2rem))] max-h-[min(42rem,calc(100vh-3rem))]',
            'flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl',
            'focus:outline-none data-[state=open]:animate-fadeIn'
          )}
        >
          <div className="flex-shrink-0 flex items-start justify-between gap-4 p-5 border-b border-slate-700/60 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-t-2xl">
            <div>
              <Dialog.Title className="text-lg font-bold text-white">How to fly Gravity Assist</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-400 mt-0.5">
                Orbital mechanics you can steer with your hands.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="guide" className="flex-1 min-h-0 flex flex-col">
            <Tabs.List className="flex-shrink-0 flex gap-1 px-4 pt-3 border-b border-slate-700/60">
              {[
                { value: 'guide', label: 'Guide' },
                { value: 'keys', label: 'Keyboard' }
              ].map(tab => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                    'text-slate-400 hover:text-white',
                    'data-[state=active]:text-white data-[state=active]:bg-slate-800/70',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  )}
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
              <Tabs.Content value="guide" className="focus:outline-none grid gap-4 sm:grid-cols-2">
                {GUIDE_SECTIONS.map(section => (
                  <section key={section.title} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                    <h3 className={cn('text-sm font-semibold mb-2', section.accent)}>{section.title}</h3>
                    <ul className="space-y-1.5">
                      {section.items.map(item => (
                        <li key={item} className="text-[13px] leading-relaxed text-slate-300 flex gap-2">
                          <span className="text-slate-600 select-none">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </Tabs.Content>

              <Tabs.Content value="keys" className="focus:outline-none grid gap-4 sm:grid-cols-2">
                {SHORTCUT_GROUPS.map(group => (
                  <section key={group.title} className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                      {group.title}
                    </h3>
                    <ul className="space-y-2">
                      {group.items.map(item => (
                        <li key={item.description} className="flex items-center justify-between gap-3">
                          <span className="text-[13px] text-slate-300">{item.description}</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            {item.keys.map((key, i) => (
                              <Key key={`${key}-${i}`}>{key}</Key>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
