import * as THREE from 'three';

class HeavenlyBodies {
    constructor(name, radius, mass, sidereelTime, position = { x: 0, y: 0, z: 0 }, velocity = { x: 0, y: 0, z: 0 }) {
        this.name = name;
        this.radius = radius;
        this.mass = mass;
        this.sidereelTime = sidereelTime; //Seconds for complete rotation
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.velocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
        this.angularVelocity = (2*Math.PI)/sidereelTime
    }

    updateVelocity(deltaTime) {
        this.velocity.add(acceleration.clone().multiplyScalar(deltaTime));
    }

    updatePosition(deltaTime) {
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    }
}

export class Star extends HeavenlyBodies {
    constructor(name, radius, mass, sidereelTime, position, velocity) {
        super(name, radius, mass, sidereelTime, position, velocity);
    }
}

export class Planet extends HeavenlyBodies {
    constructor(name, radius, mass, sidereelTime, position, velocity) {
        super(name, radius, mass, sidereelTime, position, velocity);
    }
}

export class Moon extends HeavenlyBodies {
    constructor(name, radius, mass, sidereelTime, position, velocity) {
        super(name, radius, mass, sidereelTime, position, velocity);
    }
}