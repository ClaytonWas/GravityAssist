'use client';

import { useState, useEffect } from 'react';
import MissionObjectives from './MissionObjectives';
import ProbeLauncher from './ProbeLauncher';

export default function UnifiedUI({ 
  simulationMode,
  missionsProps,
  probeLauncherProps,
  cameraPresets,
  onCameraPreset,
  levelsProps
}) {
  // Persist activeTab in localStorage so it doesn't reset
  // Start with default to avoid hydration mismatch
  const [activeTab, setActiveTab] = useState('missions');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
    const savedTab = localStorage.getItem('planetariumActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('planetariumActiveTab', activeTab);
    }
  }, [activeTab, isHydrated]);

  // Lift probe launcher state to persist across tab switches
  // Start with defaults to avoid hydration mismatch
  const [probeLauncherState, setProbeLauncherState] = useState({
    speed: 0.01,
    launchAngle: { azimuth: 0, elevation: 0 },
    isLaunching: false
  });

  // Load probe launcher state from localStorage after mount
  useEffect(() => {
    if (isHydrated) {
      const saved = localStorage.getItem('probeLauncherState');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProbeLauncherState(parsed);
        } catch (e) {
          // Invalid JSON, keep defaults
        }
      }
    }
  }, [isHydrated]);

  // Save probe launcher state to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('probeLauncherState', JSON.stringify(probeLauncherState));
    }
  }, [probeLauncherState, isHydrated]);

  // Lift missions state to persist across tab switches
  // Start with null to avoid hydration mismatch
  const [missionsState, setMissionsState] = useState(null);

  // Load missions state from localStorage after mount
  useEffect(() => {
    if (isHydrated) {
      const saved = localStorage.getItem('missionsState');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMissionsState(parsed);
        } catch (e) {
          // Invalid JSON, keep null
        }
      }
    }
  }, [isHydrated]);

  // Save missions state to localStorage
  useEffect(() => {
    if (isHydrated && missionsState) {
      localStorage.setItem('missionsState', JSON.stringify(missionsState));
    }
  }, [missionsState, isHydrated]);

  const tabs = [
    { id: 'missions', label: 'Missions', icon: '🎯' },
    { id: 'probe', label: 'Probe Launcher', icon: '🚀' },
    { id: 'camera', label: 'Camera', icon: '📷' },
    { id: 'levels', label: 'Levels', icon: '🌌' }
  ];

  return (
    <div className={`fixed bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl text-white rounded-lg shadow-2xl border border-slate-700/50 z-20 transition-all duration-300
      sm:top-4 sm:left-4 sm:bottom-auto
      bottom-20 left-2 right-2
      ${
      isExpanded ? 'sm:w-72 sm:right-auto w-auto' : 'w-10 right-auto left-2'
    }`}>
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-2.5 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10">
        {isExpanded && (
          <h2 className="text-sm font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Controls</h2>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700/50 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 py-2 sm:py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-slate-800/50 text-white border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30 active:bg-slate-700/50'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-h-[40vh] sm:max-h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar">
            {/* Keep components mounted but hidden to preserve state */}
            <div className={activeTab === 'missions' ? 'block' : 'hidden'}>
              <div className="p-3">
                <MissionObjectives 
                  {...missionsProps} 
                  missionsState={missionsState}
                  setMissionsState={setMissionsState}
                />
              </div>
            </div>

            <div className={activeTab === 'probe' ? 'block' : 'hidden'}>
              <div className="p-3">
                <ProbeLauncher 
                  {...probeLauncherProps}
                  probeLauncherState={probeLauncherState}
                  setProbeLauncherState={setProbeLauncherState}
                />
              </div>
            </div>

            {activeTab === 'camera' && (
              <div className="p-3 space-y-3">
                <h3 className="text-xs font-semibold mb-2 text-slate-400 uppercase tracking-wider">Camera Presets</h3>
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">
                  {['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map((name) => {
                    const body = cameraPresets.find(b => b && b.name === name);
                    if (!body) return null;
                    return (
                      <button
                        key={name}
                        onClick={() => onCameraPreset(name)}
                        className="px-2 py-2 sm:py-1.5 text-xs bg-slate-800/50 hover:bg-slate-700/50 active:bg-slate-600/50 rounded-lg transition-all duration-200 border border-slate-700/30 hover:border-blue-500/50 font-medium touch-manipulation"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-[10px] text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Keyboard Shortcuts</p>
                  <ul className="text-[10px] text-slate-300 space-y-0.5 font-mono">
                    <li><span className="text-blue-400">1-9:</span> Planets</li>
                    <li><span className="text-blue-400">0:</span> Unlock</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'levels' && (
              <div className="p-3 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Simulation</h3>
                {levelsProps && Object.values(levelsProps.availableLevels).map(level => (
                  <button
                    key={level.id}
                    onClick={() => levelsProps.onLevelChange(level.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-200 border ${
                      levelsProps.currentLevelId === level.id
                        ? 'bg-blue-600/20 border-blue-500/50 text-white'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{level.name}</div>
                    <div className="text-xs text-slate-400">{level.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Collapsed state - show icons only */}
      {!isExpanded && (
        <div className="py-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setIsExpanded(true);
                setActiveTab(tab.id);
              }}
              className={`w-full p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200 ${
                activeTab === tab.id ? 'bg-slate-800/50' : ''
              }`}
              title={tab.label}
            >
              <span className="text-lg">{tab.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

