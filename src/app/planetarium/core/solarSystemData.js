// Accurate solar system data
// All values are scaled appropriately for the simulation while maintaining relative accuracy

// Scale factors for visualization
// Distance scale: Use a larger scale to prevent clustering
// 1 unit = 1 million km (simpler and prevents clustering)
// const DISTANCE_SCALE = 1; // 1 unit = 1 million km (currently unused)
const RADIUS_SCALE = 0.01; // Scale down radii for visibility (1 unit = 100 km)
// const MASS_SCALE = 1; // Keep masses in simulation units (relative to Earth) (currently unused)

// Real solar system data with accurate relative values
// Distances in million km (1 unit = 1 million km)
// Includes orbital inclinations and initial angles for 3D positioning
export const SOLAR_SYSTEM_DATA = {
  Sun: {
    radius: 696000 * RADIUS_SCALE, // 696,000 km
    mass: 332946, // Relative to Earth (Sun is 332,946x Earth's mass)
    sidereelTime: 2160000, // ~25 days in seconds
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 }
  },
  Mercury: {
    radius: 2440 * RADIUS_SCALE, // 2,440 km
    mass: 0.0553, // Relative to Earth (0.0553 Earth masses)
    sidereelTime: 5070374, // ~58.6 days
    distance: 57.9, // million km (semi-major axis)
    orbitalVelocity: 47.4, // km/s
    inclination: 7.0, // degrees (orbital plane tilt)
    longitudeOfAscendingNode: 48.3, // degrees
    argumentOfPerihelion: 29.1, // degrees
    meanAnomaly: 174.8 // degrees (initial position in orbit)
  },
  Venus: {
    radius: 6052 * RADIUS_SCALE, // 6,052 km
    mass: 0.815, // Relative to Earth (0.815 Earth masses)
    sidereelTime: -21097555, // retrograde rotation
    distance: 108.2, // million km
    orbitalVelocity: 35.0, // km/s
    inclination: 3.4, // degrees
    longitudeOfAscendingNode: 76.7, // degrees
    argumentOfPerihelion: 54.9, // degrees
    meanAnomaly: 50.1 // degrees
  },
  Earth: {
    radius: 6371 * RADIUS_SCALE, // 6,371 km
    mass: 1.0, // Reference mass (1 Earth mass)
    sidereelTime: 86400, // 1 day
    distance: 149.6, // million km (1 AU)
    orbitalVelocity: 29.8, // km/s
    inclination: 0.0, // degrees (reference plane)
    longitudeOfAscendingNode: 0.0, // degrees
    argumentOfPerihelion: 102.9, // degrees
    meanAnomaly: 358.6 // degrees
  },
  Mars: {
    radius: 3390 * RADIUS_SCALE, // 3,390 km
    mass: 0.107, // Relative to Earth (0.107 Earth masses)
    sidereelTime: 88642, // ~1.03 days
    distance: 227.9, // million km
    orbitalVelocity: 24.1, // km/s
    inclination: 1.9, // degrees
    longitudeOfAscendingNode: 49.6, // degrees
    argumentOfPerihelion: 286.5, // degrees
    meanAnomaly: 19.4 // degrees
  },
  Jupiter: {
    radius: 69911 * RADIUS_SCALE, // 69,911 km
    mass: 317.8, // Relative to Earth (317.8 Earth masses)
    sidereelTime: 35730, // ~9.9 hours
    distance: 778.5, // million km
    orbitalVelocity: 13.1, // km/s
    inclination: 1.3, // degrees
    longitudeOfAscendingNode: 100.5, // degrees
    argumentOfPerihelion: 273.9, // degrees
    meanAnomaly: 20.0 // degrees
  },
  Saturn: {
    radius: 58232 * RADIUS_SCALE, // 58,232 km
    mass: 95.2, // Relative to Earth (95.2 Earth masses)
    sidereelTime: 38361, // ~10.7 hours
    distance: 1432.0, // million km
    orbitalVelocity: 9.7, // km/s
    inclination: 2.5, // degrees
    longitudeOfAscendingNode: 113.7, // degrees
    argumentOfPerihelion: 339.4, // degrees
    meanAnomaly: 317.0 // degrees
  },
  Uranus: {
    radius: 25362 * RADIUS_SCALE, // 25,362 km
    mass: 14.5, // Relative to Earth (14.5 Earth masses)
    sidereelTime: -62121, // retrograde rotation
    distance: 2867.0, // million km
    orbitalVelocity: 6.8, // km/s
    inclination: 0.8, // degrees
    longitudeOfAscendingNode: 74.0, // degrees
    argumentOfPerihelion: 96.5, // degrees
    meanAnomaly: 142.2 // degrees
  },
  Neptune: {
    radius: 24622 * RADIUS_SCALE, // 24,622 km
    mass: 17.1, // Relative to Earth (17.1 Earth masses)
    sidereelTime: 58644, // ~16.1 hours
    distance: 4515.0, // million km
    orbitalVelocity: 5.4, // km/s
    inclination: 1.8, // degrees
    longitudeOfAscendingNode: 131.8, // degrees
    argumentOfPerihelion: 265.5, // degrees
    meanAnomaly: 256.2 // degrees
  }
};

