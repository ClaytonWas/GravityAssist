'use client';

import { useState } from 'react';
import MissionObjectives from './MissionObjectives';
import ProbeLauncher from './ProbeLauncher';

export default function UnifiedUI({ 
  simulationMode,
  missionsProps,
  probeLauncherProps,
  cameraPresets,
  onCameraPreset
}) {
  const [activeTab, setActiveTab] = useState('missions');
  const [isExpanded, setIsExpanded] = useState(true);

  const tabs = [
    { id: 'missions', label: 'Missions', icon: '🎯' },
    { id: 'probe', label: 'Probe Launcher', icon: '🚀' },
    { id: 'camera', label: 'Camera', icon: '📷' }
  ];

  return (
    <div className={`fixed top-4 left-4 bg-black bg-opacity-90 text-white rounded-lg shadow-2xl z-20 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-12'
    }`}>
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        {isExpanded && (
          <h2 className="text-lg font-bold">Controls</h2>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            className={`w-5 h-5 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            {activeTab === 'missions' && (
              <div className="p-4">
                <MissionObjectives {...missionsProps} />
              </div>
            )}

            {activeTab === 'probe' && (
              <div className="p-4">
                <ProbeLauncher {...probeLauncherProps} />
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-400">Camera Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map((name) => {
                    const body = cameraPresets.find(b => b && b.name === name);
                    if (!body) return null;
                    return (
                      <button
                        key={name}
                        onClick={() => onCameraPreset(name)}
                        className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Keyboard Shortcuts:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>1: Mercury</li>
                    <li>2: Venus</li>
                    <li>3: Earth</li>
                    <li>4: Mars</li>
                    <li>5: Jupiter</li>
                    <li>6: Saturn</li>
                    <li>7: Uranus</li>
                    <li>8: Neptune</li>
                    <li>9: Sun</li>
                    <li>0: Unlock camera</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Collapsed state - show icons only */}
      {!isExpanded && (
        <div className="py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setIsExpanded(true);
                setActiveTab(tab.id);
              }}
              className={`w-full p-2 hover:bg-gray-700 transition-colors ${
                activeTab === tab.id ? 'bg-gray-800' : ''
              }`}
              title={tab.label}
            >
              <span className="text-xl">{tab.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

