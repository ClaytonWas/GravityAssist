'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Star, Planet } from '@/app/planetarium/HeavenlyBodies';
import { Probe } from '@/app/planetarium/core/Probe';
import PlanetLabels from '@/app/planetarium/components/PlanetLabels';
import UnifiedUI from '@/app/planetarium/components/UnifiedUI';
import PlanetInfoPanel from '@/app/planetarium/components/PlanetInfoPanel';
import { predictTrajectory, rk4Step } from '@/app/planetarium/core/physics';
import { SOLAR_SYSTEM_DATA, getInitialOrbitalData, getVisualRadius } from '@/app/planetarium/core/solarSystemData';
import { LEVELS } from '@/app/planetarium/core/levels';
import { PLANET_INFO } from '@/app/planetarium/core/planetInfo';
import ControlBar from '@/app/planetarium/components/ControlBar';
import HelpDialog from '@/app/planetarium/components/HelpDialog';
import LoadingScreen from '@/app/planetarium/components/LoadingScreen';
import WelcomeOverlay from '@/app/planetarium/components/WelcomeOverlay';
import ToastStack, { useToasts } from '@/app/planetarium/components/Toasts';
import { HoverLabelHost, FocusBadge } from '@/app/planetarium/components/SceneOverlays';
import { CloseIcon } from '@/app/planetarium/components/icons';

const WELCOME_STORAGE_KEY = 'gravity-assist:welcomed';

function createStarfield() {
  const texture = new THREE.TextureLoader().load("/planetarium/textures/White-Star.png");
  const NUM_STARS = 15000; // Reduced for better performance
  const vertices = [];
  const exclusionRange = 4500;

  let generated = 0;
  while (generated < NUM_STARS) {
    const x = THREE.MathUtils.randFloatSpread(20000);
    const y = THREE.MathUtils.randFloatSpread(20000);
    const z = THREE.MathUtils.randFloatSpread(20000);

    if (Math.abs(x) < exclusionRange && Math.abs(y) < exclusionRange && Math.abs(z) < exclusionRange) continue;

    vertices.push(x, y, z);
    generated++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.PointsMaterial({
    color: 0x888888,
    map: texture,
    transparent: true,
    size: 10,
    sizeAttenuation: true
  });

  return new THREE.Points(geometry, material);
}

// Smoothly interpolate orbit line positions towards target positions
function interpolateOrbitLines(orbitLines, targetPaths, interpolationAmount) {
  if (!orbitLines || !targetPaths) return;
  
  orbitLines.forEach((line, lineIndex) => {
    if (!line || !targetPaths[lineIndex]) return;
    
    const targetPath = targetPaths[lineIndex];
    const posAttr = line.geometry.getAttribute('position');
    if (!posAttr || posAttr.count !== targetPath.length) return;
    
    for (let i = 0; i < targetPath.length; i++) {
      const currentX = posAttr.getX(i);
      const currentY = posAttr.getY(i);
      const currentZ = posAttr.getZ(i);
      
      const targetX = targetPath[i].x;
      const targetY = targetPath[i].y;
      const targetZ = targetPath[i].z;
      
      // Lerp towards target
      const newX = currentX + (targetX - currentX) * interpolationAmount;
      const newY = currentY + (targetY - currentY) * interpolationAmount;
      const newZ = currentZ + (targetZ - currentZ) * interpolationAmount;
      
      posAttr.setXYZ(i, newX, newY, newZ);
    }
    posAttr.needsUpdate = true;
  });
}

function createOrbitLines(orbitLines, orbitPaths, bodies, scene, simulationMode = 'solarSystem') {
  // Planet colors with better visibility
  const planetColors = {
    'Mercury': 0xB5A7A7,
    'Venus': 0xE6C87A,
    'Earth': 0x6B93D6,
    'Mars': 0xC1440E,
    'Jupiter': 0xD8CA9D,
    'Saturn': 0xF4D59E,
    'Uranus': 0x4FD0E7,
    'Neptune': 0x4B70DD,
    'Sun': 0xFFD700,
    // Three body colors
    'Body1': 0xFF4444,
    'Body2': 0x44FF44,
    'Body3': 0x4444FF,
    // Outer Wilds colors
    'TimberHearth': 0x4A7C4E,
    'BrittleHollow': 0x8B6B9E,
    'GiantsDeep': 0x2E8B57,
    'AshTwin': 0xD2691E,
    'EmberTwin': 0xCD853F,
    'DarkBramble': 0x4F6F6F,
    'Interloper': 0xADD8E6
  };

  // Get non-Sun body names for color mapping
  const nonSunBodies = bodies.filter(b => b.name !== 'Sun');

  // Remove extra orbit lines if we have more lines than paths (e.g., switching from Solar System to Three Body)
  while (orbitLines.length > orbitPaths.length) {
    const line = orbitLines.pop();
    if (line) {
      scene.remove(line);
      line.geometry?.dispose();
      line.material?.dispose();
    }
  }

  orbitPaths.forEach((path, index) => {
    const bodyName = nonSunBodies[index]?.name || '';
    const color = planetColors[bodyName] || 0xFFFFFF;

    // Handle empty or too-small paths by hiding/removing the line
    if (!path || path.length < 2) {
      const existingLine = orbitLines[index];
      if (existingLine) {
        existingLine.visible = false;
      }
      return;
    }

    const points = [];
    path.forEach(pos => {
      points.push(pos.x, pos.y, pos.z);
    });

    // Check if existing line is valid (has geometry with position attribute)
    const existingLine = orbitLines[index];
    // A line is valid if it exists and has a geometry with position attribute
    // We trust that if it's in our array and has geometry, it's usable
    const lineIsValid = existingLine && 
                        existingLine.geometry && 
                        existingLine.geometry.getAttribute('position');
    
    if (lineIsValid) {
      // Ensure line is in the scene (it might have been removed)
      if (existingLine.parent !== scene) {
        scene.add(existingLine);
      }
      // Update existing line geometry in place
      const geometry = existingLine.geometry;
      const posAttr = geometry.getAttribute('position');
      
      // Check if we can update in place or need to recreate the buffer
      if (posAttr && posAttr.count === path.length) {
        // Same number of points - update in place (fast path)
        for (let i = 0; i < path.length; i++) {
          posAttr.setXYZ(i, path[i].x, path[i].y, path[i].z);
        }
        posAttr.needsUpdate = true;
      } else {
        // Different number of points - recreate buffer
        const newPosAttr = new THREE.Float32BufferAttribute(points, 3);
        geometry.setAttribute('position', newPosAttr);
        
        // Also update alpha attribute for gradient
        const alphas = new Float32Array(path.length);
        for (let i = 0; i < path.length; i++) {
          alphas[i] = 0.7 - (i / path.length) * 0.55;
        }
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      }
      
      // Update color in case body changed
      existingLine.material.color.setHex(color);
      existingLine.visible = true;
    } else {
      // Need to create a new line - first clean up any invalid existing line
      if (existingLine) {
        scene.remove(existingLine);
        if (existingLine.geometry) existingLine.geometry.dispose();
        if (existingLine.material) existingLine.material.dispose();
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

      // Create gradient opacity along the path (fades towards the end)
      const alphas = new Float32Array(path.length);
      for (let i = 0; i < path.length; i++) {
        // Fade from 0.7 at start to 0.15 at end
        alphas[i] = 0.7 - (i / path.length) * 0.55;
      }
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
      });

      const line = new THREE.Line(geometry, material);
      orbitLines[index] = line;
      scene.add(line);
    }
  });
  return orbitLines;
}

// Generate orbit path - uses circles for nearly-circular orbits, ellipses for eccentric ones
function generateOrbitPath(body, centralBody, G, numPoints = 120) {
  const points = [];
  
  // Position vector relative to central body
  const rx = body.position.x - centralBody.position.x;
  const ry = body.position.y - centralBody.position.y;
  const rz = body.position.z - centralBody.position.z;
  const r = Math.sqrt(rx * rx + ry * ry + rz * rz);
  if (r < 0.001) return points;
  
  // Velocity vector
  const vx = body.velocity?.x || 0;
  const vy = body.velocity?.y || 0;
  const vz = body.velocity?.z || 0;
  const v = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (v < 0.0001) return points;
  
  // Angular momentum vector: h = r × v
  const hx = ry * vz - rz * vy;
  const hy = rz * vx - rx * vz;
  const hz = rx * vy - ry * vx;
  const h = Math.sqrt(hx * hx + hy * hy + hz * hz);
  if (h < 1e-10) return points;
  
  // Standard gravitational parameter
  const mu = G * centralBody.mass;
  
  // Calculate circular orbit velocity at this radius: v_circ = sqrt(mu/r)
  const vCirc = Math.sqrt(mu / r);
  
  // Quick eccentricity estimate: compare actual velocity to circular velocity
  // For a circular orbit, v = vCirc. For elliptical, v differs.
  // Also check if velocity is mostly tangential (perpendicular to radius)
  const radialV = (rx * vx + ry * vy + rz * vz) / r; // velocity component along radius
  const tangentV = Math.sqrt(v * v - radialV * radialV); // velocity component perpendicular to radius
  
  // Eccentricity estimate based on velocity ratio and radial component
  const velocityRatio = v / vCirc;
  const radialRatio = Math.abs(radialV) / v;
  
  // If velocity is close to circular AND mostly tangential, use circle
  // This handles the Solar System case where orbits are designed to be circular
  const isNearlyCircular = (velocityRatio > 0.85 && velocityRatio < 1.15) && (radialRatio < 0.15);
  
  if (isNearlyCircular) {
    // Use simple circle at current radius
    return generateCirclePath(rx, ry, rz, r, vx, vy, vz, centralBody, numPoints);
  }
  
  // For non-circular orbits, calculate proper ellipse
  // Semi-latus rectum: p = h² / μ
  const p = (h * h) / mu;
  if (p < 0.001 || !isFinite(p)) {
    return generateCirclePath(rx, ry, rz, r, vx, vy, vz, centralBody, numPoints);
  }
  
  // Eccentricity from vis-viva: e² = 1 + (2 * ε * h²) / μ²
  // where ε = v²/2 - μ/r (specific orbital energy)
  const energy = (v * v) / 2 - mu / r;
  const eSq = 1 + (2 * energy * h * h) / (mu * mu);
  
  if (eSq < 0 || !isFinite(eSq)) {
    return generateCirclePath(rx, ry, rz, r, vx, vy, vz, centralBody, numPoints);
  }
  
  const e = Math.sqrt(Math.max(0, eSq));
  
  // For very high eccentricity or hyperbolic, fall back to circle
  if (e >= 0.95 || !isFinite(e)) {
    return generateCirclePath(rx, ry, rz, r, vx, vy, vz, centralBody, numPoints);
  }
  
  // Orbital plane normal
  const hNorm = { x: hx / h, y: hy / h, z: hz / h };
  
  // Find periapsis direction from eccentricity vector
  // e_vec = (v × h)/μ - r_hat
  const vCrossH_x = vy * hz - vz * hy;
  const vCrossH_y = vz * hx - vx * hz;
  const vCrossH_z = vx * hy - vy * hx;
  
  const ex = vCrossH_x / mu - rx / r;
  const ey = vCrossH_y / mu - ry / r;
  const ez = vCrossH_z / mu - rz / r;
  const eMag = Math.sqrt(ex * ex + ey * ey + ez * ez);
  
  let periDir;
  if (eMag > 0.01) {
    periDir = { x: ex / eMag, y: ey / eMag, z: ez / eMag };
  } else {
    // Nearly circular - use current position
    periDir = { x: rx / r, y: ry / r, z: rz / r };
  }
  
  // Perpendicular direction in orbital plane: q = h × peri
  const qDir = {
    x: hNorm.y * periDir.z - hNorm.z * periDir.y,
    y: hNorm.z * periDir.x - hNorm.x * periDir.z,
    z: hNorm.x * periDir.y - hNorm.y * periDir.x
  };
  
  // Generate ellipse: r(θ) = p / (1 + e*cos(θ))
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    
    const rTheta = p / (1 + e * cosTheta);
    if (!isFinite(rTheta) || rTheta < 0) continue;
    
    const orbitX = rTheta * cosTheta;
    const orbitY = rTheta * sinTheta;
    
    points.push({
      x: centralBody.position.x + orbitX * periDir.x + orbitY * qDir.x,
      y: centralBody.position.y + orbitX * periDir.y + orbitY * qDir.y,
      z: centralBody.position.z + orbitX * periDir.z + orbitY * qDir.z
    });
  }
  
  return points;
}

// Generate a simple circle in the orbital plane
function generateCirclePath(rx, ry, rz, r, vx, vy, vz, centralBody, numPoints) {
  const points = [];
  
  // Angular momentum for orbital plane
  const hx = ry * vz - rz * vy;
  const hy = rz * vx - rx * vz;
  const hz = rx * vy - ry * vx;
  const h = Math.sqrt(hx * hx + hy * hy + hz * hz);
  
  let nx, ny, nz;
  if (h > 0.001) {
    nx = hx / h; ny = hy / h; nz = hz / h;
  } else {
    nx = 0; ny = 1; nz = 0;
  }
  
  // Create basis vectors in orbital plane
  let ux, uy, uz;
  if (Math.abs(ny) < 0.9) {
    ux = nz; uy = 0; uz = -nx;
  } else {
    ux = 0; uy = -nz; uz = ny;
  }
  const uMag = Math.sqrt(ux * ux + uy * uy + uz * uz);
  if (uMag > 0.001) {
    ux /= uMag; uy /= uMag; uz /= uMag;
  }
  
  const vvx = ny * uz - nz * uy;
  const vvy = nz * ux - nx * uz;
  const vvz = nx * uy - ny * ux;
  
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    points.push({
      x: centralBody.position.x + r * (cosA * ux + sinA * vvx),
      y: centralBody.position.y + r * (cosA * uy + sinA * vvy),
      z: centralBody.position.z + r * (cosA * uz + sinA * vvz)
    });
  }
  
  return points;
}

