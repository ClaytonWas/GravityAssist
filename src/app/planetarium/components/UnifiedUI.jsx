'use client';

import { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { predictTrajectory } from '../core/physics';

// ============================================================================
// MISSIONS TAB CONTENT
// ============================================================================
const MISSIONS = [
  { id: 'reach-mars', title: 'Reach Mars', description: 'Launch a probe to orbit Mars', target: 'Mars' },
  { id: 'orbit-jupiter', title: 'Orbit Jupiter', description: 'Navigate to Jupiter', target: 'Jupiter' },
  { id: 'explore-venus', title: 'Explore Venus', description: 'Send a probe to Venus', target: 'Venus' },
  { id: 'outer-planets', title: 'Outer Planets', description: 'Reach Saturn, Uranus, or Neptune', target: 'Saturn' }
];

function MissionsContent({ probes, bodies }) {
  const [missions, setMissions] = useState(MISSIONS.map(m => ({ ...m, status: 'pending' })));

  useEffect(() => {
    if (!probes?.length || !bodies?.length) return;
    
    const interval = setInterval(() => {
      setMissions(prev => prev.map(mission => {
        if (mission.status === 'completed') return mission;
        const target = bodies.find(b => b?.name === mission.target);
        if (!target?.position) return mission;
        
        const near = probes.some(probe => {
          if (!probe?.position) return false;
          const d = Math.sqrt(
            Math.pow(probe.position.x - target.position.x, 2) +
            Math.pow(probe.position.y - target.position.y, 2) +
            Math.pow(probe.position.z - target.position.z, 2)
          );
          return d < 100;
        });
        
        if (near && mission.status === 'pending') return { ...mission, status: 'in-progress' };
        if (near && mission.status === 'in-progress') return { ...mission, status: 'completed' };
        return mission;
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [probes, bodies]);

  const completed = missions.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Progress</span>
        <span className="text-xs font-bold text-blue-400">{completed}/{missions.length}</span>
      </div>
      {missions.map(m => (
        <div
          key={m.id}
          className={cn(
            "p-3 rounded-lg border transition-all",
            m.status === 'completed' && "bg-emerald-500/10 border-emerald-500/30",
            m.status === 'in-progress' && "bg-amber-500/10 border-amber-500/30",
            m.status === 'pending' && "bg-slate-800/50 border-slate-700/50"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs",
              m.status === 'completed' && "bg-emerald-500 text-white",
              m.status === 'in-progress' && "bg-amber-500 text-white animate-pulse",
              m.status === 'pending' && "bg-slate-700 text-slate-400"
            )}>
              {m.status === 'completed' ? '✓' : m.status === 'in-progress' ? '◉' : '○'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-white">{m.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{m.description}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PROBE LAUNCHER TAB CONTENT
// ============================================================================
function ProbeLauncherContent({ earth, allBodies, timeScale, onLaunchProbe, onUpdateTrajectory }) {
  const [speed, setSpeed] = useState([0.01]);
  const [azimuth, setAzimuth] = useState([0]);
  const [elevation, setElevation] = useState([0]);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!earth || !isLaunching) {
      onUpdateTrajectory?.(null);
      return;
    }

    const azRad = (azimuth[0] * Math.PI) / 180;
    const elRad = (elevation[0] * Math.PI) / 180;
    const dir = {
      x: Math.cos(elRad) * Math.cos(azRad),
      y: Math.sin(elRad),
      z: Math.cos(elRad) * Math.sin(azRad)
    };

    const vel = {
      x: earth.velocity.x + dir.x * speed[0],
      y: earth.velocity.y + dir.y * speed[0],
      z: earth.velocity.z + dir.z * speed[0]
    };

    const probe = { id: 'preview', mass: 0.001, position: { ...earth.position }, velocity: vel };
    const trajectory = predictTrajectory(probe, allBodies, timeScale, 5000);
    onUpdateTrajectory?.(trajectory);
  }, [azimuth, elevation, speed, isLaunching, earth, allBodies, timeScale, onUpdateTrajectory]);

  const handleLaunch = () => {
    if (!earth) return;
    
    const azRad = (azimuth[0] * Math.PI) / 180;
    const elRad = (elevation[0] * Math.PI) / 180;
    const dir = {
      x: Math.cos(elRad) * Math.cos(azRad),
      y: Math.sin(elRad),
      z: Math.cos(elRad) * Math.sin(azRad)
    };

    onLaunchProbe?.({
      name: `Probe ${Date.now()}`,
      position: { ...earth.position },
      velocity: {
        x: earth.velocity.x + dir.x * speed[0],
        y: earth.velocity.y + dir.y * speed[0],
        z: earth.velocity.z + dir.z * speed[0]
      },
      mass: 0.0001
    });
    setIsLaunching(false);
  };

  if (!earth) {
    return <div className="text-sm text-slate-400 p-4">Waiting for Earth data...</div>;
  }

  return (
    <div className="space-y-5">
      <SliderControl 
        label="Launch Speed" 
        value={speed} 
        onChange={setSpeed}
        min={0.001} 
        max={0.15} 
        step={0.001}
        format={v => v.toFixed(4)}
      />
      <SliderControl 
        label="Azimuth" 
        value={azimuth} 
        onChange={setAzimuth}
        min={0} 
        max={360} 
        step={1}
        format={v => `${v.toFixed(0)}°`}
      />
      <SliderControl 
        label="Elevation" 
        value={elevation} 
        onChange={setElevation}
        min={-90} 
        max={90} 
        step={1}
        format={v => `${v.toFixed(0)}°`}
      />
      
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => setIsLaunching(!isLaunching)}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
            isLaunching 
              ? "bg-amber-500 hover:bg-amber-400 text-black" 
              : "bg-blue-600 hover:bg-blue-500 text-white"
          )}
        >
          {isLaunching ? 'Cancel' : 'Prepare Launch'}
        </button>
        {isLaunching && (
          <button
            onClick={handleLaunch}
            className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm bg-emerald-500 hover:bg-emerald-400 text-white transition-all"
          >
            🚀 Launch
          </button>
        )}
      </div>
      
      {isLaunching && (
        <p className="text-xs text-slate-400 text-center">
          Orange trajectory preview shown
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SLIDER CONTROL COMPONENT (using Radix)
// ============================================================================
function SliderControl({ label, value, onChange, min, max, step, format }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs text-slate-400 font-medium">{label}</label>
        <span className="text-xs font-mono text-blue-400">{format(value[0])}</span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
      >
        <Slider.Track className="bg-slate-700 relative grow rounded-full h-1.5">
          <Slider.Range className="absolute bg-gradient-to-r from-blue-500 to-purple-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb 
          className="block w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-grab active:cursor-grabbing transition-colors"
          aria-label={label}
        />
      </Slider.Root>
    </div>
  );
}

// ============================================================================
// CAMERA TAB CONTENT
// ============================================================================
function CameraContent({ cameraPresets, onCameraPreset }) {
  const planets = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {planets.map(name => {
          const body = cameraPresets?.find(b => b?.name === name);
          if (!body) return null;
          return (
            <Tooltip.Root key={name}>
              <Tooltip.Trigger asChild>
                <button
                  onClick={() => onCameraPreset?.(name)}
                  className="py-2 px-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-lg transition-all text-slate-200 hover:text-white"
                >
                  {name}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl border border-slate-700 z-[200]"
                  sideOffset={5}
                >
                  Focus on {name}
                  <Tooltip.Arrow className="fill-slate-800" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
      <div className="pt-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Keyboard</p>
        <div className="flex flex-wrap gap-1">
          {['1-9: Planets', '0: Unlock'].map(shortcut => (
            <span key={shortcut} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-mono">
              {shortcut}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LEVELS TAB CONTENT
// ============================================================================
function LevelsContent({ currentLevelId, availableLevels, onLevelChange }) {
  if (!availableLevels) return null;
  
  return (
    <div className="space-y-2">
      {Object.values(availableLevels).map(level => (
        <button
          key={level.id}
          onClick={() => onLevelChange?.(level.id)}
          className={cn(
            "w-full p-3 rounded-lg text-left transition-all border",
            currentLevelId === level.id
              ? "bg-blue-500/20 border-blue-500/50 text-white"
              : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600"
          )}
        >
          <div className="font-medium text-sm">{level.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{level.description}</div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN UNIFIED UI COMPONENT
// ============================================================================
export default function UnifiedUI({ 
  simulationMode,
  missionsProps,
  probeLauncherProps,
  cameraPresets,
  onCameraPreset,
  levelsProps
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('missions');

  const tabs = [
    { id: 'missions', label: 'Missions', icon: '🎯' },
    { id: 'probe', label: 'Launch', icon: '🚀' },
    { id: 'camera', label: 'Camera', icon: '📷' },
    { id: 'levels', label: 'Levels', icon: '🌌' }
  ];

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="fixed top-4 left-4 z-[100] w-72 max-w-[calc(100vw-2rem)]">
        <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Header */}
            <Collapsible.Trigger asChild>
              <button className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors">
                <span className="font-semibold text-sm text-white">Controls</span>
                <svg 
                  className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </Collapsible.Trigger>

            <Collapsible.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
              <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                {/* Tab List */}
                <Tabs.List className="flex border-t border-b border-slate-700/50 bg-slate-800/30">
                  {tabs.map(tab => (
                    <Tooltip.Root key={tab.id}>
                      <Tooltip.Trigger asChild>
                        <Tabs.Trigger
                          value={tab.id}
                          className={cn(
                            "flex-1 py-2.5 text-center transition-all relative",
                            "text-slate-400 hover:text-white hover:bg-slate-800/50",
                            "data-[state=active]:text-white data-[state=active]:bg-slate-800/70",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                          )}
                        >
                          <span className="text-base">{tab.icon}</span>
                          <div 
                            className={cn(
                              "absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transition-transform duration-200",
                              activeTab === tab.id ? "scale-x-100" : "scale-x-0"
                            )} 
                          />
                        </Tabs.Trigger>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="bg-slate-800 text-white text-xs py-1 px-2 rounded shadow-xl border border-slate-700 z-[200]"
                          sideOffset={5}
                        >
                          {tab.label}
                          <Tooltip.Arrow className="fill-slate-800" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  ))}
                </Tabs.List>

                {/* Tab Content */}
                <div className="p-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                  <Tabs.Content value="missions" className="focus:outline-none">
                    <MissionsContent {...missionsProps} />
                  </Tabs.Content>
                  
                  <Tabs.Content value="probe" className="focus:outline-none">
                    <ProbeLauncherContent {...probeLauncherProps} />
                  </Tabs.Content>
                  
                  <Tabs.Content value="camera" className="focus:outline-none">
                    <CameraContent cameraPresets={cameraPresets} onCameraPreset={onCameraPreset} />
                  </Tabs.Content>
                  
                  <Tabs.Content value="levels" className="focus:outline-none">
                    <LevelsContent {...levelsProps} />
                  </Tabs.Content>
                </div>
              </Tabs.Root>
            </Collapsible.Content>
          </div>
        </Collapsible.Root>
      </div>
    </Tooltip.Provider>
  );
}

