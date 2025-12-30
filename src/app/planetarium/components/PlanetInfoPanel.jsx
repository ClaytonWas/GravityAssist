'use client';

import { useEffect, useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { PLANET_INFO } from '../core/planetInfo';
import CompositionChart from './CompositionChart';

export default function PlanetInfoPanel({ 
  selectedBody, 
  isOpen, 
  onClose,
  panelWidth = 380,
  onWidthChange 
}) {
  const [compositionTab, setCompositionTab] = useState('core');
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);

  // Reset composition tab when body changes
  useEffect(() => {
    if (selectedBody?.name) {
      const info = PLANET_INFO[selectedBody.name];
      if (info?.coreComposition) {
        setCompositionTab('core');
      } else if (info?.composition) {
        setCompositionTab('atmosphere');
      }
    }
  }, [selectedBody?.name]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, 300), window.innerWidth * 0.6);
      onWidthChange?.(clampedWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  if (!selectedBody) return null;

  const planetInfo = PLANET_INFO[selectedBody.name];
  const hasAtmosphere = planetInfo?.composition;
  const hasCore = planetInfo?.coreComposition;
  const showCompositionTabs = hasAtmosphere && hasCore;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose?.()} modal={false}>
      <Dialog.Portal>
        {/* No overlay - we want to see the scene behind */}
        <Dialog.Content
          ref={panelRef}
          className={cn(
            "fixed top-0 right-0 h-full bg-slate-900/98 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl",
            "focus:outline-none overflow-hidden flex flex-col z-[500]",
            "data-[state=open]:animate-slideInRight data-[state=closed]:animate-slideOutRight"
          )}
          style={{ width: `${panelWidth}px` }}
          onInteractOutside={(e) => e.preventDefault()} // Don't close on outside click
          onPointerDownOutside={(e) => e.preventDefault()} // Allow clicking scene without closing
          onFocusOutside={(e) => e.preventDefault()} // Keep panel open when focusing elsewhere
        >
          {/* Resize Handle */}
          <div
            onMouseDown={() => setIsResizing(true)}
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize transition-colors z-10",
              isResizing ? "bg-blue-500" : "bg-transparent hover:bg-blue-500/50"
            )}
          />

          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border-b border-slate-700/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-xl font-bold text-white">
                  {selectedBody.name}
                </Dialog.Title>
                {planetInfo?.type && (
                  <Dialog.Description className="text-sm text-slate-400 mt-0.5">
                    {planetInfo.type}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {planetInfo ? (
              <>
                {/* Description */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {planetInfo.description}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Distance from Sun" value={planetInfo.distance} color="blue" />
                  <StatCard label="Orbital Period" value={planetInfo.orbitalPeriod} color="purple" />
                  <StatCard label="Day Length" value={planetInfo.dayLength} color="pink" />
                  <StatCard label="Moons" value={planetInfo.moons} color="cyan" />
                </div>

                {/* Composition Section */}
                {(hasAtmosphere || hasCore) && (
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                    {showCompositionTabs ? (
                      <Tabs.Root value={compositionTab} onValueChange={setCompositionTab}>
                        <Tabs.List className="flex gap-2 mb-4">
                          <Tabs.Trigger
                            value="core"
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                              compositionTab === 'core'
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                                : "text-slate-400 hover:text-white border border-transparent"
                            )}
                          >
                            Core
                          </Tabs.Trigger>
                          <Tabs.Trigger
                            value="atmosphere"
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                              compositionTab === 'atmosphere'
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                                : "text-slate-400 hover:text-white border border-transparent"
                            )}
                          >
                            Atmosphere
                          </Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value="core">
                          <CompositionChart 
                            data={planetInfo.coreComposition} 
                            width={panelWidth - 64}
                          />
                        </Tabs.Content>
                        <Tabs.Content value="atmosphere">
                          <CompositionChart 
                            data={planetInfo.composition} 
                            width={panelWidth - 64}
                          />
                        </Tabs.Content>
                      </Tabs.Root>
                    ) : (
                      <>
                        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
                          {hasCore ? 'Core Composition' : 'Atmospheric Composition'}
                        </h3>
                        <CompositionChart 
                          data={hasCore ? planetInfo.coreComposition : planetInfo.composition} 
                          width={panelWidth - 64}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Fun Facts */}
                {planetInfo.funFacts && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Fun Facts
                    </h3>
                    <ul className="space-y-2">
                      {planetInfo.funFacts.map((fact, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-blue-400 flex-shrink-0">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              /* Probe or unknown body */
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h3 className="font-medium text-white mb-2">Probe Data</h3>
                  {selectedBody.position && (
                    <div className="space-y-1 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">X:</span>
                        <span className="text-blue-400">{selectedBody.position.x.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Y:</span>
                        <span className="text-purple-400">{selectedBody.position.y.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Z:</span>
                        <span className="text-pink-400">{selectedBody.position.z.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
                {selectedBody.velocity && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="font-medium text-white mb-2">Velocity</h3>
                    <div className="space-y-1 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">VX:</span>
                        <span className="text-emerald-400">{selectedBody.velocity.x.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">VY:</span>
                        <span className="text-emerald-400">{selectedBody.velocity.y.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">VZ:</span>
                        <span className="text-emerald-400">{selectedBody.velocity.z.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'text-blue-400 hover:border-blue-500/50',
    purple: 'text-purple-400 hover:border-purple-500/50',
    pink: 'text-pink-400 hover:border-pink-500/50',
    cyan: 'text-cyan-400 hover:border-cyan-500/50'
  };

  return (
    <div className={cn(
      "bg-slate-800/40 rounded-lg p-3 border border-slate-700/30 transition-colors",
      colorClasses[color]
    )}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      <div className={cn("text-sm font-semibold", colorClasses[color])}>
        {value}
      </div>
    </div>
  );
}
