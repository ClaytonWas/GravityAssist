import { SOLAR_SYSTEM_DATA } from './solarSystemData';

export const LEVELS = {
  SOLAR_SYSTEM: {
    id: 'SOLAR_SYSTEM',
    name: 'Solar System',
    description: 'Our home system',
    simulationType: 'solarSystem',
    gConstant: 3.8e-7,
    defaultTimeScale: 1000,
    bodies: SOLAR_SYSTEM_DATA,
    cameraPosition: { x: 0, y: 200, z: 400 }
  },
  THREE_BODY: {
    id: 'THREE_BODY',
    name: 'Three Body Problem',
    description: 'Stable Figure-8 Orbit',
    simulationType: 'threeBody',
    gConstant: 1e-6,
    defaultTimeScale: 500,
    bodies: {
      Body1: {
        mass: 1e6,
        radius: 15,
        color: 0xFF4444,
        position: { x: 97, y: -24.3, z: 0 },
        velocity: { x: 0.0466, y: 0.0432, z: 0 }
      },
      Body2: {
        mass: 1e6,
        radius: 15,
        color: 0x44FF44,
        position: { x: -97, y: 24.3, z: 0 },
        velocity: { x: 0.0466, y: 0.0432, z: 0 }
      },
      Body3: {
        mass: 1e6,
        radius: 15,
        color: 0x4444FF,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: -0.0932, y: -0.0865, z: 0 }
      }
    },
    cameraPosition: { x: 0, y: 0, z: 500 }
  },
  OUTER_WILDS: {
    id: 'OUTER_WILDS',
    name: 'Outer Wilds System',
    description: 'A cozy pocket solar system',
    simulationType: 'outerWilds',
    gConstant: 5e-5,  // Increased G for visible motion
    defaultTimeScale: 100,
    // Outer Wilds-inspired system - orbital velocities: v = sqrt(G*M/r)
    // With G=5e-5, M_sun=1e7: v = sqrt(5e-5 * 1e7 / r) = sqrt(500/r)
    bodies: {
      // The Sun - central star
      Sun: {
        mass: 1e7,
        radius: 30,
        color: 0xFFAA33,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }
      },
      // Timber Hearth - home world (r=200, v=sqrt(500/200)=1.58)
      TimberHearth: {
        mass: 1000,
        radius: 8,
        color: 0x4A7C4E,
        position: { x: 200, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 1.58 }
      },
      // Brittle Hollow (r=350, v=sqrt(500/350)=1.20)
      BrittleHollow: {
        mass: 1200,
        radius: 10,
        color: 0x6B4E71,
        position: { x: 0, y: 0, z: 350 },
        velocity: { x: 1.20, y: 0, z: 0 }
      },
      // Giant's Deep - ocean giant (r=550, v=sqrt(500/550)=0.95)
      GiantsDeep: {
        mass: 5000,
        radius: 18,
        color: 0x2E8B57,
        position: { x: -550, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -0.95 }
      },
      // Hourglass Twins - binary pair orbiting sun (r=120, v=sqrt(500/120)=2.04)
      AshTwin: {
        mass: 800,
        radius: 6,
        color: 0xD2691E,
        position: { x: 120, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 2.04 }
      },
      EmberTwin: {
        mass: 800,
        radius: 7,
        color: 0xCD853F,
        position: { x: 135, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 1.93 }
      },
      // Dark Bramble - outer mysterious planet (r=800, v=sqrt(500/800)=0.79)
      DarkBramble: {
        mass: 2000,
        radius: 14,
        color: 0x2F4F4F,
        position: { x: 800, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0.79 }
      },
      // The Interloper - comet with highly elliptical orbit
      // At perihelion (r=50): circular v ≈ 3.16, escape v ≈ 4.47
      // Using v ≈ 4.0 gives a very elongated ellipse that shoots into deep space
      Interloper: {
        mass: 50,
        radius: 3,
        color: 0xADD8E6,
        position: { x: 50, y: 8, z: 0 },
        velocity: { x: 0, y: 0.4, z: 4.1 }
      }
    },
    cameraPosition: { x: 0, y: 600, z: 1000 }
  }
};
