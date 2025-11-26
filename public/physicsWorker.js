// Web Worker for physics calculations
// This implements a full N-body simulation where EVERY body affects EVERY other body
// This solves the N-body problem (including the three-body problem) using RK4 integration

// Gravitational constant scaled for our units:
// - Distance: 1 unit = 1 million km = 1e9 m
// - Mass: relative to Earth (Earth = 1.0, but represents 5.97e24 kg)
// - Time: seconds
// G_real = 6.6743e-11 m^3/(kg*s^2)
// G_scaled = G_real * (mass_earth_kg) / (distance_unit_m)^3
// G_scaled = 6.6743e-11 * 5.97e24 / (1e9)^3
// G_scaled = 6.6743e-11 * 5.97e24 / 1e27
// G_scaled ≈ 3.984e-14 (but this is still too small for our scale)

// Calculate G to match real orbital velocities:
// Earth: v = 29.8 km/s = 0.0298 million km/s, r = 149.6 million km, M_sun = 332946
// v^2 = G * M_sun / r
// G = v^2 * r / M_sun = (0.0298)^2 * 149.6 / 332946 ≈ 3.99e-7
// With smaller time step (dt = 160s), we can use more accurate G value
const G = 3.8e-7; // Scaled gravitational constant - calibrated for accurate orbital velocities

// Calculate acceleration for a body considering gravitational forces from ALL other bodies
// This is the key to solving the N-body problem - not just sun-planet interactions
// CRITICAL: This function MUST consider ALL bodies including probes for proper N-body physics
function calculateAcceleration(currentBody, currentPos, allBodies) {
  const acc = { x: 0, y: 0, z: 0 };
  
  // Iterate through ALL bodies - planets affect planets AND probes, probes are affected by all planets
  // CRITICAL: For probes, this means they feel gravity from ALL planets, not just the sun
  // CRITICAL: Planets also affect each other (Jupiter affects Earth, etc.)
  // This is like Outer Wilds - every physics object is constantly being pulled by all others
  for (const otherBody of allBodies) {
    if (currentBody.id === otherBody.id) continue;
    
    const dx = otherBody.position.x - currentPos.x;
    const dy = otherBody.position.y - currentPos.y;
    const dz = otherBody.position.z - currentPos.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;
    
    if (distanceSq > 1e-6) {
      const distance = Math.sqrt(distanceSq);
      // F = G * m1 * m2 / r^2 (gravitational force)
      // a = F / m1 = (G * m1 * m2 / r^2) / m1 = G * m2 / r^2
      // So acceleration depends on the OTHER body's mass, not the current body's mass
      // This means:
      // - Probes ARE affected by planets (and the effect is independent of probe mass)
      // - Planets ARE affected by other planets (Jupiter affects Earth, etc.)
      const accelerationMagnitude = (G * otherBody.mass) / distanceSq;
      
      // Direction vector normalized (points from current body toward other body)
      const dirX = dx / distance;
      const dirY = dy / distance;
      const dirZ = dz / distance;
      
      acc.x += dirX * accelerationMagnitude;
      acc.y += dirY * accelerationMagnitude;
      acc.z += dirZ * accelerationMagnitude;
    }
  }
  
  return acc;
}

// RK4 integration step - calculates new position and velocity for a body
// CRITICAL: allBodies contains ALL bodies, so this calculates forces from ALL of them
function rk4Step(body, allBodies, dt) {
  // k1: acceleration and velocity at current position
  const k1v = calculateAcceleration(body, body.position, allBodies);
  const k1p = { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z };
  
  // k2: acceleration and velocity at midpoint using k1
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
  
  // k3: acceleration and velocity at midpoint using k2
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
  
  // k4: acceleration and velocity at endpoint using k3
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
  
  // Weighted average of all k values
  const dvx = (k1v.x + 2 * k2v.x + 2 * k3v.x + k4v.x) * dt / 6;
  const dvy = (k1v.y + 2 * k2v.y + 2 * k3v.y + k4v.y) * dt / 6;
  const dvz = (k1v.z + 2 * k2v.z + 2 * k3v.z + k4v.z) * dt / 6;
  const dpx = (k1p.x + 2 * k2p.x + 2 * k3p.x + k4p.x) * dt / 6;
  const dpy = (k1p.y + 2 * k2p.y + 2 * k3p.y + k4p.y) * dt / 6;
  const dpz = (k1p.z + 2 * k2p.z + 2 * k3p.z + k4p.z) * dt / 6;
  
  return {
    velocity: { x: body.velocity.x + dvx, y: body.velocity.y + dvy, z: body.velocity.z + dvz },
    position: { x: body.position.x + dpx, y: body.position.y + dpy, z: body.position.z + dpz }
  };
}

