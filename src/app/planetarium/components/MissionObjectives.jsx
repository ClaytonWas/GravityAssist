'use client';

import { useState, useEffect } from 'react';

const MISSIONS = [
  {
    id: 'reach-mars',
    title: 'Reach Mars',
    description: 'Launch a probe from Earth and get it to orbit Mars',
    status: 'pending', // pending, in-progress, completed
    target: 'Mars'
  },
  {
    id: 'orbit-jupiter',
    title: 'Orbit Jupiter',
    description: 'Navigate a probe to orbit around Jupiter',
    status: 'pending',
    target: 'Jupiter'
  },
  {
    id: 'explore-venus',
    title: 'Explore Venus',
    description: 'Send a probe to study Venus',
    status: 'pending',
    target: 'Venus'
  },
  {
    id: 'outer-planets',
    title: 'Outer Planets Tour',
    description: 'Reach Saturn, Uranus, or Neptune',
    status: 'pending',
    target: 'Saturn'
  }
];

export default function MissionObjectives({ probes, bodies, missionsState, setMissionsState }) {
  const [missions, setMissions] = useState(() => {
    // Use lifted state if provided, otherwise use default
    if (missionsState) {
      return missionsState;
    }
    return MISSIONS;
  });

  // Sync local state with lifted state
  useEffect(() => {
    if (setMissionsState) {
      setMissionsState(missions);
    }
  }, [missions, setMissionsState]);

  // Check mission progress
  const checkMissions = () => {
    if (!probes || !bodies || probes.length === 0 || bodies.length === 0) return;
    
    setMissions(prevMissions => {
      return prevMissions.map(mission => {
        if (mission.status === 'completed') return mission;
        
        const targetBody = bodies.find(b => b && b.name === mission.target);
        if (!targetBody || !targetBody.position) return mission;
        
        // Check if any probe is near the target
        const probeNearTarget = probes.some(probe => {
          if (!probe || !probe.position) return false;
          const distance = Math.sqrt(
            Math.pow(probe.position.x - targetBody.position.x, 2) +
            Math.pow(probe.position.y - targetBody.position.y, 2) +
            Math.pow(probe.position.z - targetBody.position.z, 2)
          );
          return distance < 100; // Within 100 units
        });
        
        if (probeNearTarget && mission.status === 'pending') {
          return { ...mission, status: 'in-progress' };
        }
        
        // Check if probe is in orbit (close and moving)
        if (probeNearTarget && mission.status === 'in-progress') {
          return { ...mission, status: 'completed' };
        }
        
        return mission;
      });
    });
  };

  // Check missions periodically
  useEffect(() => {
    const interval = setInterval(checkMissions, 1000);
    return () => clearInterval(interval);
  }, [probes, bodies]);

  const completedCount = missions.filter(m => m.status === 'completed').length;
  const totalCount = missions.length;

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="text-base font-bold">
          Missions <span className="text-slate-400 font-normal text-sm">({completedCount}/{totalCount})</span>
        </h3>
      </div>
      
      <div className="space-y-2">
        {missions.map(mission => (
          <div 
            key={mission.id}
            className={`p-2.5 rounded-lg border touch-manipulation ${
              mission.status === 'completed' 
                ? 'border-green-500/50 bg-green-900/20' 
                : mission.status === 'in-progress'
                ? 'border-yellow-500/50 bg-yellow-900/20'
                : 'border-slate-700/50 bg-slate-800/30'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {mission.status === 'completed' && (
                  <span className="text-green-400 text-base">✓</span>
                )}
                {mission.status === 'in-progress' && (
                  <span className="text-yellow-400 text-base animate-pulse">⟳</span>
                )}
                {mission.status === 'pending' && (
                  <span className="text-slate-500 text-base">○</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs">{mission.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{mission.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
