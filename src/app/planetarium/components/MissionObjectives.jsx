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

export default function MissionObjectives({ probes, bodies }) {
  const [missions, setMissions] = useState(MISSIONS);

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
      <div className="mb-4">
        <h3 className="text-lg font-bold">
          Missions ({completedCount}/{totalCount})
        </h3>
      </div>
      
      <div className="space-y-3">
        {missions.map(mission => (
          <div 
            key={mission.id}
            className={`p-3 rounded border-2 ${
              mission.status === 'completed' 
                ? 'border-green-500 bg-green-900 bg-opacity-30' 
                : mission.status === 'in-progress'
                ? 'border-yellow-500 bg-yellow-900 bg-opacity-30'
                : 'border-gray-600 bg-gray-800 bg-opacity-30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{mission.title}</h4>
                <p className="text-xs text-gray-300 mt-1">{mission.description}</p>
              </div>
              <div className="ml-2">
                {mission.status === 'completed' && (
                  <span className="text-green-400 text-xl">✓</span>
                )}
                {mission.status === 'in-progress' && (
                  <span className="text-yellow-400 text-xl animate-pulse">⟳</span>
                )}
                {mission.status === 'pending' && (
                  <span className="text-gray-400 text-xl">○</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
