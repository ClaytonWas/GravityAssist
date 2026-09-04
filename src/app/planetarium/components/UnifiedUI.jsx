'use client';

import { useState, useEffect, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { predictTrajectory } from '../core/physics';
import { MissionIcon, LaunchIcon, CameraIcon, LevelsIcon, CheckIcon, ChevronDownIcon } from './icons';

// ============================================================================
// MISSIONS TAB CONTENT
// ============================================================================
const MISSIONS = [
  { id: 'reach-mars', title: 'Reach Mars', description: 'Launch a probe to orbit Mars', target: 'Mars' },
  { id: 'orbit-jupiter', title: 'Orbit Jupiter', description: 'Navigate to Jupiter', target: 'Jupiter' },
  { id: 'explore-venus', title: 'Explore Venus', description: 'Send a probe to Venus', target: 'Venus' },
  { id: 'outer-planets', title: 'Outer Planets', description: 'Reach Saturn, Uranus, or Neptune', target: 'Saturn' }
];

const MISSION_ARRIVAL_DISTANCE = 100;

// Simulation velocities are stored in units of ~1000 km/s
// (Earth's 29.8 km/s orbital speed is stored as 0.0298).
const KM_PER_SEC_PER_UNIT = 1000;

function MissionsContent({ probes, bodies, onMissionComplete }) {
  const [missions, setMissions] = useState(MISSIONS.map(m => ({ ...m, status: 'pending' })));
  const completeCallbackRef = useRef(onMissionComplete);

  useEffect(() => {
    completeCallbackRef.current = onMissionComplete;
  }, [onMissionComplete]);

  useEffect(() => {
    if (!probes?.length || !bodies?.length) return;

    const interval = setInterval(() => {
      const justCompleted = [];

      setMissions(prev => prev.map(mission => {
        if (mission.status === 'completed') return mission;
        const target = bodies.find(b => b?.name === mission.target);
        if (!target?.position) return mission;

        const near = probes.some(probe => {
          if (!probe?.position) return false;
          const d = Math.hypot(
            probe.position.x - target.position.x,
            probe.position.y - target.position.y,
            probe.position.z - target.position.z
          );
          return d < MISSION_ARRIVAL_DISTANCE;
        });

        if (!near) return mission;
        if (mission.status === 'pending') return { ...mission, status: 'in-progress' };
        justCompleted.push(mission);
        return { ...mission, status: 'completed' };
      }));

      // Announce outside the updater so the callback never runs during render.
      justCompleted.forEach(mission => completeCallbackRef.current?.(mission));
    }, 1000);

    return () => clearInterval(interval);
  }, [probes, bodies]);

  const completed = missions.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-dim uppercase tracking-wider">Progress</span>
        <span className="text-[11px] font-mono text-fg-soft">{completed}/{missions.length}</span>
      </div>
      {missions.map(m => (
        <div key={m.id} className="flex items-start gap-3 py-2">
          <span
            className={cn(
              'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border',
              m.status === 'completed' && 'border-positive text-positive',
              m.status === 'in-progress' && 'border-caution text-caution',
              m.status === 'pending' && 'border-line-strong text-transparent'
            )}
          >
            {m.status === 'completed' && <CheckIcon className="w-2.5 h-2.5" />}
            {m.status === 'in-progress' && <span className="w-1.5 h-1.5 rounded-full bg-caution" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className={cn('text-sm', m.status === 'pending' ? 'text-fg-soft' : 'text-fg')}>
              {m.title}
            </div>
            <div className="text-xs text-dim mt-0.5">{m.description}</div>
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
    return <div className="text-sm text-muted p-4">Waiting for orbital data from Earth</div>;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted leading-relaxed">
        Burns are relative to the motion of Earth. Arm a launch to see where the probe drifts,
        then tune the aim until the preview line reaches your target.
      </p>

      <SliderControl
        label="Burn speed"
        value={speed}
        onChange={setSpeed}
        min={0.001}
        max={0.15}
        step={0.001}
        format={v => `${(v * KM_PER_SEC_PER_UNIT).toFixed(1)} km/s`}
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

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setIsLaunching(!isLaunching)}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm transition-colors border',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            isLaunching
              ? 'bg-transparent border-line text-muted hover:text-fg hover:bg-raised'
              : 'bg-raised border-line-strong text-fg hover:bg-line'
          )}
        >
          {isLaunching ? 'Cancel' : 'Prepare launch'}
        </button>
        {isLaunching && (
          <button
            onClick={handleLaunch}
            className="flex-1 py-2 px-4 rounded-md text-sm bg-fg hover:bg-white text-ink transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            Launch
          </button>
        )}
      </div>

      {isLaunching && (
        <p className="text-xs text-muted flex items-center justify-center gap-2">
          <span className="w-5 h-px bg-caution inline-block" />
          predicted trajectory
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
        <label className="text-xs text-muted">{label}</label>
        <span className="text-xs font-mono text-fg-soft">{format(value[0])}</span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
      >
        <Slider.Track className="bg-line relative grow rounded-full h-1">
          <Slider.Range className="absolute bg-line-strong rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-3.5 h-3.5 bg-fg rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-grab active:cursor-grabbing"
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
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1">
        {planets.map(name => {
          const body = cameraPresets?.find(b => b?.name === name);
          if (!body) return null;
          return (
            <button
              key={name}
              onClick={() => onCameraPreset?.(name)}
              className={cn(
                'py-2 px-2 text-xs rounded-md border border-transparent transition-colors',
                'text-muted hover:text-fg hover:bg-raised hover:border-line',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent'
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="pt-3 border-t border-line">
        <p className="text-[10px] text-dim uppercase tracking-wider mb-2">Keyboard</p>
        <div className="flex flex-wrap gap-1">
          {['1-9: Bodies', '0: Release'].map(shortcut => (
            <span key={shortcut} className="text-[10px] bg-raised text-muted px-2 py-1 rounded font-mono">
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
    <div className="space-y-1">
      {Object.values(availableLevels).map(level => (
        <button
          key={level.id}
          onClick={() => onLevelChange?.(level.id)}
          className={cn(
            'w-full p-2.5 rounded-md text-left transition-colors border',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            currentLevelId === level.id
              ? 'bg-raised border-line-strong text-fg'
              : 'bg-transparent border-transparent text-fg-soft hover:bg-raised hover:border-line'
          )}
        >
          <div className="text-sm">{level.name}</div>
          <div className="text-xs text-dim mt-0.5">{level.description}</div>
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
  open,
  onOpenChange,
  missionsProps,
  probeLauncherProps,
  cameraPresets,
  onCameraPreset,
  levelsProps
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const isOpen = open ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;
  const [activeTab, setActiveTab] = useState('missions');

  const tabs = [
    { id: 'missions', label: 'Missions', Icon: MissionIcon },
    { id: 'probe', label: 'Launch', Icon: LaunchIcon },
    { id: 'camera', label: 'Camera', Icon: CameraIcon },
    { id: 'levels', label: 'Levels', Icon: LevelsIcon }
  ];

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="fixed top-4 left-4 z-[100] w-64 max-w-[calc(100vw-2rem)]">
        <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
          <div className="bg-surface/95 backdrop-blur-md rounded-lg border border-line shadow-lg overflow-hidden">
            {/* Header */}
            <Collapsible.Trigger asChild>
              <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-raised transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset">
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm text-fg">Mission control</span>
                  {!isOpen && (
                    <span className="text-xs text-dim truncate">
                      {tabs.find(t => t.id === activeTab)?.label}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-raised border border-line text-[10px] text-dim">
                    C
                  </kbd>
                  <ChevronDownIcon
                    className={cn('w-4 h-4 text-dim transition-transform duration-200', isOpen && 'rotate-180')}
                  />
                </span>
              </button>
            </Collapsible.Trigger>

            <Collapsible.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
              <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                {/* Tab List */}
                <Tabs.List className="flex border-t border-b border-line">
                  {tabs.map(tab => (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        'flex-1 py-2 flex flex-col items-center gap-1 relative transition-colors',
                        'text-dim hover:text-fg-soft',
                        'data-[state=active]:text-fg',
                        'after:absolute after:left-0 after:right-0 after:-bottom-px after:h-px',
                        'data-[state=active]:after:bg-fg',
                        'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset'
                      )}
                    >
                      <tab.Icon className="w-4 h-4" />
                      <span className="text-[10px] leading-none">{tab.label}</span>
                    </Tabs.Trigger>
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
