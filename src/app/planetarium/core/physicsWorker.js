// Web Worker for physics calculations
// This runs in a separate thread to avoid blocking the main thread

// Gravitational constant - must match the scaled G used in physics.js
const G = 1.5e-7; // Scaled gravitational constant for our mass/distance/time scales

// Calculate acceleration for a body at a given position
function calculateAcceleration(currentBody, currentPos, allBodies) {
  const acc = { x: 0, y: 0, z: 0 };
  
  for (const otherBody of allBodies) {
    if (currentBody.id === otherBody.id) continue;
    
    const dx = otherBody.position.x - currentPos.x;
    const dy = otherBody.position.y - currentPos.y;
    const dz = otherBody.position.z - currentPos.z;
    
    const distanceSq = dx * dx + dy * dy + dz * dz;
    
    if (distanceSq > 1e-6) {
      const distance = Math.sqrt(distanceSq);
      const forceMagnitude = (G * currentBody.mass * otherBody.mass) / distanceSq;
      const forcePerMass = forceMagnitude / currentBody.mass;
      
      acc.x += (dx / distance) * forcePerMass;
      acc.y += (dy / distance) * forcePerMass;
      acc.z += (dz / distance) * forcePerMass;
    }
  }
  
  return acc;
}

// RK4 integration for a single body
function rk4Step(body, allBodies, dt) {
  // k1
  const k1v = calculateAcceleration(body, body.position, allBodies);
  const k1p = { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z };
  
  // k2
  const pos2 = {
    x: body.position.x + k1p.x * dt / 2,
    y: body.position.y + k1p.y * dt / 2,
    z: body.position.z + k1p.z * dt / 2
  };
  const vel2 = {
    x: body.velocity.x + k1v.x * dt / 2,
    y: body.velocity.y + k1v.y * dt / 2,
    z: body.velocity.z + k1v.z * dt / 2
  };
  const k2v = calculateAcceleration(body, pos2, allBodies);
  const k2p = { x: vel2.x, y: vel2.y, z: vel2.z };
  
  // k3
  const pos3 = {
    x: body.position.x + k2p.x * dt / 2,
    y: body.position.y + k2p.y * dt / 2,
    z: body.position.z + k2p.z * dt / 2
  };
  const vel3 = {
    x: body.velocity.x + k2v.x * dt / 2,
    y: body.velocity.y + k2v.y * dt / 2,
    z: body.velocity.z + k2v.z * dt / 2
  };
  const k3v = calculateAcceleration(body, pos3, allBodies);
  const k3p = { x: vel3.x, y: vel3.y, z: vel3.z };
  
  // k4
  const pos4 = {
    x: body.position.x + k3p.x * dt,
    y: body.position.y + k3p.y * dt,
    z: body.position.z + k3p.z * dt
  };
  const vel4 = {
    x: body.velocity.x + k3v.x * dt,
    y: body.velocity.y + k3v.y * dt,
    z: body.velocity.z + k3v.z * dt
  };
  const k4v = calculateAcceleration(body, pos4, allBodies);
  const k4p = { x: vel4.x, y: vel4.y, z: vel4.z };
  
  // Final update
  const dvx = (k1v.x + 2 * k2v.x + 2 * k3v.x + k4v.x) * dt / 6;
  const dvy = (k1v.y + 2 * k2v.y + 2 * k3v.y + k4v.y) * dt / 6;
  const dvz = (k1v.z + 2 * k2v.z + 2 * k3v.z + k4v.z) * dt / 6;
  
  const dpx = (k1p.x + 2 * k2p.x + 2 * k3p.x + k4p.x) * dt / 6;
  const dpy = (k1p.y + 2 * k2p.y + 2 * k3p.y + k4p.y) * dt / 6;
  const dpz = (k1p.z + 2 * k2p.z + 2 * k3p.z + k4p.z) * dt / 6;
  
  return {
    velocity: {
      x: body.velocity.x + dvx,
      y: body.velocity.y + dvy,
      z: body.velocity.z + dvz
    },
    position: {
      x: body.position.x + dpx,
      y: body.position.y + dpy,
      z: body.position.z + dpz
    }
  };
}

let bodies = [];
let timeScale = 75000;
let isPaused = false;
let frameId = null;

// Main simulation loop
function simulate() {
  if (isPaused) {
    frameId = setTimeout(simulate, 16); // ~60fps
    return;
  }
  
  const dt = timeScale * 0.016; // ~60fps equivalent
  
  // CRITICAL: Calculate all updates FIRST, then apply them simultaneously
  // This ensures all bodies use the same "current" positions when calculating forces
  // This is required for proper N-body physics (solving the N-body problem)
  const updates = [];
  for (let i = 0; i < bodies.length; i++) {
    const result = rk4Step(bodies[i], bodies, dt);
    updates.push(result);
  }
  
  // Now apply all updates simultaneously
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].velocity = updates[i].velocity;
    bodies[i].position = updates[i].position;
  }
  
  // Send updated positions back to main thread
  self.postMessage({
    type: 'update',
    bodies: bodies.map(body => ({
      id: body.id,
      position: { ...body.position },
      velocity: { ...body.velocity }
    }))
  });
  
  frameId = setTimeout(simulate, 16);
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'init':
      bodies = data.bodies.map(body => ({
        id: body.id,
        mass: body.mass,
        position: { ...body.position },
        velocity: { ...body.velocity }
      }));
      timeScale = data.timeScale || 75000;
      isPaused = data.isPaused || false;
      
      // Start simulation
      if (frameId) clearTimeout(frameId);
      simulate();
      break;
      
    case 'updateBodies':
      // Update body positions/velocities (for adding probes, etc.)
      bodies = data.bodies.map(body => ({
        id: body.id,
        mass: body.mass,
        position: { ...body.position },
        velocity: { ...body.velocity }
      }));
      break;
      
    case 'setTimeScale':
      timeScale = data.timeScale;
      break;
      
    case 'setPaused':
      isPaused = data.isPaused;
      break;
      
    case 'addBody':
      // Handle both message formats for compatibility
      const bodyToAdd = data.body || data;
      if (bodyToAdd && bodyToAdd.id) {
        bodies.push({
          id: bodyToAdd.id,
          mass: bodyToAdd.mass,
          position: { ...bodyToAdd.position },
          velocity: { ...bodyToAdd.velocity }
        });
      }
      break;
      
    case 'removeBody':
      bodies = bodies.filter(body => body.id !== data.bodyId);
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

