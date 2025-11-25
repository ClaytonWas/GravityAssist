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
        this.angularVelocity = (2*Math.PI)/sidereelTime;
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