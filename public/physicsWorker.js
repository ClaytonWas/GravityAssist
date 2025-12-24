// Highly Optimized N-Body Physics Simulation Worker
// Uses typed arrays, object pooling, and inlined math for maximum performance

let G = 1.0;
let n = 0;  // Number of bodies
let timeScale = 1;
let isPaused = false;
let frameId = null;

// Pre-allocated typed arrays for maximum performance (avoid GC)
const MAX_BODIES = 64;

// State arrays - using Float64Array for precision
const mass = new Float64Array(MAX_BODIES);
const px = new Float64Array(MAX_BODIES);
const py = new Float64Array(MAX_BODIES);
const pz = new Float64Array(MAX_BODIES);
const vx = new Float64Array(MAX_BODIES);
const vy = new Float64Array(MAX_BODIES);
const vz = new Float64Array(MAX_BODIES);

// Temporary arrays for RK4 (pre-allocated)
const px0 = new Float64Array(MAX_BODIES);
const py0 = new Float64Array(MAX_BODIES);
const pz0 = new Float64Array(MAX_BODIES);
const vx0 = new Float64Array(MAX_BODIES);
const vy0 = new Float64Array(MAX_BODIES);
const vz0 = new Float64Array(MAX_BODIES);

// k1-k4 acceleration arrays
const k1ax = new Float64Array(MAX_BODIES);
const k1ay = new Float64Array(MAX_BODIES);
const k1az = new Float64Array(MAX_BODIES);
const k2ax = new Float64Array(MAX_BODIES);
const k2ay = new Float64Array(MAX_BODIES);
const k2az = new Float64Array(MAX_BODIES);
const k3ax = new Float64Array(MAX_BODIES);
const k3ay = new Float64Array(MAX_BODIES);
const k3az = new Float64Array(MAX_BODIES);
const k4ax = new Float64Array(MAX_BODIES);
const k4ay = new Float64Array(MAX_BODIES);
const k4az = new Float64Array(MAX_BODIES);

// Temp position arrays for RK4 stages
const tmpPx = new Float64Array(MAX_BODIES);
const tmpPy = new Float64Array(MAX_BODIES);
const tmpPz = new Float64Array(MAX_BODIES);

// Body IDs (strings stored separately)
const bodyIds = new Array(MAX_BODIES);

// Softening squared (prevents division by zero)
const SOFTENING_SQ = 0.000001;

// Calculate all accelerations given positions
// Inlined for performance - avoids function call overhead
function computeAccelerations(posX, posY, posZ, outAx, outAy, outAz) {
  for (let i = 0; i < n; i++) {
    let ax = 0, ay = 0, az = 0;
    const xi = posX[i], yi = posY[i], zi = posZ[i];
    
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      
      const dx = posX[j] - xi;
      const dy = posY[j] - yi;
      const dz = posZ[j] - zi;
      
      const distSq = dx * dx + dy * dy + dz * dz + SOFTENING_SQ;
      const dist = Math.sqrt(distSq);
      const invDist3 = 1.0 / (distSq * dist);
      const f = G * mass[j] * invDist3;
      
      ax += f * dx;
      ay += f * dy;
      az += f * dz;
    }
    
    outAx[i] = ax;
    outAy[i] = ay;
    outAz[i] = az;
  }
}

