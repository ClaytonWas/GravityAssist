'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { SHORTCUT_GROUPS, GUIDE_SECTIONS } from '../core/shortcuts';
import { CloseIcon } from './icons';

function Key({ children }) {
  if (children === 'to') return <span className="text-dim px-0.5 text-[11px]">to</span>;
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-1 rounded bg-raised border border-line text-[11px] text-fg-soft font-normal">
      {children}
    </kbd>
  );
}

export default function HelpDialog({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-[700] data-[state=open]:animate-fadeIn" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[701]',
            'w-[min(44rem,calc(100vw-2rem))] max-h-[min(40rem,calc(100vh-3rem))]',
            'flex flex-col rounded-lg border border-line bg-surface shadow-2xl',
            'focus:outline-none data-[state=open]:animate-fadeIn'
          )}
        >
          <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
            <div>
              <Dialog.Title className="text-base font-medium text-fg">How to fly Gravity Assist</Dialog.Title>
              <Dialog.Description className="text-sm text-muted mt-0.5">
                Orbital mechanics you can steer with your hands.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md text-dim hover:text-fg hover:bg-raised transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                aria-label="Close help"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="guide" className="flex-1 min-h-0 flex flex-col">
            <Tabs.List className="flex-shrink-0 flex gap-4 px-5 border-b border-line">
              {[
                { value: 'guide', label: 'Guide' },
                { value: 'keys', label: 'Keyboard' }
              ].map(tab => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'relative py-2.5 text-sm transition-colors',
                    'text-muted hover:text-fg',
                    'data-[state=active]:text-fg',
                    'after:absolute after:left-0 after:right-0 after:-bottom-px after:h-px',
                    'data-[state=active]:after:bg-fg',
                    'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent'
                  )}
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
              <Tabs.Content value="guide" className="focus:outline-none grid gap-5 sm:grid-cols-2">
                {GUIDE_SECTIONS.map(section => (
                  <section key={section.title}>
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-dim mb-2.5">
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {section.items.map(item => (
                        <li key={item} className="text-[13px] leading-relaxed text-fg-soft flex gap-2">
                          <span className="text-line-strong select-none">&bull;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </Tabs.Content>

              <Tabs.Content value="keys" className="focus:outline-none grid gap-5 sm:grid-cols-2">
                {SHORTCUT_GROUPS.map(group => (
                  <section key={group.title}>
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-dim mb-2.5">
                      {group.title}
                    </h3>
                    <ul className="space-y-1.5">
                      {group.items.map(item => (
                        <li key={item.description} className="flex items-center justify-between gap-3">
                          <span className="text-[13px] text-fg-soft">{item.description}</span>
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