// Convert degrees to radians
function degToRad(deg) {
  return deg * Math.PI / 180;
}

// Calculate 3D position and velocity from orbital elements
// This properly distributes planets in 3D space with correct inclinations
export function getInitialOrbitalData(planetName) {
  const data = SOLAR_SYSTEM_DATA[planetName];
  if (!data || !data.distance) {
    // Sun has no orbital data
    return { position: data.position, velocity: data.velocity };
  }

  // Orbital elements
  const a = data.distance; // Semi-major axis (in million km)
  const i = degToRad(data.inclination || 0); // Inclination
  const Ω = degToRad(data.longitudeOfAscendingNode || 0); // Longitude of ascending node
  const ω = degToRad(data.argumentOfPerihelion || 0); // Argument of perihelion
  const M = degToRad(data.meanAnomaly || 0); // Mean anomaly (initial position)
  
  // For circular orbit approximation, true anomaly ≈ mean anomaly
  const ν = M; // True anomaly
  
  // Calculate position in orbital plane (2D)
  // For circular orbit, distance is constant = semi-major axis
  // IMPORTANT: In standard orbital mechanics, orbits are in the x-y plane with z as "up"
  // But in Three.js, Y is "up", so we want orbits in the x-z plane
  // So we'll calculate in x-y plane first, then swap y and z for Three.js
  const r = a; // Distance in million km
  const x_orbital = r * Math.cos(ν);
  const y_orbital = r * Math.sin(ν);
  const z_orbital = 0;
  
  // Rotate to 3D space using orbital elements
  // Standard rotation sequence: R_z(Ω) * R_x(i) * R_z(ω)
  const cosΩ = Math.cos(Ω);
  const sinΩ = Math.sin(Ω);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);
  const cosω = Math.cos(ω);
  const sinω = Math.sin(ω);
  
  // First rotation: around z-axis by ω (argument of perihelion)
  const x1 = x_orbital * cosω - y_orbital * sinω;
  const y1 = x_orbital * sinω + y_orbital * cosω;
  const z1 = z_orbital;
  
  // Second rotation: around x-axis by i (inclination)
  const x2 = x1;
  const y2 = y1 * cosi - z1 * sini;
  const z2 = y1 * sini + z1 * cosi;
  
  // Third rotation: around z-axis by Ω (longitude of ascending node)
  const x_final = x2 * cosΩ - y2 * sinΩ;
  const y_final = x2 * sinΩ + y2 * cosΩ;
  const z_final = z2;
  
  // Convert from standard orbital mechanics (x-y plane, z up) to Three.js (x-z plane, y up)
  // Swap y and z: y becomes z, z becomes y
  const x = x_final;
  const y = z_final; // z in orbital mechanics becomes y in Three.js (up)
  const z = y_final; // y in orbital mechanics becomes z in Three.js (forward/back)
  
  // Calculate velocity for stable circular orbit
  // For circular orbit: v = sqrt(G * M_sun / r)
  // Where G is our scaled gravitational constant and M_sun is the sun's mass
  // Note: 'r' is already declared above as the orbital distance
  const G = 3.8e-7; // Scaled G (must match physicsWorker.js) - calibrated for accurate orbital velocities
  const M_sun = SOLAR_SYSTEM_DATA.Sun.mass; // Sun's mass (332946 Earth masses)
  
  // Calculate orbital velocity for stable circular orbit
  // v = sqrt(G * M_sun / r)
  // This ensures the centripetal force equals the gravitational force
  const orbitalVel = Math.sqrt(G * M_sun / r);
  
  
  // Velocity direction: perpendicular to position in orbital plane
  // In orbital plane: v_x = -v * sin(ν), v_y = v * cos(ν)
  const vx_orbital = -orbitalVel * Math.sin(ν);
  const vy_orbital = orbitalVel * Math.cos(ν);
  const vz_orbital = 0;
  
  // Rotate velocity to 3D space (same rotation sequence as position)
  // First rotation: around z-axis by ω
  const vx1 = vx_orbital * cosω - vy_orbital * sinω;
  const vy1 = vx_orbital * sinω + vy_orbital * cosω;
  const vz1 = vz_orbital;
  
  // Second rotation: around x-axis by i
  const vx2 = vx1;
  const vy2 = vy1 * cosi - vz1 * sini;
  const vz2 = vy1 * sini + vz1 * cosi;
  
  // Third rotation: around z-axis by Ω
  const vx_final = vx2 * cosΩ - vy2 * sinΩ;
  const vy_final = vx2 * sinΩ + vy2 * cosΩ;
  const vz_final = vz2;
  
  // Convert velocity from standard orbital mechanics to Three.js convention
  // Swap y and z components to match position conversion
  const vx = vx_final;
  const vy = vz_final; // z velocity becomes y velocity in Three.js
  const vz = vy_final; // y velocity becomes z velocity in Three.js
  
  return {
    position: { x, y, z },
    velocity: { x: vx, y: vy, z: vz }
  };
}