let bodies = [];
let timeScale = 1000; // Default speed
let isPaused = false;
let frameId = null;

// Main simulation loop - like Outer Wilds, every physics object is constantly being evaluated
function simulate() {
  if (isPaused) {
    frameId = setTimeout(simulate, 16);
    return;
  }
  
  if (bodies.length === 0) {
    frameId = setTimeout(simulate, 16);
    return;
  }
  
  const dt = timeScale * 0.016;
  
  // CRITICAL: Calculate all updates FIRST, then apply them simultaneously
  // This ensures all bodies use the same "current" positions when calculating forces
  // This is required for proper N-body physics (solving the N-body problem)
  // IMPORTANT: The 'bodies' array contains ALL bodies (planets, sun, AND probes)
  // When we pass 'bodies' to rk4Step, it calculates forces from ALL bodies
  
  // Calculate accelerations and updates for all bodies
  // Each body feels forces from ALL other bodies - this is the key to N-body physics
  const updates = [];
  for (let i = 0; i < bodies.length; i++) {
    // Calculate acceleration from ALL other bodies
    const acc = calculateAcceleration(bodies[i], bodies[i].position, bodies);
    
    // RK4 integration step - this uses the acceleration to update position and velocity
    const result = rk4Step(bodies[i], bodies, dt);
    updates.push(result);
    
    // Debug for three-body problem - log accelerations to verify forces are being calculated
    if (bodies.length === 3 && Math.random() < 0.01) {
      const body = bodies[i];
      const accMag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      console.log(`🔺 Body ${i+1} (${body.id.substring(0, 10)}):`, {
        pos: { x: body.position.x.toFixed(2), y: body.position.y.toFixed(2), z: body.position.z.toFixed(2) },
        vel: { x: body.velocity.x.toFixed(4), y: body.velocity.y.toFixed(4), z: body.velocity.z.toFixed(4) },
        acc: { x: acc.x.toExponential(2), y: acc.y.toExponential(2), z: acc.z.toExponential(2), mag: accMag.toExponential(2) },
        mass: body.mass
      });
    }
  }
  
  // Now apply all updates simultaneously
  // This is critical - all bodies update at the same time using the same "snapshot" of positions
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].velocity = updates[i].velocity;
    bodies[i].position = updates[i].position;
  }
  
  // Send updates to main thread
  // The main thread will update the visual positions of all bodies
  self.postMessage({
    type: 'update',
    bodies: bodies.map(body => ({
      id: body.id,
      position: { x: body.position.x, y: body.position.y, z: body.position.z },
      velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
    }))
  });
  
  frameId = setTimeout(simulate, 16);
}

self.onmessage = function(e) {
  const { type, data } = e.data;
  switch (type) {
    case 'init':
      bodies = data.bodies.map(body => ({
        id: body.id,
        mass: body.mass,
        position: { x: body.position.x, y: body.position.y, z: body.position.z },
        velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
      }));
      timeScale = data.timeScale || 10000;
      isPaused = data.isPaused || false;
      
      console.log('🚀 Physics worker initialized with', bodies.length, 'bodies');
      if (bodies.length === 3) {
        console.log('🔺 Three-body problem initialized:');
        bodies.forEach((b, i) => {
          console.log(`   Body ${i+1}: mass=${b.mass}, pos=(${b.position.x.toFixed(2)}, ${b.position.y.toFixed(2)}), vel=(${b.velocity.x.toFixed(4)}, ${b.velocity.y.toFixed(4)})`);
        });
      }
      
      if (frameId) clearTimeout(frameId);
      simulate();
      break;
    case 'updateBodies':
      bodies = data.bodies.map(body => ({
        id: body.id,
        mass: body.mass,
        position: { x: body.position.x, y: body.position.y, z: body.position.z },
        velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
      }));
      break;
    case 'setTimeScale':
      timeScale = data.timeScale;
      break;
    case 'setPaused':
      isPaused = data.isPaused;
      break;
    case 'addBody':
      const bodyToAdd = {
        id: data.body.id,
        mass: data.body.mass,
        position: { x: data.body.position.x, y: data.body.position.y, z: data.body.position.z },
        velocity: { x: data.body.velocity.x, y: data.body.velocity.y, z: data.body.velocity.z }
      };
      bodies.push(bodyToAdd);
      console.log('✅ Added body to simulation:', bodyToAdd.id, 'Total bodies:', bodies.length);
      console.log('All bodies in simulation:', bodies.map(b => ({ id: b.id, mass: b.mass, pos: b.position })));
      break;
    case 'removeBody':
      bodies = bodies.filter(b => b.id !== data.bodyId);
      break;
  }
};