// RK4 integration - fully optimized with typed arrays
function integrateRK4(dt) {
  if (n === 0) return;
  
  const dt2 = dt * 0.5;
  const dt6 = dt / 6.0;
  
  // Save initial state
  for (let i = 0; i < n; i++) {
    px0[i] = px[i];
    py0[i] = py[i];
    pz0[i] = pz[i];
    vx0[i] = vx[i];
    vy0[i] = vy[i];
    vz0[i] = vz[i];
  }
  
  // k1: acceleration at current position
  computeAccelerations(px, py, pz, k1ax, k1ay, k1az);
  
  // k2: acceleration at midpoint using k1
  for (let i = 0; i < n; i++) {
    tmpPx[i] = px0[i] + vx0[i] * dt2;
    tmpPy[i] = py0[i] + vy0[i] * dt2;
    tmpPz[i] = pz0[i] + vz0[i] * dt2;
  }
  computeAccelerations(tmpPx, tmpPy, tmpPz, k2ax, k2ay, k2az);
  
  // k3: acceleration at midpoint using k2
  for (let i = 0; i < n; i++) {
    const vxMid = vx0[i] + k1ax[i] * dt2;
    const vyMid = vy0[i] + k1ay[i] * dt2;
    const vzMid = vz0[i] + k1az[i] * dt2;
    tmpPx[i] = px0[i] + vxMid * dt2;
    tmpPy[i] = py0[i] + vyMid * dt2;
    tmpPz[i] = pz0[i] + vzMid * dt2;
  }
  computeAccelerations(tmpPx, tmpPy, tmpPz, k3ax, k3ay, k3az);
  
  // k4: acceleration at endpoint using k3
  for (let i = 0; i < n; i++) {
    const vxEnd = vx0[i] + k2ax[i] * dt;
    const vyEnd = vy0[i] + k2ay[i] * dt;
    const vzEnd = vz0[i] + k2az[i] * dt;
    tmpPx[i] = px0[i] + vxEnd * dt;
    tmpPy[i] = py0[i] + vyEnd * dt;
    tmpPz[i] = pz0[i] + vzEnd * dt;
  }
  computeAccelerations(tmpPx, tmpPy, tmpPz, k4ax, k4ay, k4az);
  
  // Final update: weighted average
  for (let i = 0; i < n; i++) {
    // Update velocities
    vx[i] = vx0[i] + (k1ax[i] + 2.0 * k2ax[i] + 2.0 * k3ax[i] + k4ax[i]) * dt6;
    vy[i] = vy0[i] + (k1ay[i] + 2.0 * k2ay[i] + 2.0 * k3ay[i] + k4ay[i]) * dt6;
    vz[i] = vz0[i] + (k1az[i] + 2.0 * k2az[i] + 2.0 * k3az[i] + k4az[i]) * dt6;
    
    // Update positions using velocity (k values are velocities for position)
    px[i] = px0[i] + (vx0[i] + 2.0 * (vx0[i] + k1ax[i] * dt2) + 2.0 * (vx0[i] + k2ax[i] * dt2) + (vx0[i] + k3ax[i] * dt)) * dt6;
    py[i] = py0[i] + (vy0[i] + 2.0 * (vy0[i] + k1ay[i] * dt2) + 2.0 * (vy0[i] + k2ay[i] * dt2) + (vy0[i] + k3ay[i] * dt)) * dt6;
    pz[i] = pz0[i] + (vz0[i] + 2.0 * (vz0[i] + k1az[i] * dt2) + 2.0 * (vz0[i] + k2az[i] * dt2) + (vz0[i] + k3az[i] * dt)) * dt6;
  }
}

// Leapfrog integration - faster alternative, good energy conservation
function integrateLeapfrog(dt) {
  if (n === 0) return;
  
  const dt2 = dt * 0.5;
  
  // Half-step velocity update
  computeAccelerations(px, py, pz, k1ax, k1ay, k1az);
  for (let i = 0; i < n; i++) {
    vx[i] += k1ax[i] * dt2;
    vy[i] += k1ay[i] * dt2;
    vz[i] += k1az[i] * dt2;
  }
  
  // Full-step position update
  for (let i = 0; i < n; i++) {
    px[i] += vx[i] * dt;
    py[i] += vy[i] * dt;
    pz[i] += vz[i] * dt;
  }
  
  // Half-step velocity update
  computeAccelerations(px, py, pz, k1ax, k1ay, k1az);
  for (let i = 0; i < n; i++) {
    vx[i] += k1ax[i] * dt2;
    vy[i] += k1ay[i] * dt2;
    vz[i] += k1az[i] * dt2;
  }
}