function createTrajectoryLine(trajectory, scene, color = 0xC6A44A) {
  if (!trajectory || trajectory.length < 2) return null;

  const points = [];
  trajectory.forEach(pos => {
    points.push(pos.x, pos.y, pos.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

  const material = new THREE.LineDashedMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
    dashSize: 5,
    gapSize: 3
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances(); // Required for dashed lines - must be called on the Line object
  scene.add(line);
  return line;
}

function createSolarFlare(flareGroup, sunPosition, sunRadius) {
  // Clear any existing flares
  clearSolarFlares(flareGroup);
  
  // Create 3-6 random solar flares
  const numFlares = 3 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < numFlares; i++) {
    // Random direction from sun surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const direction = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    );
    
    // Start from sun surface
    const startPosition = sunPosition.clone().add(direction.clone().multiplyScalar(sunRadius * 1.1));
    
    // Flare length varies
    const flareLength = sunRadius * (0.3 + Math.random() * 0.5);
    const endPosition = startPosition.clone().add(direction.clone().multiplyScalar(flareLength));
    
    // Create flare geometry (elongated cone/sphere)
    const flareGeometry = new THREE.ConeGeometry(
      sunRadius * 0.05,
      flareLength,
      8,
      1,
      true
    );
    
    // Bright orange/yellow material
    const flareMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.1, 1.0, 0.6 + Math.random() * 0.2),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const flareMesh = new THREE.Mesh(flareGeometry, flareMaterial);
    
    // Position and orient flare
    flareMesh.position.copy(startPosition);
    flareMesh.lookAt(endPosition);
    flareMesh.rotateX(Math.PI / 2);
    
    // Store animation data
    flareMesh.userData.direction = direction;
    flareMesh.userData.startPos = startPosition.clone();
    flareMesh.userData.length = flareLength;
    flareMesh.userData.speed = 0.5 + Math.random() * 0.5;
    flareMesh.userData.opacity = 0.8;
    
    flareGroup.add(flareMesh);
  }
}

function animateSolarFlares(flareGroup, time) {
  flareGroup.children.forEach((flare) => {
    // Expand and fade out over 4 seconds
    const progress = Math.min(time / 4.0, 1.0);
    const scale = 1.0 + progress * 2.5;
    flare.scale.set(scale, scale, scale);
    
    // Fade out with easing
    const fadeProgress = 1.0 - Math.pow(1.0 - progress, 2); // Ease out
    flare.material.opacity = flare.userData.opacity * (1.0 - fadeProgress);
    
    // Move outward slightly
    const offset = flare.userData.direction.clone().multiplyScalar(
      flare.userData.length * progress * 0.4
    );
    flare.position.copy(flare.userData.startPos).add(offset);
  });
}

function clearSolarFlares(flareGroup) {
  while (flareGroup.children.length > 0) {
    const flare = flareGroup.children[0];
    flare.geometry.dispose();
    flare.material.dispose();
    flareGroup.remove(flare);
  }
}

function DebugRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-dim">{label}</span>
      <span className="text-fg-soft">{children}</span>
    </div>
  );
}

