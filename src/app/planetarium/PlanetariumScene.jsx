'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Star, Planet } from '@/app/planetarium/HeavenlyBodies';
import { Probe } from '@/app/planetarium/core/Probe';
import ProbeLauncher from '@/app/planetarium/components/ProbeLauncher';
import PlanetLabels from '@/app/planetarium/components/PlanetLabels';
import MissionObjectives from '@/app/planetarium/components/MissionObjectives';
import UnifiedUI from '@/app/planetarium/components/UnifiedUI';
import { predictTrajectory, rk4Step } from '@/app/planetarium/core/physics';
import { SOLAR_SYSTEM_DATA, getInitialOrbitalData, getVisualRadius } from '@/app/planetarium/core/solarSystemData';
import { PLANET_INFO } from '@/app/planetarium/core/planetInfo';

function createStarfield() {
  const texture = new THREE.TextureLoader().load("/planetarium/textures/White-Star.png");
  const NUM_STARS = 25000;
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

function createOrbitLines(orbitLines, orbitPaths, bodies, scene, simulationMode = 'solarSystem') {
  const colors = simulationMode === 'threeBody' 
    ? [0xFF0000, 0x00FF00, 0x0000FF] // Red, Green, Blue for three bodies
    : [
        0x8C7853, // Mercury
        0xFFC649, // Venus
        0x6B93D6, // Earth
        0xCD5C5C, // Mars
        0xD8CA9D, // Jupiter
        0xFAD5A5, // Saturn
        0x4FD0E7, // Uranus
        0x4B70DD, // Neptune
        0xFFD700, // Sun
      ];

  orbitPaths.forEach((path, index) => {
    if (path.length < 2) return;

    const points = [];
    path.forEach(pos => {
      points.push(pos.x, pos.y, pos.z);
    });

    if (orbitLines[index]) {
      const geometry = orbitLines[index].geometry;
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      geometry.attributes.position.needsUpdate = true;
    } else {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

      const material = new THREE.LineBasicMaterial({
        color: colors[index] || 0xFFFFFF,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
      });

      const line = new THREE.Line(geometry, material);
      orbitLines.push(line);
      scene.add(line);
    }
  });
  return orbitLines;
}

function createTrajectoryLine(trajectory, scene, color = 0xFF6600) {
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

const PlanetariumScene = () => {
  const mountRef = useRef(null);
  const [timeScale, setTimeScale] = useState(1000); // Default speed
  const MIN_TIME_SCALE = 100;
  const MAX_TIME_SCALE = 15000;
  const [isPaused, setIsPaused] = useState(false);
  const [selectedBody, setSelectedBody] = useState(null);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [isInfoPopupVisible, setIsInfoPopupVisible] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);
  const simulationMode = 'solarSystem'; // Always solar system
  const [showLabels, setShowLabels] = useState(true);
  const [cameraTargetName, setCameraTargetName] = useState(null);
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
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const physicsWorkerRef = useRef(null);
  const orbitPathRecalculateCounterRef = useRef(0);
  const cameraTargetNameRef = useRef(null);
  const setCameraTargetNameRef = useRef(null);
  const labelsRef = useRef([]);
  const ORBIT_PATH_RECALC_INTERVAL = 30; // Much more frequent updates
  const TRAJECTORY_UPDATE_INTERVAL = 5; // Update trajectory lines every N frames
  const trajectoryUpdateCounterRef = useRef(0);

  // Initialize physics worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker('/physicsWorker.js');

        worker.onmessage = (e) => {
          const { type, bodies: updatedBodies } = e.data;
          
          if (type === 'update') {
            // Update body positions from worker
            // CRITICAL: This includes ALL bodies (planets, sun, AND probes)
            // This is like Outer Wilds - every physics object is constantly being pulled by all others
            
            let updatedCount = 0;
            updatedBodies.forEach((updatedBody) => {
              // Update regular bodies (planets, sun)
              const body = bodiesRef.current.find(b => b.id === updatedBody.id);
              if (body && body.position) {
                body.position.set(updatedBody.position.x, updatedBody.position.y, updatedBody.position.z);
                body.velocity.set(updatedBody.velocity.x, updatedBody.velocity.y, updatedBody.velocity.z);
                updatedCount++;
              } else {
                // Update probes - CRITICAL: probes must be updated for them to move
                const probe = probesRef.current.find(p => p.id === updatedBody.id);
                if (probe && probe.position) {
                  probe.position.set(updatedBody.position.x, updatedBody.position.y, updatedBody.position.z);
                  probe.velocity.set(updatedBody.velocity.x, updatedBody.velocity.y, updatedBody.velocity.z);
                  updatedCount++;
                }
              }
            });
            
          }
        };

        physicsWorkerRef.current = worker;
      } catch (error) {
        console.warn('Web Worker not available, falling back to main thread:', error);
        physicsWorkerRef.current = null;
      }
    }
  }, []);

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

    const probe = new Probe(
      probeData.name,
      { x: earth.position.x, y: earth.position.y, z: earth.position.z },
      probeData.velocity,
      probeData.mass || 0.001  // Ensure probe has a reasonable mass
    );

    probesRef.current.push(probe);

    // Add probe mesh - make it visible and larger with better visualization
    const geometry = new THREE.SphereGeometry(1.0, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
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
      color: 0x00ff00,
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
    
    console.log(`Probe ${probe.id} created at position:`, probe.position);
    console.log(`Probe ${probe.id} velocity:`, probe.velocity);

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
      0x00FF00 // Green for launched probes
    );
    if (trajectoryLine) {
      probeTrajectoryLinesRef.current.set(probe.id, trajectoryLine);
    }

    // Add to physics worker - CRITICAL: this makes the probe part of the simulation
    // The probe will now be included in ALL force calculations with ALL other bodies
    if (physicsWorkerRef.current) {
      const serialized = probe.toSerializable();
      console.log('🚀 Launching probe:', serialized);
      console.log('Probe will be affected by gravity from ALL', bodiesRef.current.length, 'bodies');
      
      physicsWorkerRef.current.postMessage({
        type: 'addBody',
        data: {
          body: serialized
        }
      });
      
      // Verify probe was added
      setTimeout(() => {
        console.log('✅ Probe should now be in simulation. Total bodies:', 
                   bodiesRef.current.length + probesRef.current.length);
      }, 200);
    } else {
      console.warn('⚠️ Physics worker not available - probe will not move');
    }
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
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
    cameraRef.current = camera;
    let cameraTarget = null;
    let followTargetOnce = false;
    let userZooming = false;
    let zoomTimeout = null;
    const textureLoader = new THREE.TextureLoader();
    const clock = new THREE.Clock();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08; // Increased for smoother damping
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 5000;
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
    const mouse = new THREE.Vector2();

    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects([...bodyMeshesRef.current, ...probeMeshesRef.current]);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const bodyIndex = bodyMeshesRef.current.indexOf(clickedMesh);

        if (bodyIndex !== -1) {
          const clickedBody = bodiesRef.current[bodyIndex];
          setSelectedBody(clickedBody);
          setIsInfoVisible(true);
        } else if (clickedMesh.userData && clickedMesh.userData.probeId) {
          // It's a probe mesh - find probe by ID (works for both main mesh and glow mesh)
          const clickedProbe = probesRef.current.find(p => p.id === clickedMesh.userData.probeId);
          if (clickedProbe) {
            setSelectedBody(clickedProbe);
            setIsInfoVisible(true);
          }
        }
      }
    }

    renderer.domElement.addEventListener('click', onClick);
    scene.add(createStarfield());

    // Initialize bodies with accurate solar system data
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
      
      // Calculate appropriate spectating distance based on planet size
      // Ensure camera stays well outside the planet (at least 3x radius)
      const planetRadius = getVisualRadius(planetName);
      let spectatingDistance;
      if (planetName === 'Jupiter' || planetName === 'Saturn') {
        spectatingDistance = 100;
      } else if (planetName === 'Uranus' || planetName === 'Neptune') {
        // Uranus and Neptune need larger distances to prevent camera from going inside
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

    const initialBodies = [sun, ...planets];

    // Add IDs to bodies
    initialBodies.forEach((body, index) => {
      body.id = `body_${index}_${body.name}`;
    });

    bodiesRef.current = initialBodies;

    const bodyMeshes = initialBodies.map((body) => {
      const geometry = new THREE.SphereGeometry(body.radius, 64, 32);
      let material;
      
      if (body.name === 'Sun' && simulationMode === 'solarSystem') {
        // Create glowing shader for the sun
        const sunVertexShader = `
          varying vec3 vNormal;
          varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        
        const sunFragmentShader = `
          uniform float time;
          uniform float radius;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            vec3 color1 = vec3(1.0, 0.8, 0.4); // Warm yellow
            vec3 color2 = vec3(1.0, 0.6, 0.2); // Orange
            vec3 color3 = vec3(1.0, 0.9, 0.7); // Light yellow
            
            // Create pulsing effect
            float pulse = sin(time * 2.0) * 0.1 + 1.0;
            
            // Radial gradient from center
            float dist = length(vPosition);
            float normalizedDist = dist / radius;
            float gradient = 1.0 - smoothstep(0.0, 1.0, normalizedDist);
            
            // Mix colors based on position
            vec3 color = mix(color1, color2, gradient * 0.5);
            color = mix(color, color3, sin(normalizedDist * 5.0 + time) * 0.3 + 0.3);
            
            // Add glow effect at edges
            float glow = 1.0 + smoothstep(0.7, 1.0, normalizedDist) * 0.8;
            
            // Final color with emission and glow
            gl_FragColor = vec4(color * glow * pulse, 1.0);
          }
        `;
        
        material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            radius: { value: body.radius }
          },
          vertexShader: sunVertexShader,
          fragmentShader: sunFragmentShader,
          side: THREE.DoubleSide
        });
        
      } else {
        // Regular planets with textures
        const texture = textureLoader.load(`/planetarium/textures/${body.name}.jpg`);
        material = new THREE.MeshBasicMaterial({ map: texture });
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(body.position);
      mesh.userData.bodyName = body.name;
      
      // Store shader material reference for sun animation
      if (body.name === 'Sun' && material.uniforms) {
        mesh.userData.shaderMaterial = material;
      }
      
      scene.add(mesh);
      return mesh;
    });
    bodyMeshesRef.current = bodyMeshes;

    // Initialize planet labels
    if (showLabels) {
      // Labels will be added via the PlanetLabels component
    }

    // Initialize physics worker after a short delay to ensure it's ready
    setTimeout(() => {
      if (physicsWorkerRef.current) {
        const allBodiesForWorker = initialBodies.map(body => ({
          id: body.id,
          mass: body.mass,
          position: { x: body.position.x, y: body.position.y, z: body.position.z },
          velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
        }));
        
        console.log('🚀 Initializing physics worker with', allBodiesForWorker.length, 'bodies');
        console.log('Bodies:', allBodiesForWorker.map(b => ({ 
          id: b.id, 
          mass: b.mass,
          pos: b.position,
          vel: b.velocity
        })));
        
        // CRITICAL: Make sure worker is ready before sending
        if (physicsWorkerRef.current) {
          physicsWorkerRef.current.postMessage({
            type: 'init',
            data: {
              bodies: allBodiesForWorker,
              timeScale: timeScale,
              isPaused: isPaused
            }
          });
          
          console.log('✅ Init message sent to physics worker');
        } else {
          console.error('❌ Physics worker not available!');
        }
      }
    }, 100);

    // Calculate orbit paths for all planets using RK4 simulation
    // This simulates forward in time to show where planets will travel
    const calculateOrbitPaths = () => {
      if (bodiesRef.current.length === 0) return [];
      
      const orbitPaths = [];
      const timeScale = timeScaleRef.current;
      
      // Get planet data for adaptive step calculation
      // Outer planets have longer orbital periods, so they need more steps
      const planetData = {
        'Mercury': { distance: 57.9, baseSteps: 400 },
        'Venus': { distance: 108.2, baseSteps: 500 },
        'Earth': { distance: 149.6, baseSteps: 600 },
        'Mars': { distance: 227.9, baseSteps: 800 },
        'Jupiter': { distance: 778.5, baseSteps: 1200 },
        'Saturn': { distance: 1432.0, baseSteps: 1800 },
        'Uranus': { distance: 2867.0, baseSteps: 2400 },
        'Neptune': { distance: 4515.0, baseSteps: 3000 }
      };
      
      // Use larger time step for orbit visualization (2.5x) to show more of the orbit
      // This is safe because it's only for visualization, not actual physics
      // Outer planets move slowly, so a larger dt helps show more of their orbit
      const visualizationDt = timeScale * 0.016 * 2.5;
      
      // Create deep copies of all bodies for simulation starting from CURRENT positions
      const simBodies = bodiesRef.current.map(body => ({
        id: body.id,
        name: body.name,
        mass: body.mass,
        position: { x: body.position.x, y: body.position.y, z: body.position.z },
        velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
      }));
      
      // Initialize orbit paths array - show planets only (excluding sun)
      // Calculate adaptive steps per planet based on distance/orbital period
      const bodyIndices = [];
      const planetSteps = [];
      simBodies.forEach((body, index) => {
        if (body.name !== 'Sun') {
          orbitPaths.push([]);
          bodyIndices.push(index);
          
          // Calculate adaptive steps based on planet distance
          // Outer planets get more steps to show more of their orbit
          const data = planetData[body.name];
          if (data) {
            // Base steps scaled by distance ratio (relative to Earth)
            // When timeScale is low (slow simulation), show more of the orbit
            // This helps visualize orbits at slow time steps
            const distanceRatio = data.distance / 149.6; // Earth = 1.0
            const slowTimeFactor = Math.max(1, 10000 / Math.max(timeScale, 1000)); // More steps when slow
            const steps = Math.floor(data.baseSteps * distanceRatio * slowTimeFactor);
            planetSteps.push(Math.min(steps, 4000)); // Cap at 4000 for performance
          } else {
            planetSteps.push(800); // Default
          }
        }
      });
      
      // Find maximum steps needed
      const maxSteps = planetSteps.length > 0 ? Math.max(...planetSteps) : 800;
      
      // Run simulation forward to collect orbit points (only future positions)
      for (let step = 0; step < maxSteps; step++) {
        // Store current positions for all planets
        // Each planet will have different numbers of points based on their step count
        bodyIndices.forEach((bodyIndex, pathIndex) => {
          const body = simBodies[bodyIndex];
          const stepsForPlanet = planetSteps[pathIndex];
          
          // Only add point if we haven't reached this planet's step limit
          if (step < stepsForPlanet) {
            orbitPaths[pathIndex].push({
              x: body.position.x,
              y: body.position.y,
              z: body.position.z
            });
          }
        });
        
        // Calculate all updates first (simultaneous update for N-body)
        const updates = [];
        for (let i = 0; i < simBodies.length; i++) {
          const result = rk4Step(simBodies[i], simBodies, visualizationDt);
          updates.push(result);
        }
        
        // Apply all updates simultaneously
        for (let i = 0; i < simBodies.length; i++) {
          simBodies[i].velocity = updates[i].velocity;
          simBodies[i].position = updates[i].position;
        }
      }
      
      return orbitPaths;
    };
    
    // Calculate and display initial orbit paths
    setTimeout(() => {
      const initialOrbitPaths = calculateOrbitPaths();
      orbitLinesRef.current = createOrbitLines([], initialOrbitPaths, bodiesRef.current, scene);
    }, 500); // Delay to ensure bodies are initialized

    // Set initial camera position
    camera.position.z = 75;

    const animate = () => {
      requestAnimationFrame(animate);

      const frameDelta = clock.getDelta();

      // Update mesh positions from bodies
      bodiesRef.current.forEach((body, index) => {
        const mesh = bodyMeshesRef.current[index];
        if (mesh) {
          // CRITICAL: Update mesh position from body position - this makes bodies visible
          mesh.position.set(body.position.x, body.position.y, body.position.z);
          if (!isPausedRef.current) {
            // Rotate planet: angularVelocity scales with simulation speed
            // Multiply by frameDelta (real time) and timeScale (simulation speed)
            // This makes planets rotate faster when simulation runs faster
            const currentTimeScale = timeScaleRef.current;
            mesh.rotation.y += body.angularVelocity * frameDelta * (currentTimeScale / 1000);
            
            // Update sun shader time for pulsing glow effect
            if (body.name === 'Sun' && mesh.userData.shaderMaterial) {
              mesh.userData.shaderMaterial.uniforms.time.value += frameDelta * 0.5;
            }
          }
        }
      });

      // Update probe meshes - ensure they stay in sync with physics simulation
      // Also check for nearby planets to show gravity effects
      // Also update trajectory points and lines
      probesRef.current.forEach((probe) => {
        if (!probe || !probe.position) return;
        const probeMeshes = probeMeshesRef.current.filter(m => m && m.userData.probeId === probe.id);
        probeMeshes.forEach((mesh) => {
          if (mesh) {
            mesh.position.set(probe.position.x, probe.position.y, probe.position.z);
            
            // Update main probe mesh material (not glow mesh)
            if (!mesh.userData.isGlow && mesh.material) {
              // Visual feedback: Make probe glow brighter when near a planet (gravity assist zone)
              let nearestPlanetDistance = Infinity;
              bodiesRef.current.forEach((body) => {
                if (body.name === 'Sun') return; // Skip sun for this check
                const distance = probe.getDistanceTo(body);
                if (distance < nearestPlanetDistance) {
                  nearestPlanetDistance = distance;
                }
              });
              
              // If probe is within 50 units of a planet, increase glow to show gravity interaction
              if (nearestPlanetDistance < 50) {
                mesh.material.emissiveIntensity = Math.min(1.0, 0.8 + (50 - nearestPlanetDistance) / 50 * 0.2);
              } else {
                mesh.material.emissiveIntensity = 0.8;
              }
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

            // Limit trajectory length to prevent memory issues (keep last 5000 points)
            if (trajectoryPoints.length > 5000) {
              trajectoryPoints.shift();
            }

            // Update trajectory line
            const trajectoryLine = probeTrajectoryLinesRef.current.get(probe.id);
            if (trajectoryLine && trajectoryPoints.length >= 2) {
              const points = [];
              trajectoryPoints.forEach(pos => {
                points.push(pos.x, pos.y, pos.z);
              });

              trajectoryLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
              trajectoryLine.geometry.attributes.position.needsUpdate = true;
              trajectoryLine.computeLineDistances(); // Required for dashed lines - must be called on the Line object
            }
          }
        }
      });

      // Reset trajectory update counter
      if (trajectoryUpdateCounterRef.current >= TRAJECTORY_UPDATE_INTERVAL) {
        trajectoryUpdateCounterRef.current = 0;
      }
      
      // Update orbit paths more frequently (only if orbits are visible and simulation is running)
      if (showOrbitsRef.current && !isPausedRef.current) {
        orbitPathRecalculateCounterRef.current++;
        if (orbitPathRecalculateCounterRef.current >= ORBIT_PATH_RECALC_INTERVAL) {
          orbitPathRecalculateCounterRef.current = 0;
          const newOrbitPaths = calculateOrbitPaths();
          orbitLinesRef.current = createOrbitLines(orbitLinesRef.current, newOrbitPaths, bodiesRef.current, scene);
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

      // Update planet labels positions in real-time
      if (labelsRef.current.length > 0) {
        labelsRef.current.forEach((label, index) => {
          if (label && bodyMeshesRef.current[index]) {
            const mesh = bodyMeshesRef.current[index];
            const body = bodiesRef.current[index];
            if (mesh && body && mesh.position) {
              const offset = body.radius * 2 + 5;
              label.position.set(
                mesh.position.x,
                mesh.position.y + offset,
                mesh.position.z
              );
            }
          }
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

      controls.update();
      renderer.render(scene, camera);
    };

    // Planet names in order (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Sun)
    const planetOrder = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Sun'];
    
    const handleKeyDown = (e) => {
      // Don't handle keys if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === '0') {
        // Unlock camera
        if (setCameraTargetNameRef.current) {
          setCameraTargetNameRef.current(null);
        }
      } else if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < planetOrder.length && setCameraTargetNameRef.current) {
          const planetName = planetOrder[index];
          // Toggle: if already focused, unlock; otherwise focus
          setCameraTargetNameRef.current((current) => {
            if (current === planetName) {
              return null; // Unlock if already focused
            } else {
              return planetName; // Focus on new planet
            }
          });
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
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onCameraZoom);
      if (zoomTimeout) clearTimeout(zoomTimeout);
      mountRef.current?.removeChild(renderer.domElement);
      
      if (physicsWorkerRef.current) {
        physicsWorkerRef.current.terminate();
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
  }, [simulationMode]); // Re-initialize when simulation mode changes

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


  // Update pause state
  useEffect(() => {
    isPausedRef.current = isPaused;
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
            const timeSinceLaunch = (Date.now() - currentBody.launchTime) / 1000; // seconds
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

  // Camera preset handler
  const handleCameraPreset = useCallback((planetName) => {
    // If clicking the same planet, unlock camera. Otherwise, focus on new planet.
    if (cameraTargetName === planetName) {
      setCameraTargetName(null);
    } else {
      setCameraTargetName(planetName);
    }
    setIsInfoVisible(false);
  }, [cameraTargetName]);

  return (
    <>
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Unified UI Panel - contains Missions, Probe Launcher, and Camera Presets */}
      <UnifiedUI
        simulationMode={simulationMode}
        missionsProps={{
          probes: probesRef.current,
          bodies: bodiesRef.current
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
      />
      
      {/* Planet Labels - Initialize once, then update in animation loop */}
      {showLabels && simulationMode === 'solarSystem' && cameraRef.current && sceneRef.current && (
        <PlanetLabels
          bodies={bodiesRef.current}
          bodyMeshes={bodyMeshesRef.current}
          camera={cameraRef.current}
          scene={sceneRef.current}
          labelsRef={labelsRef}
        />
      )}

      {selectedBody && (
        <div
          className={`fixed top-0 right-0 h-screen w-80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl
              transform transition-transform duration-300 ease-in-out backdrop-blur-xl
              border-l border-slate-700/50 flex flex-col
              ${isInfoVisible ? 'translate-x-0' : 'translate-x-full'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          {/* Header with gradient accent */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-md border-b border-slate-700/50 px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {selectedBody.name}
                </h2>
                {PLANET_INFO[selectedBody.name] && (
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {PLANET_INFO[selectedBody.name].type}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsInfoVisible(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg p-1.5 transition-all duration-200 text-xl font-light"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">

          {PLANET_INFO[selectedBody.name] ? (
            <>
              {/* Description Card */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 backdrop-blur-sm">
                <p className="text-slate-300 leading-relaxed text-xs">
                  {PLANET_INFO[selectedBody.name].description}
                </p>
              </div>
              
              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30 hover:border-blue-500/50 transition-colors">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Distance from Sun</div>
                  <div className="text-sm font-bold text-blue-400">{PLANET_INFO[selectedBody.name].distance}</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30 hover:border-purple-500/50 transition-colors">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Orbital Period</div>
                  <div className="text-sm font-bold text-purple-400">{PLANET_INFO[selectedBody.name].orbitalPeriod}</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30 hover:border-pink-500/50 transition-colors">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Day Length</div>
                  <div className="text-sm font-bold text-pink-400">{PLANET_INFO[selectedBody.name].dayLength}</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30 hover:border-cyan-500/50 transition-colors">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Moons</div>
                  <div className="text-sm font-bold text-cyan-400">{PLANET_INFO[selectedBody.name].moons}</div>
                </div>
              </div>

              {/* Live Data Section */}
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-bold text-slate-200">Live Data</h3>
                </div>
                <div className="space-y-2">
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-semibold">Speed</div>
                    <div className="text-sm font-mono font-bold text-green-400">
                      {selectedBodyLiveData ? selectedBodyLiveData.speed.toFixed(6) : '0.000000'} <span className="text-xs text-slate-400 font-normal">units/s</span>
                    </div>
                  </div>
                  {selectedBodyLiveData && (
                    <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Position</div>
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                        <div>
                          <div className="text-slate-400 text-[10px]">X</div>
                          <div className="text-blue-400 font-semibold">{selectedBodyLiveData.position.x.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">Y</div>
                          <div className="text-purple-400 font-semibold">{selectedBodyLiveData.position.y.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">Z</div>
                          <div className="text-pink-400 font-semibold">{selectedBodyLiveData.position.z.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedBodyLiveData && selectedBodyLiveData.sidereelTime !== null && (
                    <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Sidereal Rotation</div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Sidereal Time:</span>
                          <span className="text-cyan-400 font-mono font-semibold">{selectedBodyLiveData.sidereelTime ? (Math.abs(selectedBodyLiveData.sidereelTime) / 86400).toFixed(2) : 'N/A'} days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Angular Velocity:</span>
                          <span className="text-yellow-400 font-mono font-semibold">{selectedBodyLiveData.angularVelocity ? selectedBodyLiveData.angularVelocity.toFixed(8) : 'N/A'} rad/s</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Current Rotation:</span>
                          <span className="text-orange-400 font-mono font-semibold">{selectedBodyLiveData.currentRotation !== null ? (selectedBodyLiveData.currentRotation.toFixed(4)) : 'N/A'} rad</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Facts Section */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <h3 className="text-sm font-bold mb-2 text-slate-200">Key Facts</h3>
                <ul className="space-y-1.5">
                  {PLANET_INFO[selectedBody.name].facts.map((fact, i) => (
                    <li key={i} className="flex items-start gap-2 group">
                      <div className="mt-1 w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                      <span className="text-slate-300 text-xs leading-relaxed">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Basic Info Cards */}
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Radius</div>
                  <div className="text-sm font-bold text-blue-400 font-mono">{selectedBody.radius.toFixed(2)} <span className="text-xs text-slate-400 font-normal">units</span></div>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Mass</div>
                  <div className="text-sm font-bold text-purple-400 font-mono">{selectedBody.mass.toFixed(2)} <span className="text-xs text-slate-400 font-normal">Earth masses</span></div>
                </div>
                {selectedBody.sidereelTime && (
                  <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Rotation Period</div>
                    <div className="text-sm font-bold text-pink-400 font-mono">{(Math.abs(selectedBody.sidereelTime) / 86400).toFixed(1)} <span className="text-xs text-slate-400 font-normal">days</span></div>
                  </div>
                )}
              </div>
              
              {/* Live Data Section */}
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <h3 className="text-sm font-bold text-slate-200">Live Data</h3>
                </div>
                <div className="space-y-2">
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-semibold">Speed</div>
                    <div className="text-sm font-mono font-bold text-green-400">
                      {selectedBodyLiveData ? selectedBodyLiveData.speed.toFixed(6) : (selectedBody.getSpeed ? selectedBody.getSpeed().toFixed(6) : '0.000000')} <span className="text-xs text-slate-400 font-normal">units/s</span>
                    </div>
                  </div>
                  {selectedBodyLiveData && (
                    <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Position</div>
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                        <div>
                          <div className="text-slate-400 text-[10px]">X</div>
                          <div className="text-blue-400 font-semibold">{selectedBodyLiveData.position.x.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">Y</div>
                          <div className="text-purple-400 font-semibold">{selectedBodyLiveData.position.y.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px]">Z</div>
                          <div className="text-pink-400 font-semibold">{selectedBodyLiveData.position.z.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedBodyLiveData && selectedBodyLiveData.sidereelTime !== null && (
                    <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Sidereal Rotation</div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Sidereal Time:</span>
                          <span className="text-cyan-400 font-mono font-semibold">{selectedBodyLiveData.sidereelTime ? (Math.abs(selectedBodyLiveData.sidereelTime) / 86400).toFixed(2) : 'N/A'} days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Angular Velocity:</span>
                          <span className="text-yellow-400 font-mono font-semibold">{selectedBodyLiveData.angularVelocity ? selectedBodyLiveData.angularVelocity.toFixed(8) : 'N/A'} rad/s</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Current Rotation:</span>
                          <span className="text-orange-400 font-mono font-semibold">{selectedBodyLiveData.currentRotation !== null ? (selectedBodyLiveData.currentRotation.toFixed(4)) : 'N/A'} rad</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {selectedBody instanceof Probe && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-2">
                  <h3 className="text-sm font-bold mb-2 text-slate-200">Probe Information</h3>
                  
                  <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Status</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedBody.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      <span className={`text-xs font-bold ${selectedBody.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedBody.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {selectedBodyLiveData && selectedBodyLiveData.probeStats && (
                    <>
                      <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Mission Time</div>
                        <div className="text-sm font-mono font-bold text-cyan-400">
                          {Math.floor(selectedBodyLiveData.probeStats.timeSinceLaunch / 3600)}h {Math.floor((selectedBodyLiveData.probeStats.timeSinceLaunch % 3600) / 60)}m {Math.floor(selectedBodyLiveData.probeStats.timeSinceLaunch % 60)}s
                        </div>
                      </div>

                      <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Distance from Earth</div>
                        <div className="text-sm font-mono font-bold text-blue-400">
                          {selectedBodyLiveData.probeStats.distanceFromEarth.toFixed(2)} <span className="text-xs text-slate-400 font-normal">units</span>
                        </div>
                      </div>

                      {selectedBodyLiveData.probeStats.closestPlanet && (
                        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Closest Planet</div>
                          <div className="text-sm font-bold text-purple-400">
                            {selectedBodyLiveData.probeStats.closestPlanet}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {selectedBodyLiveData.probeStats.closestDistance.toFixed(2)} units away
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 space-y-2 px-4 pb-4 pt-2 border-t border-slate-700/50">
            <button
              onClick={() => {
                // Use ID for probes, name for planets
                const targetId = selectedBody instanceof Probe ? selectedBody.id : selectedBody.name;
                setCameraTargetName(targetId);
                // Camera will follow in animate loop
              }}
              className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-sm font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-blue-500/50 transform hover:scale-[1.02]"
            >
              Focus on {selectedBody.name}
            </button>
            
            <button
              onClick={() => {
                setCameraTargetName(null);
                // Unlock camera
              }}
              className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-200 transition-all duration-200 border border-slate-600/50 hover:border-slate-500"
            >
              Unlock Camera
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl text-white rounded-lg px-3 py-2 flex gap-1.5 items-center shadow-2xl border border-slate-700/50 z-30">
        <button
          onClick={() => {
            setTimeScale(prev => Math.max(MIN_TIME_SCALE, prev - 1000));
          }}
          className="bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1.5 rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-slate-500"
          title="Major Decrease"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20l-7-8 7-8M12 20l-7-8 7-8" />
          </svg>
        </button>

        <button
          onClick={() => {
            setTimeScale(prev => Math.max(MIN_TIME_SCALE, prev - 100));
          }}
          className="bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1.5 rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-slate-500"
          title="Slight Decrease"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => {
            setIsPaused(prev => !prev);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105"
          title="Pause / Resume"
        >
          {isPaused ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4 inline-block">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v18l15-9L5 3z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4 inline-block">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => {
            setTimeScale(prev => Math.min(MAX_TIME_SCALE, prev + 100));
          }}
          className="bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1.5 rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-slate-500"
          title="Slight Increase"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => {
            setTimeScale(prev => Math.min(MAX_TIME_SCALE, prev + 1000));
          }}
          className="bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1.5 rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-slate-500"
          title="Major Increase"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 4l7 8-7 8M12 4l7 8-7 8" />
          </svg>
        </button>

        <div className="relative group mx-3 font-mono inline-block">
          <div className="text-sm text-slate-200 cursor-pointer font-semibold">
            Speed: <span className="text-blue-400">{timeScale}</span>
          </div>

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 px-4 py-3 w-56 bg-slate-800/30 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-2xl pointer-events-auto">
            <input
              type="range"
              min={MIN_TIME_SCALE}
              max={MAX_TIME_SCALE}
              step="100"
              value={timeScale}
              onChange={e => {
                const value = Number(e.target.value);
                setTimeScale(Math.max(MIN_TIME_SCALE, Math.min(MAX_TIME_SCALE, value)));
              }}
              className="w-full appearance-none bg-slate-700 h-1.5 rounded-lg
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-gradient-to-r
                  [&::-webkit-slider-thumb]:from-blue-500
                  [&::-webkit-slider-thumb]:to-purple-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:appearance-none
                  [&::-moz-range-thumb]:h-3
                  [&::-moz-range-thumb]:w-3
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-gradient-to-r
                  [&::-moz-range-thumb]:from-blue-500
                  [&::-moz-range-thumb]:to-purple-500
                  [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{MIN_TIME_SCALE}</span>
              <span>{MAX_TIME_SCALE}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowOrbits(!showOrbits)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 border ${
            showOrbits 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-green-500/50' 
              : 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50'
          }`}
          title="Toggle Orbit Paths"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
        </button>

        {simulationMode === 'solarSystem' && (
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 border ${
              showLabels 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-green-500/50' 
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50'
            }`}
            title="Toggle Planet Labels"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h10m-7 4h7" />
            </svg>
          </button>
        )}

        <button
          onClick={() => setIsInfoPopupVisible(true)}
          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 border border-slate-600/50 hover:border-slate-500"
          title="Controls Information"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor"
            strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
          </svg>
        </button>
      </div>

      {isInfoPopupVisible && (
        <div
          className="fixed inset-0 bg-black/70 flex justify-center items-start p-10 pt-20 z-50 overflow-auto"
          onClick={() => setIsInfoPopupVisible(false)}
        >
          <div
            className="bg-black opacity-70 rounded-lg shadow-xl max-w-5xl w-full max-h-[calc(100vh-80px)] p-6 relative overflow-auto"
            onClick={e => e.stopPropagation()}
            style={{ minWidth: '400px' }}
          >
            <button
              onClick={() => setIsInfoPopupVisible(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl font-bold"
              title="Close"
            >
              &times;
            </button>

            <h2 className="text-3xl font-bold mb-6 text-white">Solar System Explorer - Controls</h2>
            
            <div className="space-y-6 text-white">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-blue-400">Navigation</h3>
                <ul className="list-disc list-inside space-y-2 text-lg leading-relaxed">
                  <li><strong>Mouse:</strong> Drag to rotate camera, scroll to zoom</li>
                  <li><strong>Keyboard:</strong> Press 1-8 to focus on planets, 9 for Sun, 0 to reset</li>
                  <li><strong>Camera Presets:</strong> Use the panel (left side) to quickly jump to any planet</li>
                  <li><strong>Click Planets:</strong> Click any planet to see detailed information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-green-400">Simulation Controls</h3>
                <ul className="list-disc list-inside space-y-2 text-lg leading-relaxed">
                  <li><strong>Pause/Resume:</strong> Click the pause button to stop/start simulation</li>
                  <li><strong>Speed Control:</strong> Use +/- buttons or hover over "Speed" for slider</li>
                  <li><strong>Orbit Paths:</strong> Toggle to show/hide predicted orbital paths</li>
                  <li><strong>Planet Labels:</strong> Toggle to show/hide planet name labels</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-yellow-400">Probe Missions</h3>
                <ul className="list-disc list-inside space-y-2 text-lg leading-relaxed">
                  <li><strong>Launch Probes:</strong> Use Probe Launcher (top left) to launch from Earth</li>
                  <li><strong>Mission Objectives:</strong> Check Missions panel (top left) for challenges</li>
                  <li><strong>Trajectory Preview:</strong> Orange line shows predicted probe path</li>
                  <li><strong>Gravity Assists:</strong> Plan trajectories to use planetary gravity</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-purple-400">Educational Features</h3>
                <ul className="list-disc list-inside space-y-2 text-lg leading-relaxed">
                  <li><strong>Planet Information:</strong> Click planets to learn facts and statistics</li>
                  <li><strong>Orbital Mechanics:</strong> Watch how planets orbit and interact</li>
                  <li><strong>Scale Visualization:</strong> See accurate distances and sizes</li>
                  <li><strong>Time Controls:</strong> Speed up time to see long-term orbital patterns</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlanetariumScene;