// Pre-allocate output object to avoid GC
const outputBodies = new Array(MAX_BODIES);
for (let i = 0; i < MAX_BODIES; i++) {
  outputBodies[i] = {
    id: '',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 }
  };
}

// Main simulation loop
function simulate() {
  if (!isPaused && n > 0) {
    // Adaptive substeps based on body count
    const substeps = n > 20 ? 4 : (n > 10 ? 6 : 8);
    const dt = (timeScale * 0.016) / substeps;
    
    // Use leapfrog for speed, RK4 for accuracy
    // Leapfrog is ~2x faster and has good energy conservation
    for (let i = 0; i < substeps; i++) {
      integrateLeapfrog(dt);
    }
    
    // Build output (reuse objects to avoid GC)
    for (let i = 0; i < n; i++) {
      outputBodies[i].id = bodyIds[i];
      outputBodies[i].position.x = px[i];
      outputBodies[i].position.y = py[i];
      outputBodies[i].position.z = pz[i];
      outputBodies[i].velocity.x = vx[i];
      outputBodies[i].velocity.y = vy[i];
      outputBodies[i].velocity.z = vz[i];
    }
    
    // Send update - reuse array, just set length
    self.postMessage({
      type: 'update',
      bodies: outputBodies,
      bodyCount: n
    });
  }
  
  frameId = setTimeout(simulate, 16);
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'init':
      if (data.gConstant !== undefined) {
        G = data.gConstant;
      }
      
      // Initialize bodies into typed arrays
      n = Math.min(data.bodies.length, MAX_BODIES);
      for (let i = 0; i < n; i++) {
        const b = data.bodies[i];
        bodyIds[i] = b.id;
        mass[i] = b.mass;
        px[i] = b.position.x;
        py[i] = b.position.y;
        pz[i] = b.position.z;
        vx[i] = b.velocity.x;
        vy[i] = b.velocity.y;
        vz[i] = b.velocity.z;
      }
      
      timeScale = data.timeScale || 1;
      isPaused = data.isPaused || false;
      
      console.log('Physics initialized:', { G, timeScale, bodyCount: n });
      
      if (frameId) clearTimeout(frameId);
      simulate();
      break;
      
    case 'updateBodies':
      n = Math.min(data.bodies.length, MAX_BODIES);
      for (let i = 0; i < n; i++) {
        const b = data.bodies[i];
        bodyIds[i] = b.id;
        mass[i] = b.mass;
        px[i] = b.position.x;
        py[i] = b.position.y;
        pz[i] = b.position.z;
        vx[i] = b.velocity.x;
        vy[i] = b.velocity.y;
        vz[i] = b.velocity.z;
      }
      break;
      
    case 'setTimeScale':
      timeScale = data.timeScale;
      break;
      
    case 'setPaused':
      isPaused = data.isPaused;
      break;
      
    case 'addBody':
      if (n < MAX_BODIES) {
        const b = data.body || data;
        if (b && b.id) {
          bodyIds[n] = b.id;
          mass[n] = b.mass;
          px[n] = b.position.x;
          py[n] = b.position.y;
          pz[n] = b.position.z;
          vx[n] = b.velocity.x;
          vy[n] = b.velocity.y;
          vz[n] = b.velocity.z;
          n++;
        }
      }
      break;
      
    case 'removeBody':
      const idx = bodyIds.indexOf(data.bodyId);
      if (idx !== -1 && idx < n) {
        // Swap with last element and decrement count
        n--;
        if (idx < n) {
          bodyIds[idx] = bodyIds[n];
          mass[idx] = mass[n];
          px[idx] = px[n];
          py[idx] = py[n];
          pz[idx] = pz[n];
          vx[idx] = vx[n];
          vy[idx] = vy[n];
          vz[idx] = vz[n];
        }
      }
      break;
  }
};
