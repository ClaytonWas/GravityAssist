import { HeavenlyBody } from '../HeavenlyBodies';

export class Probe extends HeavenlyBody {
  constructor(name, position, velocity, mass = 0.001) {
    // Probes are very small and light, but mass doesn't affect how planets pull on them
    // The acceleration a = F/m = (G*m1*m2/r^2)/m1 = G*m2/r^2 (m1 cancels out)
    // So probe mass only matters for probe-probe interactions, not planet-probe
    // HeavenlyBody(name, radius, mass, sidereelTime, spectatingDistance, position, velocity)
    super(name, 0.1, mass, 0, 5, position, velocity);
    this.id = `probe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.launchTime = Date.now();
    this.isActive = true;
    this.trajectory = null; // Predicted trajectory
  }

  // Get velocity magnitude
  getSpeed() {
    return Math.sqrt(
      this.velocity.x * this.velocity.x +
      this.velocity.y * this.velocity.y +
      this.velocity.z * this.velocity.z
    );
  }

  // Get distance to a body
  getDistanceTo(body) {
    const dx = body.position.x - this.position.x;
    const dy = body.position.y - this.position.y;
    const dz = body.position.z - this.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Check if probe has collided with a body
  checkCollision(body) {
    const distance = this.getDistanceTo(body);
    return distance < body.radius * 1.1; // Small buffer
  }

  // Convert to serializable format for web worker
  toSerializable() {
    return {
      id: this.id,
      name: this.name,
      mass: this.mass,
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
        z: this.velocity.z
      }
    };
  }

  // Create from serializable format
  static fromSerializable(data) {
    const probe = new Probe(
      data.name,
      data.position,
      data.velocity,
      data.mass
    );
    probe.id = data.id;
    return probe;
  }
}