// Get scaled radius for visualization
// Planets are scaled relative to each other (accurate size relationships)
// Sun is on a separate scale so it doesn't dominate the view
// Get scaled radius for visualization
// Planets are scaled relative to each other (accurate size relationships)
// Sun is on a separate scale so it doesn't dominate the view
export function getVisualRadius(planetName) {
  const data = SOLAR_SYSTEM_DATA[planetName];
  if (!data) return 1;
  
  if (planetName === 'Sun') {
    // Sun: separate scale, visible but not overwhelming
    // Use a fixed size that's visible but much smaller than planet distances
    return 3.0; // Sun radius in visualization units
  }
  
  // Planets: scale relative to each other
  // Use Earth as reference (radius = 6371 km)
  // Scale factor: make planets visible while maintaining relative sizes
  const EARTH_RADIUS_KM = 6371;
  const PLANET_SCALE_FACTOR = 0.8; // Scale factor for planet visualization
  
  // Calculate relative size compared to Earth
  const earthBaseRadius = SOLAR_SYSTEM_DATA.Earth.radius / RADIUS_SCALE; // Earth radius in km
  const planetBaseRadius = data.radius / RADIUS_SCALE; // Planet radius in km
  const relativeSize = planetBaseRadius / earthBaseRadius; // Size relative to Earth
  
  // Earth will be the reference size
  const earthVisualRadius = EARTH_RADIUS_KM * PLANET_SCALE_FACTOR / 1000; // Earth = ~5 units
  
  // Scale all planets relative to Earth
  return earthVisualRadius * relativeSize;
}

