// Physics utilities - pure functions for N-body simulation
// These can be used both in the main thread and web worker

// Gravitational constant scaled for our units:
// - Distance: 1 unit = 1 million km
// - Mass: relative to Earth (Earth = 1.0)
// Calculated to match real orbital velocities:
// Earth: v = 29.8 km/s = 0.0298 million km/s, r = 149.6, M_sun = 332946
// G = v^2 * r / M_sun ≈ 3.99e-7, using 3.8e-7 for good accuracy
// Must match the G in physicsWorker.js
export const G = 3.8e-7; // Scaled gravitational constant

// Calculate acceleration for a body at a given position
export function calculateAcceleration(currentBody, currentPos, allBodies) {
  const acc = { x: 0, y: 0, z: 0 };
  
  for (const otherBody of allBodies) {
    if (currentBody.id === otherBody.id) continue;
    
    const dx = otherBody.position.x - currentPos.x;
    const dy = otherBody.position.y - currentPos.y;
    const dz = otherBody.position.z - currentPos.z;
    
    const distanceSq = dx * dx + dy * dy + dz * dz;
    
    if (distanceSq > 1e-6) { // Avoid division by zero
      const distance = Math.sqrt(distanceSq);
      // F = G * m1 * m2 / r^2
      // a = F / m1 = G * m2 / r^2
      // Acceleration depends on OTHER body's mass, not current body's mass
      // This means probes ARE affected by planets, regardless of probe mass
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

// RK4 integration for a single body
export function rk4Step(body, allBodies, dt) {
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
  
  // Final update using weighted average
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

// Predict trajectory for a probe
export function predictTrajectory(probe, allBodies, timeScale, steps = 10000, maxTime = null) {
  // Create deep copies for simulation
  const simBodies = allBodies.map(body => ({
    id: body.id,
    mass: body.mass,
    position: { ...body.position },
    velocity: { ...body.velocity }
  }));
  
  const simProbe = {
    id: probe.id,
    mass: probe.mass,
    position: { ...probe.position },
    velocity: { ...probe.velocity }
  };
  
  const trajectory = [];
  const dt = timeScale * 0.016; // ~60fps equivalent
  const maxSteps = maxTime ? Math.floor(maxTime / dt) : steps;
  
  for (let step = 0; step < maxSteps && step < steps; step++) {
    // Store probe position
    trajectory.push({
      x: simProbe.position.x,
      y: simProbe.position.y,
      z: simProbe.position.z
    });
    
    // Update all bodies including probe
    const allSimBodies = [...simBodies, simProbe];
    
    // CRITICAL: Calculate all updates FIRST, then apply them simultaneously
    // This ensures proper N-body physics - all bodies use the same "current" positions
    const updates = [];
    for (let i = 0; i < allSimBodies.length; i++) {
      const result = rk4Step(allSimBodies[i], allSimBodies, dt);
      updates.push(result);
    }
    
    // Now apply all updates simultaneously
    for (let i = 0; i < allSimBodies.length; i++) {
      allSimBodies[i].velocity = updates[i].velocity;
      allSimBodies[i].position = updates[i].position;
    }
    
    // Check for collisions (optional - can be used to stop prediction early)
    for (const body of simBodies) {
      const dx = simProbe.position.x - body.position.x;
      const dy = simProbe.position.y - body.position.y;
      const dz = simProbe.position.z - body.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // If probe gets too close to a body, we could stop (optional)
      // if (distance < body.radius * 2) break;
    }
  }
  
  return trajectory;
}

