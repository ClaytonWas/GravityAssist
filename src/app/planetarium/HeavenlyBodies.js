import * as THREE from 'three';

export class HeavenlyBody {
    constructor(name, radius, mass, sidereelTime, spectatingDistance, position = { x: 0, y: 0, z: 0 }, velocity = { x: 0, y: 0, z: 0 }) {
        this.name = name;
        this.radius = radius;
        this.mass = mass;
        this.spectatingDistance = spectatingDistance;
        this.sidereelTime = sidereelTime;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.velocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
        
        // Calculate angular velocity with speed factor to make rotations visible
        // ROTATION_SPEED_FACTOR makes rotations 10000x faster for visual effect
        const ROTATION_SPEED_FACTOR = 10000;
        if (sidereelTime && Math.abs(sidereelTime) > 0.001) {
            this.angularVelocity = ((2 * Math.PI) / sidereelTime) * ROTATION_SPEED_FACTOR;
        } else {
            this.angularVelocity = 0;
            console.warn(`Planet ${name} has invalid sidereelTime: ${sidereelTime}, rotation disabled`);
        }
    }

    // Get velocity magnitude (speed)
    getSpeed() {
        return Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
    }

    updateVelocity(acceleration, deltaTime) {
        this.velocity.add(acceleration.clone().multiplyScalar(deltaTime));
    }      

    updatePosition(deltaTime) {
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    }
}

export class Star extends HeavenlyBody {
    constructor(name, radius, mass, sidereelTime, spectatingDistance, position, velocity) {
        super(name, radius, mass, sidereelTime, spectatingDistance, position, velocity);
    }
}

export class Planet extends HeavenlyBody {
    constructor(name, radius, mass, sidereelTime, spectatingDistance, position, velocity) {
        super(name, radius, mass, sidereelTime, spectatingDistance, position, velocity);
    }
}

export class Moon extends HeavenlyBody {
    constructor(name, radius, mass, sidereelTime, spectatingDistance, position, velocity) {
        super(name, radius, mass, sidereelTime, spectatingDistance, position, velocity);
    }
}