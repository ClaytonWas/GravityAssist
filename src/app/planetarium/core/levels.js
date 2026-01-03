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
    gConstant: 5e-7,  // Reduced G, increased masses to compensate
    defaultTimeScale: 100,
    // Scaled up system - all masses 100x larger, G reduced 100x
    // Orbital velocities unchanged: v = sqrt(G*M/r) = sqrt(5e-7 * 1e9 / r) = sqrt(500/r)
    bodies: {
      // The Sun - central star (100x mass)
      Sun: {
        mass: 1e9,
        radius: 30,
        color: 0xFFAA33,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }
      },
      // Timber Hearth - home world (r=200, v=sqrt(500/200)=1.58)
      TimberHearth: {
        mass: 100000,
        radius: 8,
        color: 0x4A7C4E,
        position: { x: 200, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 1.58 }
      },
      // Brittle Hollow (r=350, v=sqrt(500/350)=1.20)
      BrittleHollow: {
        mass: 120000,
        radius: 10,
        color: 0x6B4E71,
        position: { x: 0, y: 0, z: 350 },
        velocity: { x: 1.20, y: 0, z: 0 }
      },
      // Giant's Deep - ocean giant (r=550, v=sqrt(500/550)=0.95)
      GiantsDeep: {
        mass: 500000,
        radius: 18,
        color: 0x2E8B57,
        position: { x: -550, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -0.95 }
      },
      // Hourglass Twins - visually orbit each other, physics treats as single body
      // The visual binary rotation is handled in PlanetariumScene
      AshTwin: {
        mass: 100000,
        radius: 5,
        color: 0xD2691E,
        position: { x: 120, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 2.04 },
        // Custom data for visual binary effect
        isBinarySystem: true,
        binaryPartner: {
          name: 'EmberTwin',
          radius: 6,
          color: 0xCD853F
        },
        binarySeparation: 20,  // Distance between the two bodies
        binaryPeriod: 1.5      // Rotation speed multiplier
      },
      // Dark Bramble - outer mysterious planet (r=800, v=sqrt(500/800)=0.79)
      DarkBramble: {
        mass: 200000,
        radius: 14,
        color: 0x2F4F4F,
        position: { x: 800, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0.79 }
      },
      // The Interloper - comet with highly elliptical orbit
      Interloper: {
        mass: 5000,
        radius: 3,
        color: 0xADD8E6,
        position: { x: 150, y: 8, z: 0 },
        velocity: { x: 0, y: 0.3, z: 2.4 }
      }
    },
    cameraPosition: { x: 0, y: 600, z: 1000 }
  }
};
