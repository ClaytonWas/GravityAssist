'use client';

import { useState, useRef, useEffect } from 'react';
import { predictTrajectory } from '../core/physics';

export default function ProbeLauncher({ 
  earth, 
  allBodies, 
  timeScale, 
  onLaunchProbe,
  onUpdateTrajectory,
  probeLauncherState,
  setProbeLauncherState
}) {
  // Use lifted state if provided, otherwise use local state
  const [isLaunching, setIsLaunching] = useState(probeLauncherState?.isLaunching ?? false);
  const [launchVelocity, setLaunchVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [launchAngle, setLaunchAngle] = useState(probeLauncherState?.launchAngle ?? { azimuth: 0, elevation: 0 });
  const [speed, setSpeed] = useState(probeLauncherState?.speed ?? 0.01);
  const trajectoryRef = useRef(null);

  // Sync local state with lifted state
  useEffect(() => {
    if (setProbeLauncherState) {
      setProbeLauncherState({
        speed,
        launchAngle,
        isLaunching
      });
    }
  }, [speed, launchAngle, isLaunching, setProbeLauncherState]);

  // Calculate launch velocity from Earth's surface
  const calculateLaunchVelocity = () => {
    if (!earth) return { x: 0, y: 0, z: 0 };

    // Get Earth's velocity
    const earthVel = {
      x: earth.velocity.x,
      y: earth.velocity.y,
      z: earth.velocity.z
    };

    // Calculate direction vector from angles
    const azimuthRad = (launchAngle.azimuth * Math.PI) / 180;
    const elevationRad = (launchAngle.elevation * Math.PI) / 180;

    // Direction relative to Earth's position (tangential to orbit)
    const direction = {
      x: Math.cos(elevationRad) * Math.cos(azimuthRad),
      y: Math.sin(elevationRad),
      z: Math.cos(elevationRad) * Math.sin(azimuthRad)
    };

    // Add launch velocity to Earth's orbital velocity
    return {
      x: earthVel.x + direction.x * speed,
      y: earthVel.y + direction.y * speed,
      z: earthVel.z + direction.z * speed
    };
  };

  // Update trajectory prediction
  useEffect(() => {
    if (!earth || !isLaunching) {
      if (trajectoryRef.current) {
        onUpdateTrajectory(null);
        trajectoryRef.current = null;
      }
      return;
    }

    const velocity = calculateLaunchVelocity();
    const probe = {
      id: 'preview',
      mass: 0.001,  // Small but non-zero mass for physics calculations
      position: { ...earth.position },
      velocity: velocity
    };

    // Predict trajectory
    const trajectory = predictTrajectory(probe, allBodies, timeScale, 5000);
    trajectoryRef.current = trajectory;
    onUpdateTrajectory(trajectory);
  }, [launchAngle, speed, isLaunching, earth, allBodies, timeScale, onUpdateTrajectory]);

  const handleLaunch = () => {
    if (!earth) return;

    const velocity = calculateLaunchVelocity();
    const probe = {
      name: `Probe ${Date.now()}`,
      position: { ...earth.position },
      velocity: velocity,
      mass: 0.0001
    };

    onLaunchProbe(probe);
    setIsLaunching(false);
    // Don't reset sliders - keep user's settings
  };

  if (!earth) return null;

  return (
    <div className="w-full">
      <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Probe Launcher</h3>
      
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm mb-2">
            Launch Speed: {speed.toFixed(6)}
          </label>
          <input
            type="range"
            min="0.001"
            max="0.15"
            step="0.001"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-2 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm mb-2">
            Azimuth (degrees): {launchAngle.azimuth.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={launchAngle.azimuth}
            onChange={(e) => setLaunchAngle({ ...launchAngle, azimuth: parseFloat(e.target.value) })}
            className="w-full h-2 touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm mb-2">
            Elevation (degrees): {launchAngle.elevation.toFixed(1)}
          </label>
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            value={launchAngle.elevation}
            onChange={(e) => setLaunchAngle({ ...launchAngle, elevation: parseFloat(e.target.value) })}
            className="w-full h-2 touch-manipulation"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsLaunching(!isLaunching)}
            className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-2 rounded text-sm font-medium touch-manipulation active:scale-95 transition-transform ${
              isLaunching 
                ? 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800' 
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isLaunching ? 'Cancel' : 'Prepare Launch'}
          </button>
          
          {isLaunching && (
            <button
              onClick={handleLaunch}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 rounded bg-green-600 hover:bg-green-700 active:bg-green-800 text-sm font-medium touch-manipulation active:scale-95 transition-transform"
            >
              Launch Probe
            </button>
          )}
        </div>

        {isLaunching && (
          <div className="text-xs text-gray-400 mt-2">
            Preview trajectory is shown in orange. Adjust parameters to plan your mission.
          </div>
        )}
      </div>
    </div>
  );
}