const PlanetariumScene = () => {
  const mountRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing');
  const [loadProgress, setLoadProgress] = useState(0);
  const [timeScale, setTimeScale] = useState(1000); // Default speed
  const MIN_TIME_SCALE = 100;
  const MAX_TIME_SCALE = 15000;
  const TIME_SCALE_STEP = 100;
  const [isPaused, setIsPaused] = useState(false);
  const [selectedBody, setSelectedBody] = useState(null);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320); // Default width: 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  const compositionChartRef = useRef(null);
  
  // Hydration guard - only render full UI on client
  useEffect(() => {
    setIsClient(true);
    // The controls panel covers most of a phone screen, so start it collapsed there.
    if (window.innerWidth < 640) setIsControlsOpen(false);
    // First-time visitors get a short orientation card; everyone else goes straight in.
    try {
      if (!window.localStorage.getItem(WELCOME_STORAGE_KEY)) setShowWelcome(true);
    } catch {
      // localStorage can be unavailable (private mode); silently skip the intro.
    }
  }, []);

  const [hoveredCompositionId, setHoveredCompositionId] = useState(null);
  const [compositionTab, setCompositionTab] = useState('atmosphere'); // 'atmosphere' or 'core'
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const pushToastRef = useRef(pushToast);
  const hoverApiRef = useRef(null);
  const isHelpOpenRef = useRef(false);
  const isInfoVisibleRef = useRef(false);

  useEffect(() => {
    pushToastRef.current = pushToast;
  }, [pushToast]);

  // Mirrors for the keyboard handler, which lives outside the React render cycle.
  useEffect(() => {
    isHelpOpenRef.current = isHelpOpen;
  }, [isHelpOpen]);

  useEffect(() => {
    isInfoVisibleRef.current = isInfoVisible;
  }, [isInfoVisible]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, '1');
    } catch {
      // Nothing to persist to - the intro simply reappears next visit.
    }
  }, []);
  const [showOrbits, setShowOrbits] = useState(true);
  const [currentLevelId, setCurrentLevelId] = useState('SOLAR_SYSTEM');
  const [debugMode, setDebugMode] = useState(false);
  const [debugStats, setDebugStats] = useState({ fps: 0, bodies: 0, probes: 0, meshes: 0, memory: 0 });
  const fpsFramesRef = useRef([]);
  const lastFpsUpdateRef = useRef(0);
  
  const currentLevel = LEVELS[currentLevelId] || LEVELS.SOLAR_SYSTEM;
  const simulationMode = currentLevel.simulationType || 'solarSystem';
  
  const [showLabels, setShowLabels] = useState(true);
  const [cameraTargetName, setCameraTargetName] = useState(null);
  const [unlitBodies, setUnlitBodies] = useState(new Set()); // Track which bodies have lighting disabled
  const showOrbitsRef = useRef(showOrbits);

  const timeScaleRef = useRef(timeScale);
  const isPausedRef = useRef(isPaused);
  const orbitLinesRef = useRef([]);
  const bodiesRef = useRef([]);
  const probesRef = useRef([]);
  const bodyMeshesRef = useRef([]);
  const probeMeshesRef = useRef([]);
  const trajectoryLineRef = useRef(null);
  const probeTrajectoryLinesRef = useRef(new Map()); // Map of probe ID to trajectory line
  const probeTrajectoryPointsRef = useRef(new Map()); // Map of probe ID to trajectory points array
  const probePausedTimeRef = useRef(new Map()); // Map of probe ID to accumulated paused time in ms
  const probePauseStartRef = useRef(new Map()); // Map of probe ID to pause start timestamp
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const physicsWorkerRef = useRef(null);
  const orbitPathRecalculateCounterRef = useRef(0);
  const cameraTargetNameRef = useRef(null);
  const setCameraTargetNameRef = useRef(null);
  const labelsRef = useRef([]);
  const planetRingsRef = useRef([]); // Store rings separately so they orbit independently
  const binaryPartnerMeshesRef = useRef(new Map()); // Map of partner mesh to parent body name (e.g., EmberTwin mesh -> 'AshTwin')
  const orbitCalculationPendingRef = useRef(false); // Prevent overlapping orbit calculations
  // Orbit interpolation refs for smooth transitions
  const orbitTargetPathsRef = useRef([]); // Target orbit positions to interpolate towards
  const orbitInterpolationRef = useRef(1); // 0-1 progress of interpolation (1 = complete)
  const orbitCenterRef = useRef({ x: 0, y: 0, z: 0 }); // Store center position when orbits were calculated
  // Orbit update intervals - real-time for chaotic, less frequent for stable
  const ORBIT_PATH_RECALC_INTERVAL_CHAOTIC = 2; // Every 2 frames (~33ms) for chaotic - near real-time
  const ORBIT_PATH_RECALC_INTERVAL_STABLE_BASE = 30; // Base interval for stable orbits, scales with time
  const ORBIT_INTERPOLATION_SPEED_CHAOTIC = 0.5; // Fast blend for chaotic (50% per frame)
  const ORBIT_INTERPOLATION_SPEED_STABLE = 0.15; // Slower blend for stable orbits
  const frameTimeRef = useRef(0); // Track actual frame time for accurate performance monitoring
  const TRAJECTORY_UPDATE_INTERVAL = 10; // Update trajectory lines every N frames
  const trajectoryUpdateCounterRef = useRef(0);

  // Find Earth
  const getEarth = useCallback(() => {
    return bodiesRef.current.find(body => body.name === 'Earth');
  }, []);

  // Launch probe
  const handleLaunchProbe = useCallback((probeData) => {
    const earth = getEarth();
    if (!earth || !sceneRef.current) {
      console.warn('Cannot launch probe: Earth or scene not found');
      return;
    }

    // Human-readable, stable names: Probe 1, Probe 2, ... rather than a timestamp.
    const probeName = probeData.name || `Probe ${probesRef.current.length + 1}`;

    const probe = new Probe(
      probeName,
      { x: earth.position.x, y: earth.position.y, z: earth.position.z },
      probeData.velocity,
      probeData.mass || 0.001  // Ensure probe has a reasonable mass
    );

    probesRef.current.push(probe);

    // Add probe mesh - make it visible and larger with better visualization
    const geometry = new THREE.SphereGeometry(1.0, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x7FB37E,
      emissive: 0x7FB37E,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(probe.position.x, probe.position.y, probe.position.z);
    mesh.userData.probeId = probe.id; // Store probe ID for easy lookup
    mesh.userData.isProbe = true;
    
    // Add glow effect with a larger outer sphere
    const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x7FB37E,
      transparent: true,
      opacity: 0.2
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(mesh.position);
    glowMesh.userData.probeId = probe.id;
    glowMesh.userData.isGlow = true;
    
    sceneRef.current.add(mesh);
    sceneRef.current.add(glowMesh);
    probeMeshesRef.current.push(mesh);
    probeMeshesRef.current.push(glowMesh);

    // Initialize trajectory tracking for this probe
    probeTrajectoryPointsRef.current.set(probe.id, [{
      x: probe.position.x,
      y: probe.position.y,
      z: probe.position.z
    }]);

    // Create trajectory line for this probe
    const trajectoryLine = createTrajectoryLine(
      probeTrajectoryPointsRef.current.get(probe.id),
      sceneRef.current,
      0x7FB37E // Muted green for launched probes
    );
    if (trajectoryLine) {
      probeTrajectoryLinesRef.current.set(probe.id, trajectoryLine);
    }

    // Add to physics worker - CRITICAL: this makes the probe part of the simulation
    // The probe will now be included in ALL force calculations with ALL other bodies
    if (physicsWorkerRef.current) {
      const serialized = probe.toSerializable();
      
      physicsWorkerRef.current.postMessage({
        type: 'addBody',
        data: {
          body: serialized
        }
      });
    }

    // Velocities are stored in units of ~1000 km/s (Earth's 29.8 km/s is 0.0298).
    const speedKmPerSec = Math.hypot(probe.velocity.x, probe.velocity.y, probe.velocity.z) * 1000;
    pushToastRef.current?.(`${probeName} launched`, {
      tone: 'success',
      detail: `${speedKmPerSec.toFixed(1)} km/s · trailing a green track`
    });
  }, [getEarth]);

  // Update trajectory preview
  const handleUpdateTrajectory = useCallback((trajectory) => {
    if (trajectoryLineRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current.geometry.dispose();
      trajectoryLineRef.current.material.dispose();
      trajectoryLineRef.current = null;
    }

    if (trajectory) {
      trajectoryLineRef.current = createTrajectoryLine(trajectory, sceneRef.current);
    }
  }, []);

  useEffect(() => {
    // Don't initialize until client-side and mount is ready
    if (!isClient || !mountRef.current) return;
    
    // Track if component is mounted for safe state updates
    let isMounted = true;
    
    // Safe state setters
    const safeSetLoadingStatus = (status) => {
      if (isMounted) setLoadingStatus(status);
    };
    const safeSetIsLoading = (loading) => {
      if (isMounted) setIsLoading(loading);
    };
    // Progress only ever moves forward, so a late texture callback can't rewind the bar.
    let reportedProgress = 0;
    const safeSetProgress = (value) => {
      if (!isMounted || value <= reportedProgress) return;
      reportedProgress = value;
      setLoadProgress(value);
    };
    
    // Start loading
    safeSetIsLoading(true);
    setLoadProgress(0);
    safeSetLoadingStatus('Creating physics engine');
    safeSetProgress(5);
    
    // Create physics worker
    let physicsWorker = null;
    if (typeof Worker !== 'undefined') {
      try {
        physicsWorker = new Worker('/physicsWorker.js?v=' + Date.now());
        
        // Pre-build lookup map for O(1) body access (rebuilt when bodies change)
        let bodyMap = new Map();
        let probeMap = new Map();
        
        const rebuildMaps = () => {
          bodyMap.clear();
          probeMap.clear();
          bodiesRef.current.forEach(b => bodyMap.set(b.id, b));
          probesRef.current.forEach(p => probeMap.set(p.id, p));
        };
        
        physicsWorker.onmessage = (e) => {
          const { type, bodies: updatedBodies, bodyCount } = e.data;
          
          if (type === 'update') {
            // Rebuild maps if counts don't match (bodies added/removed)
            if (bodyMap.size !== bodiesRef.current.length || probeMap.size !== probesRef.current.length) {
              rebuildMaps();
            }
            
            const count = bodyCount || updatedBodies.length;
            for (let i = 0; i < count; i++) {
              const updatedBody = updatedBodies[i];
              const body = bodyMap.get(updatedBody.id);
              if (body && body.position) {
                body.position.set(updatedBody.position.x, updatedBody.position.y, updatedBody.position.z);
                body.velocity.set(updatedBody.velocity.x, updatedBody.velocity.y, updatedBody.velocity.z);
              } else {
                const probe = probeMap.get(updatedBody.id);
                if (probe && probe.position) {
                  probe.position.set(updatedBody.position.x, updatedBody.position.y, updatedBody.position.z);
                  probe.velocity.set(updatedBody.velocity.x, updatedBody.velocity.y, updatedBody.velocity.z);
                }
              }
            }
          }
        };
        
        physicsWorkerRef.current = physicsWorker;
      } catch (error) {
        console.warn('Web Worker not available:', error);
      }
    }
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
    cameraRef.current = camera;
    let cameraTarget = null;
    let followTargetOnce = false;
    let userZooming = false;
    let zoomTimeout = null;
    
    // Create loading manager to track texture loading progress
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (url, loaded, total) => {
      // Textures occupy the 15-85% band of the bar.
      safeSetLoadingStatus('Loading planet textures');
      safeSetProgress(15 + Math.round((loaded / Math.max(1, total)) * 70));
    };
    loadingManager.onLoad = () => {
      safeSetProgress(85);
    };
    
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const clock = new THREE.Clock();
    
    safeSetLoadingStatus('Setting up renderer');
    safeSetProgress(12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    
    // Enable realistic shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Improve lighting quality with tone mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Standard exposure
    
    // Use physically based lighting - MeshStandardMaterial works better with this
    // Try legacy lights - might work better with our setup
    // With legacy lights, intensity values are more straightforward
    renderer.useLegacyLights = true;
    
    // Ensure lights are properly enabled
    renderer.shadowMap.enabled = true;
    
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08; // Increased for smoother damping
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 50000; // Increased for larger levels like Outer Wilds
    controls.maxPolarAngle = Math.PI / 2;
    controls.rotateSpeed = 0.8; // Slightly slower rotation for smoother feel
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.5;
    
    // Track user zoom to stop automatic distance adjustment
    const onCameraZoom = () => {
      userZooming = true;
      // Stop automatic distance adjustment when user zooms
      followTargetOnce = false;
      
      // Clear zoom flag after 1 second of no zoom
      if (zoomTimeout) clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        userZooming = false;
      }, 1000);
    };
    
    renderer.domElement.addEventListener('wheel', onCameraZoom);

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    // Everything the pointer is allowed to hit: body LOD children, binary
    // partners (e.g. Ember Twin) and probe meshes.
    const collectPickables = () => {
      const pickables = [];
      bodyMeshesRef.current.forEach(lod => {
        lod.traverse(child => {
          if (child.isMesh) {
            child.userData.parentLOD = lod;
            pickables.push(child);
          }
        });
      });
      binaryPartnerMeshesRef.current.forEach((parentBodyName, partnerMesh) => {
        pickables.push(partnerMesh);
      });
      probeMeshesRef.current.forEach(mesh => pickables.push(mesh));
      return pickables;
    };

    const meshAtPointer = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const intersects = raycaster.intersectObjects(collectPickables());
      return intersects.length > 0 ? intersects[0].object : null;
    };

    // Map a picked mesh back to the thing the UI cares about.
    const resolvePick = (mesh) => {
      if (!mesh) return null;

      if (binaryPartnerMeshesRef.current.has(mesh)) {
        const parentBodyName = binaryPartnerMeshesRef.current.get(mesh);
        const parentBody = bodiesRef.current.find(b => b.name === parentBodyName);
        if (!parentBody?.binaryPartner) return null;
        return {
          kind: 'body',
          name: parentBody.binaryPartner.name,
          body: {
            name: parentBody.binaryPartner.name,
            position: { ...mesh.position },
            radius: parentBody.binaryPartner.radius,
            isBinaryPartner: true,
            parentBody: parentBodyName
          }
        };
      }

      if (mesh.userData.parentLOD) {
        const lodIndex = bodyMeshesRef.current.indexOf(mesh.userData.parentLOD);
        if (lodIndex !== -1) {
          const body = bodiesRef.current[lodIndex];
          if (body) return { kind: 'body', name: body.name, body };
        }
      }

      const bodyIndex = bodyMeshesRef.current.indexOf(mesh);
      if (bodyIndex !== -1) {
        const body = bodiesRef.current[bodyIndex];
        if (body) return { kind: 'body', name: body.name, body };
      }

      if (mesh.userData?.probeId) {
        const probe = probesRef.current.find(p => p.id === mesh.userData.probeId);
        if (probe) return { kind: 'probe', name: probe.name, body: probe };
      }

      return null;
    };

    // --- Pointer handling -------------------------------------------------
    // A click only selects when the pointer barely moved; otherwise the press
    // was an orbit drag and releasing over a planet should not hijack the view.
    const DRAG_SLOP_PX = 6;
    const HOVER_THROTTLE_MS = 60;
    let pressOrigin = null;
    let lastHoverCheck = 0;
    let hoveredName = null;

    const setCursor = (cursor) => {
      if (renderer.domElement.style.cursor !== cursor) {
        renderer.domElement.style.cursor = cursor;
      }
    };

    const clearHover = () => {
      if (hoveredName !== null) {
        hoveredName = null;
        hoverApiRef.current?.(null);
      }
    };

    const onPointerDown = (event) => {
      if (event.button !== 0) {
        pressOrigin = null;
        return;
      }
      pressOrigin = { x: event.clientX, y: event.clientY, id: event.pointerId };
      clearHover();
      setCursor('grabbing');
    };

    const onPointerUp = (event) => {
      const origin = pressOrigin;
      pressOrigin = null;
      setCursor('grab');
      if (!origin || origin.id !== event.pointerId) return;

      const travelled = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (travelled > DRAG_SLOP_PX) return; // camera drag, not a selection

      const pick = resolvePick(meshAtPointer(event.clientX, event.clientY));
      if (pick) {
        setSelectedBody(pick.body);
        setIsInfoVisible(true);
      }
    };

    const onPointerMove = (event) => {
      if (event.pointerType === 'touch') return; // no hover affordance on touch
      if (pressOrigin) return; // mid-drag

      const now = performance.now();
      if (now - lastHoverCheck < HOVER_THROTTLE_MS) return;
      lastHoverCheck = now;

      const pick = resolvePick(meshAtPointer(event.clientX, event.clientY));
      if (!pick) {
        setCursor('grab');
        clearHover();
        return;
      }

      hoveredName = pick.name;
      setCursor('pointer');
      hoverApiRef.current?.({
        name: pick.name,
        subtitle: pick.kind === 'probe' ? 'Probe' : PLANET_INFO[pick.name]?.type,
        x: event.clientX,
        y: event.clientY
      });
    };

    const onPointerLeave = () => {
      pressOrigin = null;
      clearHover();
      setCursor('grab');
    };

    setCursor('grab');
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('pointercancel', onPointerLeave);
    scene.add(createStarfield());

    // Initialize bodies based on current level
    const level = LEVELS[currentLevelId] || LEVELS.SOLAR_SYSTEM;
    
    // Set appropriate time scale for the level
    if (level.defaultTimeScale) {
      setTimeScale(level.defaultTimeScale);
      timeScaleRef.current = level.defaultTimeScale;
    }

    let initialBodies = [];

    if (level.id === 'SOLAR_SYSTEM') {
      const sunData = SOLAR_SYSTEM_DATA.Sun;
      const sun = new Star(
        'Sun',
        getVisualRadius('Sun'),
        sunData.mass,
        sunData.sidereelTime,
        1000,
        sunData.position,
        sunData.velocity
      );

      const planets = [
        'Mercury',
        'Venus',
        'Earth',
        'Mars',
        'Jupiter',
        'Saturn',
        'Uranus',
        'Neptune'
      ].map(planetName => {
        const data = SOLAR_SYSTEM_DATA[planetName];
        const orbital = getInitialOrbitalData(planetName);
        
        const planetRadius = getVisualRadius(planetName);
        let spectatingDistance;
        if (planetName === 'Jupiter' || planetName === 'Saturn') {
          spectatingDistance = 100;
        } else if (planetName === 'Uranus' || planetName === 'Neptune') {
          spectatingDistance = Math.max(50, planetRadius * 3);
        } else {
          spectatingDistance = Math.max(5, planetRadius * 3);
        }
        
        return new Planet(
          planetName,
          planetRadius,
          data.mass,
          data.sidereelTime,
          spectatingDistance,
          orbital.position,
          orbital.velocity
        );
      });

      initialBodies = [sun, ...planets];
    } else {
      // Generic level loading (Three Body, etc.)
      initialBodies = Object.entries(level.bodies).map(([name, data]) => {
        const body = new Star(
          name,
          data.radius,
          data.mass,
          0,
          20,
          data.position,
          data.velocity
        );
        // Copy custom properties for special effects (binary systems, etc.)
        if (data.isBinarySystem) {
          body.isBinarySystem = data.isBinarySystem;
          body.binaryPartner = data.binaryPartner;
          body.binarySeparation = data.binarySeparation;
          body.binaryPeriod = data.binaryPeriod;
        }
        return body;
      });

    }

    // Add IDs to bodies
    initialBodies.forEach((body, index) => {
      body.id = `body_${index}_${body.name}`;
    });

    bodiesRef.current = initialBodies;

    // Ambient light - provides base illumination so distant planets aren't pitch black
    // Brighter for three-body level since there's no dominant light source
    const ambientIntensity = level.id === 'SOLAR_SYSTEM' ? 0.25 : 1.0;
    const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
    scene.add(ambientLight);

    // Create PointLight at the sun - emits light in all directions
    // decay = 0 disables realistic inverse-square falloff so distant planets are visible
    // In reality, outer planets receive much less light, but for visualization we need them visible
    const sunLight = new THREE.PointLight(0xfff4e6, 3.0, 0, 0); // intensity 3, distance 0 (infinite), decay 0
    sunLight.castShadow = true;
    
    // Shadow settings
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 100000;
    sunLight.shadow.radius = 8;
    sunLight.shadow.bias = -0.0001;
    
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Add hemisphere light for subtle fill lighting (simulates light bouncing off space dust)
    // This helps distant planets have some definition on their dark side
    if (level.id === 'SOLAR_SYSTEM') {
      const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x080820, 0.15);
      scene.add(hemiLight);
    }

    // Create solar flares group
    const solarFlaresGroup = new THREE.Group();
    scene.add(solarFlaresGroup);
    let solarFlareTime = 0;
    let solarFlareActive = false;
    let lastSolarFlareCheck = 0;
    
    safeSetLoadingStatus('Loading celestial bodies...');

    // LOD distance thresholds based on body radius
    const getLODDistances = (radius) => ({
      high: radius * 10,    // Full detail when close
      medium: radius * 50,  // Medium detail
      low: radius * 200     // Low detail when far
    });

    const bodyMeshes = initialBodies.map((body) => {
      // Create LOD object for this body
      const lod = new THREE.LOD();
      
      // High detail geometry (64x32 segments)
      const highGeometry = new THREE.SphereGeometry(body.radius, 64, 32);
      // Medium detail geometry (32x16 segments)
      const medGeometry = new THREE.SphereGeometry(body.radius, 32, 16);
      // Low detail geometry (16x8 segments)
      const lowGeometry = new THREE.SphereGeometry(body.radius, 16, 8);
      
      let material;
      
      if (body.name === 'Sun' && simulationMode === 'solarSystem') {
        // Use sun texture with animated plasma shader
        const sunTexture = textureLoader.load('/planetarium/textures/Sun.jpg');
        sunTexture.wrapS = THREE.RepeatWrapping;
        sunTexture.wrapT = THREE.RepeatWrapping;
        
        // Plasma shader vertex
        const sunVertexShader = `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        
        // Plasma shader fragment with animated texture
        const sunFragmentShader = `
          uniform sampler2D sunTexture;
          uniform float time;
          uniform float radius;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          // Simple noise function for plasma distortion
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          // Smooth noise
          float smoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = noise(i);
            float b = noise(i + vec2(1.0, 0.0));
            float c = noise(i + vec2(0.0, 1.0));
            float d = noise(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          
          // Fractal noise for plasma effect
          float fractalNoise(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            
            for (int i = 0; i < 4; i++) {
              value += amplitude * smoothNoise(p * frequency);
              frequency *= 2.0;
              amplitude *= 0.5;
            }
            
            return value;
          }
          
          void main() {
            // Create flowing plasma distortion
            vec2 uv = vUv;
            
            // Animated distortion based on position and time
            vec2 distortion = vec2(
              fractalNoise(uv * 3.0 + vec2(time * 0.3, time * 0.2)),
              fractalNoise(uv * 3.0 + vec2(time * 0.2, time * 0.3))
            );
            
            // Rotating swirl effect
            vec2 center = vec2(0.5, 0.5);
            vec2 toCenter = uv - center;
            float angle = atan(toCenter.y, toCenter.x);
            float dist = length(toCenter);
            
            // Add rotating distortion
            float swirl = sin(angle * 3.0 + time * 0.5 + dist * 5.0) * 0.02;
            distortion += vec2(cos(angle + time * 0.3), sin(angle + time * 0.3)) * swirl;
            
            // Apply distortion to UV coordinates
            vec2 distortedUV = uv + distortion * 0.1;
            
            // Sample texture with animated UV
            vec4 texColor = texture2D(sunTexture, distortedUV);
            
            // Add radial plasma waves
            float radialDist = length(toCenter);
            float plasmaWave = sin(radialDist * 8.0 - time * 2.0) * 0.1 + 0.9;
            
            // Enhance plasma effect with color variation
            vec3 plasmaColor = vec3(1.0, 0.8, 0.4);
            vec3 hotColor = vec3(1.0, 0.5, 0.1);
            
            // Mix colors based on noise and position
            float colorMix = fractalNoise(uv * 2.0 + vec2(time * 0.4, time * 0.3));
            vec3 finalColor = mix(plasmaColor, hotColor, colorMix * 0.3);
            
            // Combine texture with plasma effect
            vec3 color = texColor.rgb * finalColor * plasmaWave;
            
            // Add emissive glow that varies - much brighter base value
            float emissiveIntensity = 1.5 + sin(time * 0.5) * 0.15 + sin(time * 1.3) * 0.05;
            color *= emissiveIntensity;
            
            // Add edge glow
            float edgeGlow = 1.0 + smoothstep(0.7, 1.0, radialDist) * 0.5;
            color *= edgeGlow;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `;
        
        material = new THREE.ShaderMaterial({
          uniforms: {
            sunTexture: { value: sunTexture },
            time: { value: 0 },
            radius: { value: body.radius }
          },
          vertexShader: sunVertexShader,
          fragmentShader: sunFragmentShader,
          side: THREE.DoubleSide
        });
        
      } else if (currentLevelId !== 'SOLAR_SYSTEM') {
        // Generic bodies for other levels
        const level = LEVELS[currentLevelId];
        const bodyData = level.bodies[body.name];
        const color = bodyData?.color || 0xFFFFFF;
        
        material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.5,
          roughness: 0.5,
          metalness: 0.5
        });
      } else if (body.name === 'Earth' && simulationMode === 'solarSystem') {
        // Earth with day texture, night lights, clouds, and specular highlights
        const earthDayTexture = textureLoader.load('/planetarium/textures/Earth.jpg');
        const earthNightTexture = textureLoader.load('/planetarium/textures/2k_earth_nightmap.jpg');
        const earthCloudsTexture = textureLoader.load('/planetarium/textures/2k_earth_clouds.jpg');
        
        // Set cloud texture to repeat so it loops seamlessly
        earthCloudsTexture.wrapS = THREE.RepeatWrapping;
        earthCloudsTexture.wrapT = THREE.RepeatWrapping;
        
        // Earth shader for day/night transition with city lights
        const earthVertexShader = `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          varying vec3 vViewPosition;
          
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        
        const earthFragmentShader = `
          uniform sampler2D dayTexture;
          uniform sampler2D nightTexture;
          uniform sampler2D cloudsTexture;
          uniform vec3 sunPosition;
          uniform float time;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          varying vec3 vViewPosition;
          
          void main() {
            // Calculate sun direction in world space
            vec3 sunDir = normalize(sunPosition - vWorldPosition);
            
            // Day/night factor based on sun angle (use world normal for correct sun-relative lighting)
            float sunDot = dot(vWorldNormal, sunDir);
            float dayFactor = smoothstep(-0.1, 0.3, sunDot);
            
            // Sample textures
            vec3 dayColor = texture2D(dayTexture, vUv).rgb;
            vec3 nightColor = texture2D(nightTexture, vUv).rgb;
            float clouds = texture2D(cloudsTexture, vUv + vec2(time * 0.001, 0.0)).r;
            
            // City lights glow brighter on the night side
            vec3 nightLights = nightColor * 2.5;
            
            // Blend day and night based on sun position
            vec3 surfaceColor = mix(nightLights, dayColor, dayFactor);
            
            // Add clouds (more visible on day side, subtle glow on night side)
            float cloudDayBrightness = clouds * dayFactor * 0.8;
            float cloudNightBrightness = clouds * (1.0 - dayFactor) * 0.1;
            surfaceColor += vec3(cloudDayBrightness + cloudNightBrightness);
            
            // Specular highlight for oceans (approximate based on blue channel being high)
            float specular = 0.0;
            if (dayFactor > 0.1) {
              vec3 viewDirWorld = normalize(cameraPosition - vWorldPosition);
              vec3 reflectDir = reflect(-sunDir, vWorldNormal);
              float oceanMask = smoothstep(0.3, 0.6, dayColor.b - dayColor.r * 0.5);
              specular = pow(max(dot(viewDirWorld, reflectDir), 0.0), 32.0) * oceanMask * 0.5;
            }
            
            // Atmospheric rim lighting (this one can stay view-relative for camera edge effect)
            vec3 viewDir = normalize(-vViewPosition);
            float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
            rim = pow(rim, 3.0);
            vec3 rimColor = vec3(0.4, 0.6, 1.0) * rim * 0.3 * max(dayFactor, 0.2);
            
            vec3 finalColor = surfaceColor + vec3(specular) + rimColor;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `;
        
        material = new THREE.ShaderMaterial({
          uniforms: {
            dayTexture: { value: earthDayTexture },
            nightTexture: { value: earthNightTexture },
            cloudsTexture: { value: earthCloudsTexture },
            sunPosition: { value: new THREE.Vector3(0, 0, 0) },
            time: { value: 0 }
          },
          vertexShader: earthVertexShader,
          fragmentShader: earthFragmentShader
        });
        
        // Store shader material reference for animation
        lod.userData.earthShaderMaterial = material;
      } else {
        // Regular planets with textures
        const texture = textureLoader.load(`/planetarium/textures/${body.name}.jpg`);
        material = new THREE.MeshLambertMaterial({ 
          map: texture,
          color: 0xffffff
        });
      }
      
      // Create meshes for each LOD level
      const highMesh = new THREE.Mesh(highGeometry, material);
      const medMesh = new THREE.Mesh(medGeometry, material);
      const lowMesh = new THREE.Mesh(lowGeometry, material);
      
      // Get LOD distances based on body size
      const lodDist = getLODDistances(body.radius);
      
      // Add LOD levels (closer = higher detail)
      lod.addLevel(highMesh, 0);           // High detail when close
      lod.addLevel(medMesh, lodDist.high);  // Medium detail
      lod.addLevel(lowMesh, lodDist.medium); // Low detail when far
      
      lod.position.copy(body.position);
      lod.userData.bodyName = body.name;
      
      // Enable shadows for planets (not sun, as it's the light source)
      if (body.name !== 'Sun') {
        highMesh.castShadow = true;
        highMesh.receiveShadow = true;
        medMesh.castShadow = true;
        medMesh.receiveShadow = true;
        lowMesh.castShadow = true;
        lowMesh.receiveShadow = true;
      }
      
      // Store shader material reference for sun animation
      if (body.name === 'Sun' && material.uniforms) {
        lod.userData.shaderMaterial = material;
      }
      
      // Add atmosphere glow for Earth - thin rim glow with depth
      if (body.name === 'Earth' && simulationMode === 'solarSystem') {
        const atmosphereVertexShader = `
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        
        const atmosphereFragmentShader = `
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          
          uniform vec3 sunPosition;
          uniform vec3 planetCenter;
          uniform float atmosphereRadius;
          uniform float planetRadius;
          
          void main() {
            vec3 viewDir = normalize(-vPosition);
            vec3 normal = normalize(vWorldNormal);
            vec3 viewNormal = normalize(vNormal);
            
            // Calculate sun direction
            vec3 sunDir = normalize(sunPosition - vWorldPosition);
            
            // Rim-based fresnel - atmosphere visible mainly at edges
            float fresnel = 1.0 - abs(dot(viewDir, viewNormal));
            
            // Sharp rim falloff - atmosphere concentrated at the edge
            float rim = pow(fresnel, 2.5);
            float innerRim = pow(fresnel, 4.0);
            
            // Day/night based on sun angle
            float sunAngle = dot(normal, sunDir);
            float dayFactor = smoothstep(-0.2, 0.3, sunAngle);
            
            // Rayleigh scattering colors - blue scattered most
            vec3 dayAtmosphere = vec3(0.4, 0.7, 1.0);
            vec3 sunsetColor = vec3(1.0, 0.4, 0.2);
            vec3 nightGlow = vec3(0.05, 0.1, 0.2);
            
            // Sunset at terminator
            float sunsetFactor = smoothstep(-0.1, 0.05, sunAngle) * (1.0 - smoothstep(0.05, 0.25, sunAngle));
            
            // Build atmosphere color
            vec3 atmosphereColor = mix(nightGlow, dayAtmosphere, dayFactor);
            atmosphereColor = mix(atmosphereColor, sunsetColor, sunsetFactor * 0.7);
            
            // Forward scattering - brighter when looking towards sun
            float scatter = pow(max(0.0, dot(viewDir, sunDir)), 3.0);
            atmosphereColor += vec3(0.3, 0.4, 0.5) * scatter * dayFactor * rim * 0.5;
            
            // Alpha - mainly visible at rim, fading towards center
            // This creates the thin atmospheric shell look
            float alpha = rim * 0.6 + innerRim * 0.2;
            alpha *= (0.3 + dayFactor * 0.7); // Dimmer on night side
            alpha = clamp(alpha, 0.0, 0.7);
            
            gl_FragColor = vec4(atmosphereColor, alpha);
          }
        `;
        
        const atmosphereMaterial = new THREE.ShaderMaterial({
          uniforms: {
            sunPosition: { value: new THREE.Vector3(0, 0, 0) },
            planetCenter: { value: new THREE.Vector3(0, 0, 0) },
            atmosphereRadius: { value: body.radius * 1.08 },
            planetRadius: { value: body.radius }
          },
          vertexShader: atmosphereVertexShader,
          fragmentShader: atmosphereFragmentShader,
          side: THREE.BackSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        
        // Thin atmosphere shell - just slightly larger than planet
        const atmosphereGeometry = new THREE.SphereGeometry(body.radius * 1.08, 64, 32);
        const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        lod.add(atmosphereMesh);
        lod.userData.atmosphere = atmosphereMesh;
        lod.userData.atmosphereMaterial = atmosphereMaterial;
      }
      
      // Add rings for gas giants
      const gasGiants = ['Saturn', 'Jupiter', 'Uranus', 'Neptune'];
      if (gasGiants.includes(body.name) && simulationMode === 'solarSystem') {
        const ringConfigs = {
          Saturn: { innerRadius: 1.2, outerRadius: 2.3, color: 0xc9b896, opacity: 0.8, tilt: 26.7 },
          Jupiter: { innerRadius: 1.1, outerRadius: 1.3, color: 0x8b7355, opacity: 0.3, tilt: 3.1 },
          Uranus: { innerRadius: 1.3, outerRadius: 1.6, color: 0x87ceeb, opacity: 0.4, tilt: 97.8 },
          Neptune: { innerRadius: 1.2, outerRadius: 1.5, color: 0x4169e1, opacity: 0.3, tilt: 28.3 }
        };
        
        const config = ringConfigs[body.name];
        
        // Create ring with procedural texture
        const ringGeometry = new THREE.RingGeometry(
          body.radius * config.innerRadius,
          body.radius * config.outerRadius,
          128
        );
        
        // Rotate UVs for proper texture mapping on a ring
        const pos = ringGeometry.attributes.position;
        const uv = ringGeometry.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const dist = Math.sqrt(x * x + y * y);
          const normalized = (dist - body.radius * config.innerRadius) / 
                            (body.radius * (config.outerRadius - config.innerRadius));
          uv.setXY(i, normalized, 0.5);
        }
        
        // Ring shader for better visuals
        const ringVertexShader = `
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        
        const ringFragmentShader = `
          uniform vec3 ringColor;
          uniform float opacity;
          uniform float innerRadius;
          uniform float outerRadius;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          // Simple noise for ring detail
          float hash(float n) { return fract(sin(n) * 43758.5453123); }
          
          void main() {
            float dist = length(vPosition.xy);
            float t = (dist - innerRadius) / (outerRadius - innerRadius);
            
            // Create ring bands
            float bands = sin(t * 80.0) * 0.3 + 0.7;
            bands *= sin(t * 200.0) * 0.2 + 0.8;
            
            // Add some noise variation
            float noise = hash(floor(t * 500.0)) * 0.15 + 0.85;
            
            // Fade at edges
            float edgeFade = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.85, t);
            
            // Gap in Saturn's rings (Cassini Division)
            float cassiniGap = 1.0;
            if (t > 0.55 && t < 0.62) {
              cassiniGap = 0.2;
            }
            
            vec3 color = ringColor * bands * noise;
            float alpha = opacity * edgeFade * cassiniGap;
            
            gl_FragColor = vec4(color, alpha);
          }
        `;
        
        const ringMaterial = new THREE.ShaderMaterial({
          uniforms: {
            ringColor: { value: new THREE.Color(config.color) },
            opacity: { value: config.opacity },
            innerRadius: { value: body.radius * config.innerRadius },
            outerRadius: { value: body.radius * config.outerRadius }
          },
          vertexShader: ringVertexShader,
          fragmentShader: ringFragmentShader,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false
        });
        
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Store ring configuration for independent orbital animation
        // Rings orbit around the planet, not fixed to its surface
        ringMesh.userData.parentBodyName = body.name;
        ringMesh.userData.tiltDegrees = config.tilt;
        ringMesh.userData.orbitSpeed = 0.02; // Ring orbital speed (radians per second at 1x time scale)
        ringMesh.userData.currentOrbitAngle = 0;
        
        // Initial tilt setup - rings tilt with the planet but orbit independently
        ringMesh.rotation.x = Math.PI / 2; // Lay flat first
        
        // Position at planet location initially
        ringMesh.position.copy(body.position);
        
        ringMesh.receiveShadow = true;
        scene.add(ringMesh); // Add to scene directly, not as child of planet
        
        // Store ring reference for animation
        planetRingsRef.current.push(ringMesh);
        lod.userData.ringRef = ringMesh; // Keep reference for cleanup
      }
      
      // Handle binary systems - create partner mesh
      if (body.isBinarySystem && body.binaryPartner) {
        const partner = body.binaryPartner;
        const partnerGeometry = new THREE.SphereGeometry(partner.radius, 32, 16);
        const partnerMaterial = new THREE.MeshStandardMaterial({
          color: partner.color,
          emissive: partner.color,
          emissiveIntensity: 0.5,
          roughness: 0.5,
          metalness: 0.5
        });
        const partnerMesh = new THREE.Mesh(partnerGeometry, partnerMaterial);
        partnerMesh.position.copy(body.position);
        partnerMesh.userData.partnerName = partner.name;
        scene.add(partnerMesh);
        
        // Store reference for click handling
        binaryPartnerMeshesRef.current.set(partnerMesh, body.name);
        
        // Store binary info on the main LOD for animation
        lod.userData.isBinarySystem = true;
        lod.userData.binaryPartnerMesh = partnerMesh;
        lod.userData.binarySeparation = body.binarySeparation || 10;
        lod.userData.binaryPeriod = body.binaryPeriod || 1;
        lod.userData.binaryAngle = 0;
      }
      
      scene.add(lod);
      return lod;
    });

    // Find sun mesh and position light
    const sunMeshIndex = initialBodies.findIndex(b => b.name === 'Sun');
    if (sunMeshIndex !== -1) {
      const sunMesh = bodyMeshes[sunMeshIndex];
      sunLight.position.copy(sunMesh.position);
    }
    bodyMeshesRef.current = bodyMeshes;

    // Initialize planet labels
    if (showLabels) {
      // Labels will be added via the PlanetLabels component
    }
    
    safeSetLoadingStatus('Starting physics simulation');
    safeSetProgress(90);

    // Initialize physics worker after a short delay to ensure it's ready
    setTimeout(() => {
      if (physicsWorker) {
        const allBodiesForWorker = initialBodies.map(body => ({
          id: body.id,
          mass: body.mass,
          position: { x: body.position.x, y: body.position.y, z: body.position.z },
          velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
        }));
        
        const initData = {
          bodies: allBodiesForWorker,
          timeScale: level.defaultTimeScale || timeScale,
          isPaused: isPaused,
          gConstant: level.gConstant
        };
        
        physicsWorker.postMessage({
          type: 'init',
          data: initData
        });
      }
      
      // Loading complete - show the simulation
      safeSetLoadingStatus('Ready');
      safeSetProgress(100);
      setTimeout(() => safeSetIsLoading(false), 250);
    }, 100);

    // Calculate orbit paths - simple circular orbits for stable systems,
    // N-body trails for chaotic systems
    const calculateOrbitPaths = () => {
      if (bodiesRef.current.length === 0) return [];
      
      const orbitPaths = [];
      const currentLevel = LEVELS[currentLevelId] || LEVELS.SOLAR_SYSTEM;
      const G = currentLevel.gConstant;
      
      // Find the central body (Sun or largest mass)
      const sun = bodiesRef.current.find(b => b.name === 'Sun');
      const centralBody = sun || bodiesRef.current.reduce((a, b) => a.mass > b.mass ? a : b);
      
      // Store center position for frame-by-frame translation
      orbitCenterRef.current = {
        x: centralBody.position.x,
        y: centralBody.position.y,
        z: centralBody.position.z
      };
      
      // For Solar System and Outer Wilds, generate simple circular orbits
      if (currentLevel.simulationType === 'solarSystem' || currentLevel.simulationType === 'outerWilds') {
        bodiesRef.current.forEach((body) => {
          if (body === centralBody) return; // Skip the central body
          
          const points = generateOrbitPath(body, centralBody, G, 120);
          if (points.length > 0) {
            orbitPaths.push(points);
          }
        });
        
        return orbitPaths;
      }
      
      // For chaotic systems (Three Body), use N-body simulation trails
      const timeScale = timeScaleRef.current;
      const visualizationDt = timeScale * 0.016 * 10; // Larger dt for speed - predict further ahead
      
      // Create deep copies of all bodies for simulation
      const simBodies = bodiesRef.current.map(body => ({
        id: body.id,
        name: body.name,
        mass: body.mass,
        position: { x: body.position.x, y: body.position.y, z: body.position.z },
        velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
      }));
      
      // Initialize orbit paths for non-sun bodies
      const bodyIndices = [];
      simBodies.forEach((body, index) => {
        if (body.name !== 'Sun') {
          orbitPaths.push([]);
          bodyIndices.push(index);
        }
      });
      
      // Fewer steps but larger dt = same prediction distance, much faster
      const maxSteps = 100;
      
      // Use simple Euler integration instead of RK4 for orbit preview (much faster)
      for (let step = 0; step < maxSteps; step++) {
        bodyIndices.forEach((bodyIndex, pathIndex) => {
          const body = simBodies[bodyIndex];
          orbitPaths[pathIndex].push({
            x: body.position.x,
            y: body.position.y,
            z: body.position.z
          });
        });
        
        // Simple Euler integration (faster than RK4, good enough for preview)
        // Calculate accelerations
        const accelerations = simBodies.map(() => ({ x: 0, y: 0, z: 0 }));
        for (let i = 0; i < simBodies.length; i++) {
          for (let j = i + 1; j < simBodies.length; j++) {
            const dx = simBodies[j].position.x - simBodies[i].position.x;
            const dy = simBodies[j].position.y - simBodies[i].position.y;
            const dz = simBodies[j].position.z - simBodies[i].position.z;
            const distSq = dx * dx + dy * dy + dz * dz + 0.01; // Softening
            const dist = Math.sqrt(distSq);
            const force = G / distSq;
            const fx = force * dx / dist;
            const fy = force * dy / dist;
            const fz = force * dz / dist;
            accelerations[i].x += fx * simBodies[j].mass;
            accelerations[i].y += fy * simBodies[j].mass;
            accelerations[i].z += fz * simBodies[j].mass;
            accelerations[j].x -= fx * simBodies[i].mass;
            accelerations[j].y -= fy * simBodies[i].mass;
            accelerations[j].z -= fz * simBodies[i].mass;
          }
        }
        
        // Update velocities and positions
        for (let i = 0; i < simBodies.length; i++) {
          simBodies[i].velocity.x += accelerations[i].x * visualizationDt;
          simBodies[i].velocity.y += accelerations[i].y * visualizationDt;
          simBodies[i].velocity.z += accelerations[i].z * visualizationDt;
          simBodies[i].position.x += simBodies[i].velocity.x * visualizationDt;
          simBodies[i].position.y += simBodies[i].velocity.y * visualizationDt;
          simBodies[i].position.z += simBodies[i].velocity.z * visualizationDt;
        }
      }
      
      return orbitPaths;
    };
    
    // Calculate and display initial orbit paths
    // Use shorter delay for chaotic systems since they need immediate visual feedback
    const currentLevelForInit = LEVELS[currentLevelId] || LEVELS.SOLAR_SYSTEM;
    const isChaoticInit = currentLevelForInit.simulationType === 'threeBody' || currentLevelForInit.simulationType === 'nBody';
    const initDelay = isChaoticInit ? 100 : 500;
    
    // Flag to track if orbits have been initialized
    let orbitsInitialized = false;
    
    const initializeOrbits = () => {
      if (!isMounted || orbitsInitialized) return;
      orbitsInitialized = true;
      
      // Clear any existing orbit lines first to ensure clean slate
      orbitLinesRef.current.forEach((line) => {
        if (line && line.parent) {
          line.parent.remove(line);
        }
        if (line) {
          if (line.geometry) line.geometry.dispose();
          if (line.material) line.material.dispose();
        }
      });
      orbitLinesRef.current = [];
      
      // Calculate orbit paths
      const initialOrbitPaths = calculateOrbitPaths();
      
      // Create orbit lines for each path
      initialOrbitPaths.forEach((path, index) => {
        if (!path || path.length < 2) return;
        
        const nonSunBodies = bodiesRef.current.filter(b => b.name !== 'Sun');
        const bodyName = nonSunBodies[index]?.name || '';
        
        const planetColors = {
          'Mercury': 0xB5A7A7, 'Venus': 0xE6C87A, 'Earth': 0x6B93D6, 'Mars': 0xC1440E,
          'Jupiter': 0xD8CA9D, 'Saturn': 0xF4D59E, 'Uranus': 0x4FD0E7, 'Neptune': 0x4B70DD,
          'Body1': 0xFF4444, 'Body2': 0x44FF44, 'Body3': 0x4444FF,
          'TimberHearth': 0x4A7C4E, 'BrittleHollow': 0x8B6B9E, 'GiantsDeep': 0x2E8B57,
          'AshTwin': 0xD2691E, 'EmberTwin': 0xCD853F, 'DarkBramble': 0x4F6F6F, 'Interloper': 0xADD8E6
        };
        const color = planetColors[bodyName] || 0xFFFFFF;
        
        const points = [];
        path.forEach(pos => points.push(pos.x, pos.y, pos.z));
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        
        const material = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.6,
          linewidth: 2
        });
        
        const line = new THREE.Line(geometry, material);
        line.visible = showOrbitsRef.current;
        scene.add(line);
        orbitLinesRef.current.push(line);
      });
    };
    
    let orbitInitTimeout = setTimeout(initializeOrbits, initDelay);

    // Set the opening shot from the level definition - a raised three-quarter view
    // reads far better than the flat, edge-on framing a plain z-offset gives.
    const openingShot = level.cameraPosition || { x: 0, y: 200, z: 400 };
    camera.position.set(openingShot.x, openingShot.y, openingShot.z);
    controls.target.set(0, 0, 0);
    camera.lookAt(controls.target);
    controls.update();

    const animate = () => {
      requestAnimationFrame(animate);

      const frameDelta = clock.getDelta();

      // Update mesh positions from bodies
      bodiesRef.current.forEach((body, index) => {
        const mesh = bodyMeshesRef.current[index];
        if (mesh) {
          // Handle binary systems - both meshes orbit around the physics center
          if (mesh.userData.isBinarySystem && mesh.userData.binaryPartnerMesh) {
            const separation = mesh.userData.binarySeparation;
            const period = mesh.userData.binaryPeriod;
            const partnerMesh = mesh.userData.binaryPartnerMesh;
            
            // Update binary angle based on time
            if (!isPausedRef.current) {
              const currentTimeScale = timeScaleRef.current;
              mesh.userData.binaryAngle += frameDelta * period * (currentTimeScale / 100);
            }
            
            const angle = mesh.userData.binaryAngle;
            const halfSep = separation / 2;
            
            // Position both meshes orbiting around the physics center point
            // Main body (AshTwin)
            mesh.position.set(
              body.position.x + Math.cos(angle) * halfSep,
              body.position.y + Math.sin(angle) * halfSep * 0.3, // Slight y wobble
              body.position.z + Math.sin(angle) * halfSep
            );
            
            // Partner body (EmberTwin) - opposite side
            partnerMesh.position.set(
              body.position.x - Math.cos(angle) * halfSep,
              body.position.y - Math.sin(angle) * halfSep * 0.3,
              body.position.z - Math.sin(angle) * halfSep
            );
          } else {
            // CRITICAL: Update mesh position from body position - this makes bodies visible
            mesh.position.set(body.position.x, body.position.y, body.position.z);
          }
          
          // Update sun light position
          if (body.name === 'Sun') {
            sunLight.position.copy(mesh.position);
            sunLight.updateMatrixWorld();
          }
          
          if (!isPausedRef.current) {
            // Rotate planet: angularVelocity scales with simulation speed
            // Multiply by frameDelta (real time) and timeScale (simulation speed)
            // This makes planets rotate faster when simulation runs faster
            const currentTimeScale = timeScaleRef.current;
            mesh.rotation.y += body.angularVelocity * frameDelta * (currentTimeScale / 1000);
            
            // Update sun shader time for plasma animation
            if (body.name === 'Sun' && mesh.userData.shaderMaterial) {
              const time = clock.getElapsedTime();
              mesh.userData.shaderMaterial.uniforms.time.value = time;
              
              // Update solar flares
              if (solarFlareActive) {
                solarFlareTime += frameDelta;
                
                // Animate active flares
                animateSolarFlares(solarFlaresGroup, solarFlareTime);
                
                // Remove flares after 4 seconds
                if (solarFlareTime > 4) {
                  solarFlareActive = false;
                  solarFlareTime = 0;
                  clearSolarFlares(solarFlaresGroup);
                }
              } else {
                // Check for new flares every 5 seconds (to avoid checking every frame)
                lastSolarFlareCheck += frameDelta;
                if (lastSolarFlareCheck > 5) {
                  lastSolarFlareCheck = 0;
                  // Randomly trigger solar flares (5% chance every 5 seconds = roughly every 100 seconds)
                  if (Math.random() < 0.05) {
                    solarFlareActive = true;
                    solarFlareTime = 0;
                    createSolarFlare(solarFlaresGroup, mesh.position, body.radius);
                  }
                }
              }
            }
            
            // Update Earth atmosphere shader with actual sun position
            if (body.name === 'Earth' && mesh.userData.atmosphereMaterial) {
              // Find sun position
              const sunBody = bodiesRef.current.find(b => b.name === 'Sun');
              if (sunBody) {
                mesh.userData.atmosphereMaterial.uniforms.sunPosition.value.set(
                  sunBody.position.x,
                  sunBody.position.y,
                  sunBody.position.z
                );
                mesh.userData.atmosphereMaterial.uniforms.planetCenter.value.set(
                  body.position.x,
                  body.position.y,
                  body.position.z
                );
              }
            }
            
            // Update Earth surface shader with sun position and time for clouds
            if (body.name === 'Earth' && mesh.userData.earthShaderMaterial) {
              const sunBody = bodiesRef.current.find(b => b.name === 'Sun');
              const time = clock.getElapsedTime();
              if (sunBody) {
                mesh.userData.earthShaderMaterial.uniforms.sunPosition.value.set(
                  sunBody.position.x,
                  sunBody.position.y,
                  sunBody.position.z
                );
              }
              mesh.userData.earthShaderMaterial.uniforms.time.value = time;
            }
          }
        }
      });

      // Update planetary rings - they orbit around their parent planet independently
      if (!isPausedRef.current) {
        const currentTimeScale = timeScaleRef.current;
        planetRingsRef.current.forEach(ring => {
          if (!ring || !ring.userData.parentBodyName) return;
          
          // Find the parent planet mesh
          const parentIndex = bodiesRef.current.findIndex(b => b.name === ring.userData.parentBodyName);
          if (parentIndex === -1) return;
          
          const parentBody = bodiesRef.current[parentIndex];
          
          // Update ring position to follow planet
          ring.position.set(parentBody.position.x, parentBody.position.y, parentBody.position.z);
          
          // Rotate ring around the planet (orbital motion)
          // Use time scale to speed up with simulation
          ring.userData.currentOrbitAngle += ring.userData.orbitSpeed * frameDelta * (currentTimeScale / 500);
          
          // Apply rotation: first tilt to match axial inclination, then orbital rotation
          const tiltRad = THREE.MathUtils.degToRad(ring.userData.tiltDegrees);
          ring.rotation.set(Math.PI / 2, 0, 0); // Reset to flat
          ring.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), tiltRad); // Apply axial tilt
          ring.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), ring.userData.currentOrbitAngle); // Orbital rotation
        });
      }

      // Update probe meshes - ensure they stay in sync with physics simulation
      // Build a map once per frame for O(1) lookup
      const probeMeshMap = new Map();
      probeMeshesRef.current.forEach(m => {
        if (m && m.userData.probeId) {
          if (!probeMeshMap.has(m.userData.probeId)) {
            probeMeshMap.set(m.userData.probeId, []);
          }
          probeMeshMap.get(m.userData.probeId).push(m);
        }
      });
      
      probesRef.current.forEach((probe) => {
        if (!probe || !probe.position) return;
        const probeMeshes = probeMeshMap.get(probe.id) || [];
        probeMeshes.forEach((mesh) => {
          if (mesh) {
            mesh.position.set(probe.position.x, probe.position.y, probe.position.z);
            
            // Update main probe mesh material (not glow mesh) - skip gravity glow check for performance
            if (!mesh.userData.isGlow && mesh.material) {
              mesh.material.emissiveIntensity = 0.8;
            }
          }
        });

        // Update trajectory points periodically
        trajectoryUpdateCounterRef.current++;
        if (trajectoryUpdateCounterRef.current >= TRAJECTORY_UPDATE_INTERVAL) {
          const trajectoryPoints = probeTrajectoryPointsRef.current.get(probe.id);
          if (trajectoryPoints) {
            // Add current position to trajectory
            trajectoryPoints.push({
              x: probe.position.x,
              y: probe.position.y,
              z: probe.position.z
            });

            // Limit trajectory length to prevent memory issues (keep last 2000 points - reduced from 5000)
            if (trajectoryPoints.length > 2000) {
              trajectoryPoints.shift();
            }

            // Update trajectory line - only every 3rd update to reduce geometry rebuilds
            const trajectoryLine = probeTrajectoryLinesRef.current.get(probe.id);
            if (trajectoryLine && trajectoryPoints.length >= 2 && trajectoryPoints.length % 3 === 0) {
              const len = trajectoryPoints.length * 3;
              const positions = trajectoryLine.geometry.attributes.position;
              
              // Reuse buffer if same size, otherwise create new
              if (!positions || positions.count !== trajectoryPoints.length) {
                const points = new Float32Array(len);
                for (let i = 0; i < trajectoryPoints.length; i++) {
                  const pos = trajectoryPoints[i];
                  points[i * 3] = pos.x;
                  points[i * 3 + 1] = pos.y;
                  points[i * 3 + 2] = pos.z;
                }
                trajectoryLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
              } else {
                const arr = positions.array;
                for (let i = 0; i < trajectoryPoints.length; i++) {
                  const pos = trajectoryPoints[i];
                  arr[i * 3] = pos.x;
                  arr[i * 3 + 1] = pos.y;
                  arr[i * 3 + 2] = pos.z;
                }
                positions.needsUpdate = true;
              }
              trajectoryLine.computeLineDistances();
            }
          }
        }
      });

      // Reset trajectory update counter
      if (trajectoryUpdateCounterRef.current >= TRAJECTORY_UPDATE_INTERVAL) {
        trajectoryUpdateCounterRef.current = 0;
      }
      
      // Update orbit paths (only if orbits are visible and simulation is running)
      // Use deferred calculation with smooth interpolation
      if (showOrbitsRef.current && !isPausedRef.current) {
        const currentLevel = LEVELS[currentLevelId] || LEVELS.SOLAR_SYSTEM;
        const isChaotic = currentLevel.simulationType === 'threeBody' || currentLevel.simulationType === 'nBody';
        
        // For stable systems (solar system, outer wilds), update orbits every frame
        // to keep them in sync with the bodies - orbits are cheap circles
        if (!isChaotic && orbitLinesRef.current.length > 0) {
          const sun = bodiesRef.current.find(b => b.name === 'Sun');
          const centralBody = sun || bodiesRef.current.reduce((a, b) => a.mass > b.mass ? a : b, bodiesRef.current[0]);
          
          if (centralBody) {
            const G = currentLevel.gConstant;
            let orbitIndex = 0;
            
            bodiesRef.current.forEach((body) => {
              if (body === centralBody) return;
              
              const line = orbitLinesRef.current[orbitIndex];
              if (!line || !line.geometry) {
                orbitIndex++;
                return;
              }
              
              const posAttr = line.geometry.getAttribute('position');
              if (!posAttr) {
                orbitIndex++;
                return;
              }
              
              // Calculate orbit at current distance
              const newPath = generateOrbitPath(body, centralBody, G, posAttr.count - 1);
              
              if (newPath.length === posAttr.count) {
                for (let i = 0; i < newPath.length; i++) {
                  posAttr.setXYZ(i, newPath[i].x, newPath[i].y, newPath[i].z);
                }
                posAttr.needsUpdate = true;
              }
              
              orbitIndex++;
            });
          }
        }
        
        // Scale recalc interval inversely with time scale - faster sim = more frequent updates
        const currentTimeScale = timeScaleRef.current;
        const timeScaleFactor = Math.max(1, currentTimeScale / 100); // e.g., at 1000x, factor is 10
        const recalcIntervalStable = Math.max(5, Math.floor(ORBIT_PATH_RECALC_INTERVAL_STABLE_BASE / timeScaleFactor));
        const recalcInterval = isChaotic ? ORBIT_PATH_RECALC_INTERVAL_CHAOTIC : recalcIntervalStable;
        const interpolationSpeed = isChaotic ? ORBIT_INTERPOLATION_SPEED_CHAOTIC : ORBIT_INTERPOLATION_SPEED_STABLE;
        
        // Interpolate towards target orbit paths each frame for smooth transitions
        if (orbitTargetPathsRef.current.length > 0 && orbitInterpolationRef.current < 1) {
          orbitInterpolationRef.current = Math.min(1, orbitInterpolationRef.current + interpolationSpeed);
          interpolateOrbitLines(orbitLinesRef.current, orbitTargetPathsRef.current, interpolationSpeed);
        }
        
        // Recalculate orbits periodically (only if orbits already exist)
        if (!orbitCalculationPendingRef.current && orbitLinesRef.current.length > 0) {
          orbitPathRecalculateCounterRef.current++;
          if (orbitPathRecalculateCounterRef.current >= recalcInterval) {
            orbitPathRecalculateCounterRef.current = 0;
            orbitCalculationPendingRef.current = true;
            
            // For chaotic systems, calculate synchronously for real-time feel
            // For stable systems, defer to not block render
            if (isChaotic) {
              try {
                const newOrbitPaths = calculateOrbitPaths();
                // Update existing orbit lines directly
                newOrbitPaths.forEach((path, index) => {
                  const line = orbitLinesRef.current[index];
                  if (line && line.geometry && path.length > 0) {
                    const posAttr = line.geometry.getAttribute('position');
                    if (posAttr && posAttr.count === path.length) {
                      for (let i = 0; i < path.length; i++) {
                        posAttr.setXYZ(i, path[i].x, path[i].y, path[i].z);
                      }
                      posAttr.needsUpdate = true;
                    }
                  }
                });
              } catch (e) {
                console.error('Orbit calculation error:', e);
              }
              orbitCalculationPendingRef.current = false;
            } else {
              // Defer heavy orbit calculation for stable systems
              setTimeout(() => {
                if (!isMounted) return;
                try {
                  const newOrbitPaths = calculateOrbitPaths();
                  // Use smooth interpolation for existing lines
                  orbitTargetPathsRef.current = newOrbitPaths;
                  orbitInterpolationRef.current = 0;
                } catch (e) {
                  console.error('Orbit calculation error:', e);
                }
                orbitCalculationPendingRef.current = false;
              }, 0);
            }
          }
        }
      }
      
      // Toggle orbit line visibility based on showOrbits state
      orbitLinesRef.current.forEach(line => {
        if (line) {
          line.visible = showOrbitsRef.current;
        }
      });

      // Handle camera following from preset or info panel
      if (cameraTargetNameRef.current) {
        // First try to find by name (for planets)
        const bodyIndex = bodiesRef.current.findIndex(b => b.name === cameraTargetNameRef.current);
        if (bodyIndex !== -1) {
          const body = bodiesRef.current[bodyIndex];
          const mesh = bodyMeshesRef.current[bodyIndex];
          if (mesh && cameraTarget !== mesh) {
            // Only set new target if it's different
            cameraTarget = mesh;
            followTargetOnce = true;
          }
        } else {
          // Try to find by ID (for probes)
          const probeIndex = probesRef.current.findIndex(p => p.id === cameraTargetNameRef.current);
          if (probeIndex !== -1) {
            const probe = probesRef.current[probeIndex];
            // Find the main probe mesh (not the glow mesh)
            const probeMesh = probeMeshesRef.current.find(m => m && m.userData.probeId === probe.id && !m.userData.isGlow);
            if (probeMesh && cameraTarget !== probeMesh) {
              cameraTarget = probeMesh;
              followTargetOnce = true;
            }
          } else {
            // Target not found, clear target
            cameraTarget = null;
            followTargetOnce = false;
          }
        }
      } else {
        // No target name set, clear camera target
        if (cameraTarget) {
          cameraTarget = null;
          followTargetOnce = false;
        }
      }

      // Update planet labels in real-time. Sprites are sized in world units, so
      // scale them with camera distance to hold a roughly constant screen size -
      // otherwise a label swallows the screen the moment you fly up to a planet.
      if (labelsRef.current.length > 0) {
        labelsRef.current.forEach((label, index) => {
          const mesh = bodyMeshesRef.current[index];
          const body = bodiesRef.current[index];
          if (!label || !mesh?.position || !body) return;

          const distance = camera.position.distanceTo(mesh.position);
          // ~2.7% of the viewport height, derived from the camera's vertical FOV.
          const aspect = label.userData.aspect || 4;
          const height = THREE.MathUtils.clamp(distance * 0.042, 0.4, 400);
          label.scale.set(height * aspect, height, 1);

          const offset = body.radius * 1.4 + height * 1.1;
          label.position.set(
            mesh.position.x,
            mesh.position.y + offset,
            mesh.position.z
          );
        });
      }
      
      // Camera following logic - continuously follow planet/probe position dynamically
      // Camera position moves with the target, maintaining relative position
      if (cameraTarget) {
        const meshIndex = bodyMeshesRef.current.indexOf(cameraTarget);
        let targetBody = null;
        
        if (meshIndex !== -1) {
          // It's a planet/star
          targetBody = bodiesRef.current[meshIndex];
        } else {
          // It might be a probe - check probe meshes
          const probeMesh = probeMeshesRef.current.find(m => m === cameraTarget && !m.userData.isGlow);
          if (probeMesh && probeMesh.userData.probeId) {
            targetBody = probesRef.current.find(p => p.id === probeMesh.userData.probeId);
          }
        }
        
        if (targetBody) {
          const planet = targetBody;
          
          // Ensure controls are always enabled for user interaction
          controls.enabled = true;
          
          // Get current target position (updated from physics)
          const planetPosition = cameraTarget.position.clone();
          
          // Calculate how far the planet has moved since last frame
          const targetOffset = planetPosition.clone().sub(controls.target);
          const offsetDistance = targetOffset.length();
          
          // Calculate smooth lerp factor based on frameDelta for consistent speed
          // Adaptive lerp: if planet is moving fast (large offset), use faster lerp to catch up
          let baseLerpFactor = Math.min(1.0, frameDelta * 3.0);
          
          if (offsetDistance > 50) {
            baseLerpFactor = Math.min(1.0, frameDelta * 8.0);
          } else if (offsetDistance > 20) {
            baseLerpFactor = Math.min(1.0, frameDelta * 5.0);
          } else if (offsetDistance > 5) {
            baseLerpFactor = Math.min(1.0, frameDelta * 3.0);
          } else {
            baseLerpFactor = Math.min(1.0, frameDelta * 1.5);
          }
          
          // Only do initial positioning if this is the first time focusing AND user hasn't zoomed
          if (followTargetOnce && !userZooming) {
            const currentDistance = camera.position.distanceTo(planetPosition);
            const desiredDistance = planet.spectatingDistance;
            
            // Only adjust camera position if we're far from the desired distance
            if (Math.abs(currentDistance - desiredDistance) > 10) {
              // Smoothly move camera to a good viewing distance
              const direction = camera.position.clone().sub(planetPosition).normalize();
              const newPosition = planetPosition.clone().add(direction.multiplyScalar(desiredDistance));
              camera.position.lerp(newPosition, baseLerpFactor * 0.5);
              
              // Also update target during initial positioning
              controls.target.lerp(planetPosition, baseLerpFactor);
            } else {
              // We're at a good distance, start following
              followTargetOnce = false;
              // Update both target and camera position to follow planet
              controls.target.lerp(planetPosition, baseLerpFactor);
              
              // Calculate camera offset from planet and apply it to new planet position
              const cameraOffset = camera.position.clone().sub(controls.target);
              const newCameraPosition = planetPosition.clone().add(cameraOffset);
              camera.position.lerp(newCameraPosition, baseLerpFactor);
            }
          } else {
            // Continuously update both target and camera position to follow planet
            // This makes the camera move through space with the planet
            // If user zoomed, we preserve their chosen distance but still follow position
            
            // Update the target (what the camera is looking at)
            controls.target.lerp(planetPosition, baseLerpFactor);
            
            // Calculate the offset from the current target to the camera
            // This preserves the user's chosen viewing angle and distance
            const cameraOffset = camera.position.clone().sub(controls.target);
            const currentDistance = cameraOffset.length();
            
            // Calculate minimum safe distance (at least 2x planet radius to prevent going inside)
            const minSafeDistance = planet.radius * 2.5;
            
            // If current distance is too close, push camera out to safe distance
            let adjustedOffset = cameraOffset;
            if (currentDistance < minSafeDistance) {
              // Normalize and scale to minimum safe distance
              adjustedOffset = cameraOffset.normalize().multiplyScalar(minSafeDistance);
            }
            
            // Apply the offset to the new planet position to move camera with planet
            const desiredCameraPosition = planetPosition.clone().add(adjustedOffset);
            
            // Smoothly move camera to the new position
            camera.position.lerp(desiredCameraPosition, baseLerpFactor);
          }
        }
      }

      // Debug stats calculation
      const now = performance.now();
      const actualFrameTime = now - (fpsFramesRef.current[fpsFramesRef.current.length - 1] || now);
      frameTimeRef.current = actualFrameTime;
      fpsFramesRef.current.push(now);
      // Keep only frames from last second
      while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0] < now - 1000) {
        fpsFramesRef.current.shift();
      }
      // Update debug stats every 500ms to avoid excessive re-renders
      if (now - lastFpsUpdateRef.current > 500) {
        lastFpsUpdateRef.current = now;
        // Use actual frame time for more accurate FPS when lagging
        const fps = actualFrameTime > 0 ? Math.min(fpsFramesRef.current.length, Math.round(1000 / actualFrameTime)) : fpsFramesRef.current.length;
        const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;
        setDebugStats({
          fps,
          frameTime: Math.round(actualFrameTime * 10) / 10, // ms per frame
          bodies: bodiesRef.current.length,
          probes: probesRef.current.length,
          meshes: bodyMeshesRef.current.length + probeMeshesRef.current.length,
          memory,
          triangles: renderer.info.render.triangles,
          drawCalls: renderer.info.render.calls,
          textures: renderer.info.memory.textures,
          geometries: renderer.info.memory.geometries
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    // Get body names from current level dynamically (excluding Sun, which goes at index 9)
    const getLevelBodyOrder = () => {
      const level = LEVELS[currentLevelId] || LEVELS.SOLAR_SYSTEM;
      const bodyNames = Object.keys(level.bodies);
      // Put Sun/central body last (for key 9), others in order (keys 1-8)
      const centralBody = bodyNames.find(name => name === 'Sun') || bodyNames[0];
      const otherBodies = bodyNames.filter(name => name !== centralBody);
      return [...otherBodies, centralBody];
    };
    
    const focusBodyByName = (bodyName) => {
      if (!setCameraTargetNameRef.current) return;
      setCameraTargetNameRef.current((current) => {
        if (current === bodyName) {
          pushToastRef.current?.('Camera released');
          return null;
        }
        pushToastRef.current?.(`Following ${bodyName}`);
        return bodyName;
      });
    };

    const nudgeTimeScale = (delta) => {
      setTimeScale(prev => Math.max(MIN_TIME_SCALE, Math.min(MAX_TIME_SCALE, prev + delta)));
    };

    const handleKeyDown = (e) => {
      // Don't handle keys if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      if (key === 'Escape') {
        // Peel back one layer at a time: help, then the info panel, then the camera lock.
        if (isHelpOpenRef.current) {
          setIsHelpOpen(false);
        } else if (isInfoVisibleRef.current) {
          setIsInfoVisible(false);
        } else if (cameraTargetNameRef.current) {
          setCameraTargetNameRef.current?.(null);
        }
        return;
      }

      if (key === '?' || key === '/' || key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsHelpOpen(prev => !prev);
        return;
      }

      if (key.toLowerCase() === 'o') {
        setShowOrbits(prev => !prev);
        return;
      }

      if (key.toLowerCase() === 'l') {
        setShowLabels(prev => !prev);
        return;
      }

      if (key.toLowerCase() === 'c') {
        setIsControlsOpen(prev => !prev);
        return;
      }

      if (key.toLowerCase() === 'd') {
        setDebugMode(prev => !prev);
        return;
      }

      if (key === '-' || key === '_') {
        nudgeTimeScale(e.shiftKey ? -TIME_SCALE_STEP * 10 : -TIME_SCALE_STEP);
        return;
      }

      if (key === '=' || key === '+') {
        nudgeTimeScale(e.shiftKey ? TIME_SCALE_STEP * 10 : TIME_SCALE_STEP);
        return;
      }

      if (key === ' ' || key === 'Spacebar') {
        // Spacebar to pause/unpause
        e.preventDefault();
        setIsPaused(prev => !prev);
      } else if (key === '0') {
        // Unlock camera
        if (setCameraTargetNameRef.current) {
          setCameraTargetNameRef.current(null);
        }
      } else if (key >= '1' && key <= '9') {
        const bodyOrder = getLevelBodyOrder();
        const index = parseInt(key, 10) - 1;
        if (index < bodyOrder.length) {
          focusBodyByName(bodyOrder[index]);
        }
      }
    };

    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    handleResize();
    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointercancel', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onCameraZoom);
      if (zoomTimeout) clearTimeout(zoomTimeout);
      mountRef.current?.removeChild(renderer.domElement);
      
      if (physicsWorker) {
        physicsWorker.terminate();
      }

      // Clean up solar flares
      clearSolarFlares(solarFlaresGroup);
      if (sceneRef.current) {
        sceneRef.current.remove(solarFlaresGroup);
      }

      // Clean up probe trajectory lines
      probeTrajectoryLinesRef.current.forEach((line) => {
        if (line && sceneRef.current) {
          sceneRef.current.remove(line);
          line.geometry?.dispose();
          line.material?.dispose();
        }
      });
      probeTrajectoryLinesRef.current.clear();
      probeTrajectoryPointsRef.current.clear();

      // Clean up orbit lines - CRITICAL: clear the ref array so new lines are created on re-init
      orbitLinesRef.current.forEach((line) => {
        if (line) {
          scene.remove(line);
          line.geometry?.dispose();
          line.material?.dispose();
        }
      });
      orbitLinesRef.current = [];
      orbitTargetPathsRef.current = [];
      orbitInterpolationRef.current = 1;
      orbitCalculationPendingRef.current = false;
      orbitPathRecalculateCounterRef.current = 0;

      // Clear the orbit initialization timeout
      if (orbitInitTimeout) clearTimeout(orbitInitTimeout);

      // Clean up planetary rings
      planetRingsRef.current = [];
      
      // Clean up binary partner meshes ref
      binaryPartnerMeshesRef.current.clear();
      
      // Mark as unmounted to prevent state updates after cleanup
      isMounted = false;

      // Clean up Three.js objects
      scene.traverse(object => {
        if (object.isMesh || object.isLine || object.isPoints) {
          object.geometry?.dispose();
          if (object.material.isMaterial) {
            cleanMaterial(object.material);
          } else {
            for (const material of object.material) cleanMaterial(material);
          }
        }
      });
      renderer.dispose();
      controls.dispose();
    };
  }, [currentLevelId, isClient]); // Re-initialize when level changes or client mounts

  const cleanMaterial = (material) => {
    material.map?.dispose();
    material.lightMap?.dispose();
    material.bumpMap?.dispose();
    material.normalMap?.dispose();
    material.specularMap?.dispose();
    material.envMap?.dispose();
    material.aoMap?.dispose();
    material.roughnessMap?.dispose();
    material.metalnessMap?.dispose();
    material.emissiveMap?.dispose();
    material.clearcoatMap?.dispose();
    material.clearcoatRoughnessMap?.dispose();
    material.clearcoatNormalMap?.dispose();
    material.alphaMap?.dispose();
    material.displacementMap?.dispose();
    material.dispose();
  };

  // Update time scale
  useEffect(() => {
    // Clamp timeScale to valid range
    const clampedTimeScale = Math.max(MIN_TIME_SCALE, Math.min(MAX_TIME_SCALE, timeScale));
    if (clampedTimeScale !== timeScale) {
      setTimeScale(clampedTimeScale);
      return;
    }
    
    timeScaleRef.current = clampedTimeScale;
    if (physicsWorkerRef.current) {
      physicsWorkerRef.current.postMessage({
        type: 'setTimeScale',
        data: { timeScale: clampedTimeScale }
      });
    }
  }, [timeScale]);


  // Update pause state and track paused time for probes
  useEffect(() => {
    isPausedRef.current = isPaused;
    
    // Track paused time for all probes
    if (isPaused) {
      // Simulation just paused - record pause start time for all active probes
      probesRef.current.forEach(probe => {
        if (probe.isActive && !probePauseStartRef.current.has(probe.id)) {
          probePauseStartRef.current.set(probe.id, Date.now());
        }
      });
    } else {
      // Simulation just resumed - accumulate paused time and clear pause start
      probesRef.current.forEach(probe => {
        if (probePauseStartRef.current.has(probe.id)) {
          const pauseStart = probePauseStartRef.current.get(probe.id);
          const pausedDuration = Date.now() - pauseStart;
          const currentPausedTime = probePausedTimeRef.current.get(probe.id) || 0;
          probePausedTimeRef.current.set(probe.id, currentPausedTime + pausedDuration);
          probePauseStartRef.current.delete(probe.id);
        }
      });
    }
    if (physicsWorkerRef.current) {
      physicsWorkerRef.current.postMessage({
        type: 'setPaused',
        data: { isPaused }
      });
    }
  }, [isPaused]);

  // Update showOrbits ref
  useEffect(() => {
    showOrbitsRef.current = showOrbits;
  }, [showOrbits]);

  // Update cameraTargetName ref
  useEffect(() => {
    cameraTargetNameRef.current = cameraTargetName;
  }, [cameraTargetName]);

  // Store setCameraTargetName in ref for keyboard handler
  useEffect(() => {
    setCameraTargetNameRef.current = setCameraTargetName;
  }, []);

  const [earthData, setEarthData] = useState(null);
  const [allBodiesData, setAllBodiesData] = useState([]);
  const [selectedBodyLiveData, setSelectedBodyLiveData] = useState(null);

  // Update Earth and bodies data for ProbeLauncher
  useEffect(() => {
    const updateData = () => {
      const earth = bodiesRef.current.find(body => body.name === 'Earth');
      if (earth) {
        setEarthData({
          position: { x: earth.position.x, y: earth.position.y, z: earth.position.z },
          velocity: { x: earth.velocity.x, y: earth.velocity.y, z: earth.velocity.z }
        });
      }
      
      const allBodies = [...bodiesRef.current, ...probesRef.current].map(body => ({
        id: body.id,
        mass: body.mass,
        position: { x: body.position.x, y: body.position.y, z: body.position.z },
        velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
      }));
      setAllBodiesData(allBodies);

      // Update live data for selected body
      if (selectedBody) {
        // Try to find the body by ID first (works for both planets and probes)
        let currentBody = [...bodiesRef.current, ...probesRef.current].find(
          b => b.id === selectedBody.id
        );
        
        // If not found by ID, try by name (for planets)
        if (!currentBody && selectedBody.name) {
          currentBody = bodiesRef.current.find(b => b.name === selectedBody.name);
        }
        
        if (currentBody) {
          // Find the mesh to get current rotation
          const bodyIndex = bodiesRef.current.findIndex(b => b.id === currentBody.id || b.name === currentBody.name);
          const mesh = bodyIndex !== -1 ? bodyMeshesRef.current[bodyIndex] : null;
          
          // Calculate probe-specific statistics
          let probeStats = null;
          if (currentBody instanceof Probe) {
            // Calculate mission time accounting for paused periods
            const totalPausedTime = probePausedTimeRef.current.get(currentBody.id) || 0;
            const currentPauseTime = probePauseStartRef.current.has(currentBody.id) 
              ? (Date.now() - probePauseStartRef.current.get(currentBody.id))
              : 0;
            const timeSinceLaunch = (Date.now() - currentBody.launchTime - totalPausedTime - currentPauseTime) / 1000; // seconds
            const distanceFromEarth = currentBody.getDistanceTo ? 
              (() => {
                const earth = bodiesRef.current.find(b => b.name === 'Earth');
                return earth ? currentBody.getDistanceTo(earth) : 0;
              })() : 0;
            
            // Find closest planet
            let closestPlanet = null;
            let closestDistance = Infinity;
            bodiesRef.current.forEach(body => {
              if (body.name !== 'Sun' && currentBody.getDistanceTo) {
                const dist = currentBody.getDistanceTo(body);
                if (dist < closestDistance) {
                  closestDistance = dist;
                  closestPlanet = body.name;
                }
              }
            });
            
            probeStats = {
              timeSinceLaunch,
              distanceFromEarth,
              closestPlanet,
              closestDistance
            };
          }
          
          setSelectedBodyLiveData({
            speed: currentBody.getSpeed ? currentBody.getSpeed() : 0,
            position: {
              x: currentBody.position.x,
              y: currentBody.position.y,
              z: currentBody.position.z
            },
            velocity: {
              x: currentBody.velocity.x,
              y: currentBody.velocity.y,
              z: currentBody.velocity.z
            },
            sidereelTime: currentBody.sidereelTime || null,
            angularVelocity: currentBody.angularVelocity || null,
            currentRotation: mesh ? mesh.rotation.y : null,
            probeStats: probeStats
          });
        } else {
          // If body not found, clear live data
          setSelectedBodyLiveData(null);
        }
      } else {
        setSelectedBodyLiveData(null);
      }
    };

    // Update periodically to keep data fresh
    const interval = setInterval(updateData, 100);
    updateData(); // Initial update
    
    return () => clearInterval(interval);
  }, [selectedBody]);

  const handleMissionComplete = useCallback((mission) => {
    pushToastRef.current?.(`Mission complete: ${mission.title}`, {
      tone: 'success',
      detail: mission.description,
      duration: 5000
    });
  }, []);

  // Camera preset handler
  const handleCameraPreset = useCallback((planetName) => {
    // If clicking the same planet, unlock camera. Otherwise, focus on new planet.
    if (cameraTargetName === planetName) {
      setCameraTargetName(null);
      pushToastRef.current?.('Camera released');
    } else {
      setCameraTargetName(planetName);
      pushToastRef.current?.(`Following ${planetName}`);
    }
    setIsInfoVisible(false);
  }, [cameraTargetName]);

  // Toggle lighting for selected body
  const handleToggleLighting = useCallback(() => {
    if (!selectedBody || !sceneRef.current) return;
    
    const bodyName = selectedBody.name;
    const bodyIndex = bodiesRef.current.findIndex(b => b.name === bodyName);
    
    if (bodyIndex === -1) return;
    
    const mesh = bodyMeshesRef.current[bodyIndex];
    if (!mesh || !mesh.material) return;
    
    // Skip sun (it uses a shader material)
    if (bodyName === 'Sun') return;
    
    const isCurrentlyUnlit = unlitBodies.has(bodyName);
    const currentTexture = mesh.material.map; // Preserve existing texture
    
    // Dispose old material
    mesh.material.dispose();
    
    if (isCurrentlyUnlit) {
      // Restore lit material (MeshLambertMaterial)
      mesh.material = new THREE.MeshLambertMaterial({ 
        map: currentTexture,
        color: 0xffffff
      });
      
      // Remove from unlit set
      setUnlitBodies(prev => {
        const newSet = new Set(prev);
        newSet.delete(bodyName);
        return newSet;
      });
    } else {
      // Switch to unlit material (MeshBasicMaterial)
      mesh.material = new THREE.MeshBasicMaterial({ 
        map: currentTexture,
        color: 0xffffff
      });
      
      // Add to unlit set
      setUnlitBodies(prev => new Set(prev).add(bodyName));
    }
  }, [selectedBody, unlitBodies]);

  // Helper function to check if two compositions are the same
  const compositionsAreEqual = (comp1, comp2) => {
    if (!comp1 || !comp2) return false;
    if (comp1.length !== comp2.length) return false;
    
    const sorted1 = [...comp1].sort((a, b) => a.id.localeCompare(b.id));
    const sorted2 = [...comp2].sort((a, b) => a.id.localeCompare(b.id));
    
    return sorted1.every((item, index) => {
      const other = sorted2[index];
      return item.id === other.id && 
             item.value === other.value && 
             item.color === other.color;
    });
  };

  // Reset composition tab when selected body changes
  useEffect(() => {
    if (selectedBody && PLANET_INFO[selectedBody.name]) {
      const planetInfo = PLANET_INFO[selectedBody.name];
      const hasAtmosphere = planetInfo.composition;
      const hasCore = planetInfo.coreComposition;
      const areSame = compositionsAreEqual(planetInfo.composition, planetInfo.coreComposition);
      
      // Default to core first if available, otherwise atmosphere
      if (hasCore && !areSame) {
        setCompositionTab('core');
      } else if (hasAtmosphere) {
        setCompositionTab('atmosphere');
      } else if (hasCore) {
        setCompositionTab('core');
      }
      setHoveredCompositionId(null);
    }
  }, [selectedBody]);

  // Resize handlers for side panel
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResize = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 280;
    const maxWidth = Math.min(800, window.innerWidth * 0.8);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setPanelWidth(newWidth);
    }
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  // Show loading state during SSR, initial hydration, or while loading assets
  return (
    <>
      {/* Main scene container - always rendered for hydration consistency */}
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Loading overlay - shown until ready */}
      {(!isClient || isLoading) && (
        <LoadingScreen
          progress={isClient ? loadProgress : 0}
          status={isClient ? loadingStatus : 'Initializing'}
        />
      )}
      
      {/* Unified UI Panel - contains Missions, Probe Launcher, and Camera Presets */}
      {isClient && !isLoading && (
        <UnifiedUI
          simulationMode={simulationMode}
          open={isControlsOpen}
          onOpenChange={setIsControlsOpen}
          missionsProps={{
            probes: probesRef.current,
            bodies: bodiesRef.current,
            onMissionComplete: handleMissionComplete
          }}
          probeLauncherProps={{
            earth: earthData,
            allBodies: allBodiesData,
            timeScale: timeScale,
            onLaunchProbe: handleLaunchProbe,
            onUpdateTrajectory: handleUpdateTrajectory
          }}
          cameraPresets={bodiesRef.current}
        onCameraPreset={handleCameraPreset}
        levelsProps={{
          currentLevelId,
          availableLevels: LEVELS,
          onLevelChange: setCurrentLevelId
        }}
      />
      )}
      
      {/* Planet Labels - Initialize once, then update in animation loop */}
      {isClient && !isLoading && showLabels && simulationMode === 'solarSystem' && cameraRef.current && sceneRef.current && (
        <PlanetLabels
          bodies={bodiesRef.current}
          bodyMeshes={bodyMeshesRef.current}
          camera={cameraRef.current}
          scene={sceneRef.current}
          labelsRef={labelsRef}
        />
      )}

      {/* Planet Info Panel - Radix Dialog based */}
      {isClient && !isLoading && (
        <PlanetInfoPanel
          selectedBody={selectedBody}
          isOpen={isInfoVisible && selectedBody !== null}
          onClose={() => setIsInfoVisible(false)}
          panelWidth={panelWidth}
          onWidthChange={setPanelWidth}
        />
      )}

      {/* Bottom control bar */}
      {isClient && !isLoading && (
        <ControlBar
          timeScale={timeScale}
          onTimeScaleChange={setTimeScale}
          minTimeScale={MIN_TIME_SCALE}
          maxTimeScale={MAX_TIME_SCALE}
          timeScaleStep={TIME_SCALE_STEP}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(prev => !prev)}
          showOrbits={showOrbits}
          onToggleOrbits={() => setShowOrbits(prev => !prev)}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels(prev => !prev)}
          labelsAvailable={simulationMode === 'solarSystem'}
          debugMode={debugMode}
          onToggleDebug={() => setDebugMode(prev => !prev)}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      )}

      {/* Camera lock indicator */}
      {isClient && !isLoading && (
        <FocusBadge targetName={cameraTargetName} onRelease={() => setCameraTargetName(null)} />
      )}

      {/* Hover readout - owns its own state so pointer moves don't re-render the scene */}
      {isClient && !isLoading && <HoverLabelHost apiRef={hoverApiRef} />}

      {/* Transient notifications */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Debug Overlay */}
      {isClient && !isLoading && debugMode && (
        <div className="fixed top-2 sm:top-4 right-2 sm:right-4 bg-surface/95 backdrop-blur-md text-fg rounded-lg p-3 z-40 font-mono text-[11px] border border-line min-w-[170px] shadow-lg">
          <div className="flex items-center justify-between mb-2 border-b border-line pb-2">
            <span className="text-dim uppercase tracking-wider text-[10px]">Performance</span>
            <button
              onClick={() => setDebugMode(false)}
              className="text-dim hover:text-fg transition-colors -mr-1 p-1 touch-manipulation"
              aria-label="Close performance stats"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {/* Only the two figures with a healthy range are colour-coded. */}
            <DebugRow label="FPS">
              <span className={
                debugStats.fps < 30 ? 'text-negative' : debugStats.fps < 50 ? 'text-caution' : 'text-positive'
              }>
                {debugStats.fps}
              </span>
            </DebugRow>
            <DebugRow label="Frame">
              <span className={
                debugStats.frameTime > 33 ? 'text-negative' : debugStats.frameTime > 16 ? 'text-caution' : 'text-positive'
              }>
                {debugStats.frameTime || 0}ms
              </span>
            </DebugRow>
            <DebugRow label="Bodies">{debugStats.bodies}</DebugRow>
            <DebugRow label="Probes">{debugStats.probes}</DebugRow>
            <DebugRow label="Meshes">{debugStats.meshes}</DebugRow>
            <DebugRow label="Triangles">{(debugStats.triangles || 0).toLocaleString()}</DebugRow>
            <DebugRow label="Draw calls">{debugStats.drawCalls || 0}</DebugRow>
            <DebugRow label="Textures">{debugStats.textures || 0}</DebugRow>
            <DebugRow label="Geometries">{debugStats.geometries || 0}</DebugRow>
            {debugStats.memory > 0 && <DebugRow label="Memory">{debugStats.memory} MB</DebugRow>}
            <div className="border-t border-line pt-1 mt-1 space-y-1">
              <DebugRow label="Level">{currentLevelId}</DebugRow>
              <DebugRow label="Speed">{timeScale}</DebugRow>
              <DebugRow label="Paused">
                <span className={isPaused ? 'text-caution' : 'text-fg-soft'}>{isPaused ? 'Yes' : 'No'}</span>
              </DebugRow>
            </div>
          </div>
        </div>
      )}

      {/* Help & keyboard shortcuts */}
      {isClient && <HelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />}

      {/* First-run orientation */}
      {isClient && !isLoading && showWelcome && (
        <WelcomeOverlay
          onDismiss={dismissWelcome}
          onOpenHelp={() => {
            dismissWelcome();
            setIsHelpOpen(true);
          }}
        />
      )}
    </>
  );
};

export default PlanetariumScene;
