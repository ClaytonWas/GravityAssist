import * as THREE from 'three';
import { Star, Planet, Moon } from './HeavenlyBodies.js';

const gameWindow = document.getElementById('gameWindow');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000000);
let cameraTarget = null;
const textureLoader = new THREE.TextureLoader();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(gameWindow.clientWidth, gameWindow.clientHeight);
gameWindow.appendChild(renderer.domElement);

const axesHelper = new THREE.AxesHelper(1000);
scene.add(axesHelper);

camera.position.z = 17000000;

let bodies = [
    new Planet('Mercury', 2440, 30, 5068224, 20000, { x: 57900000, y: 300, z: 0 }, { x: 0, y: -0.1, z: 0 }, { x: 0, y: 0, z: 0 }),
    new Planet('Venus', 6052, 60, 20996760, 20000, { x: 108200000, y: 500, z: 0 }, { x: 0, y: -0.1, z: 0.1 }, { x: 0, y: 0, z: 0 }),
    new Planet('Earth', 6371, 80, 86160, 20000, { x: 149600000, y: 700, z: 0 }, { x: -29.8, y: -0, z: 0 }, { x: 0, y: 0, z: 0 }),
    new Planet('Mars', 3390, 80, 88560, 20000, { x: 227900000, y: 700, z: 0 }, { x: -12.4, y: -5.3, z: -1.5 }, { x: 0, y: 0, z: 0 }),
    new Planet('Jupiter', 69911, 80, 35700, 120000, { x: 778600000, y: 700, z: 0 }, { x: 13.1, y: 4.2, z: 2.5 }, { x: 10, y: 0, z: 0 }),
    new Planet('Saturn', 58232, 80, 37980, 120000, { x: 1433500000, y: 700, z: 0 }, { x: 9.7, y: 4.2, z: 1.8 }, { x: 0, y: 0, z: 0 }),
    new Planet('Uranus', 25362, 80, 62040, 120000, { x: 2872500000, y: 700, z: 0 }, { x: 6.8, y: 1.1, z: 1.4 }, { x: 0, y: 0, z: 0 }),
    new Planet('Neptune', 24622, 80, 57600, 120000, { x: 4495100000, y: 700, z: 0 }, { x: 5.4, y: 0.7, z: 1.2 }, { x: 0, y: 0, z: 0 }),
    new Star('Sun', 695700, 200000000000000, 2114208, 2000000, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
    new Moon('Moon', 1737, 1, 2114208, 20000, { x: 149984399, y: 0, z: 0 }, { x: 0, y: 9.9, z: 2.2 }, { x: 0, y: 0, z: 0 }),
];

let bodyMeshes = [];

// Create meshes for each heavenly body
bodies.forEach((body) => {
    const texture = textureLoader.load(`./textures/${body.name}.jpg`); 

    const bodyGeometry = new THREE.SphereGeometry(body.radius, 64, 32);
    const bodyMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.copy(body.position);
    
    scene.add(bodyMesh);
    bodyMeshes.push(bodyMesh);
});

const G = 6.6743e-11; // N⋅m^{2}⋅kg^{−2}
const dTime = 1200; // Seconds

// Gravity calculation function to apply forces between bodies
function gravityCalculation(body1, body2) {
    let gravitationalVector = new THREE.Vector3().subVectors(body2.position, body1.position);
    let distance = gravitationalVector.length();

    if (distance === 0) return;

    gravitationalVector.normalize();
    let gravitationalForce = (G * body1.mass * body2.mass) / (distance ** 2);
    gravitationalVector.multiplyScalar(gravitationalForce);

    let acceleration1 = gravitationalVector.clone().divideScalar(body1.mass);
    let acceleration2 = gravitationalVector.clone().negate().divideScalar(body2.mass);

    body1.velocity.add(acceleration1.multiplyScalar(dTime));
    body2.velocity.add(acceleration2.multiplyScalar(dTime));

    body1.position.add(body1.velocity.clone().multiplyScalar(dTime));
    body2.position.add(body2.velocity.clone().multiplyScalar(dTime));
}

// Update gravity for all bodies
function updateGravity() {
    bodies.forEach((body) => {
        // Apply gravity between bodies
        bodies.forEach((otherBody) => {
            if (body !== otherBody) {
                gravityCalculation(body, otherBody);
            }
        });
    });
}

function animate() {
    updateGravity(); // Calculate gravity for all bodies

    bodies.forEach((body, index) => {
        bodyMeshes[index].position.copy(body.position); // Update the position of meshes
        bodyMeshes[index].rotation.y += body.angularVelocity * dTime; // Update the sidereel rotation of meshes
    });

    if (cameraTarget) {
        camera.position.copy(cameraTarget.position).add(new THREE.Vector3(0, 0, cameraTarget.spectatingDistance));
        camera.lookAt(cameraTarget.position);
    }

    renderer.render(scene, camera);
}

// Keyboard binds
const keyboardBinds = {
    'q': () => {
        camera.position.y += 5000;
    },
    'w': () => {
        camera.position.z -= 15000;
    },
    'e': () => {
        camera.position.y -= 5000;
    },
    'a': () => {
        camera.position.x -= 15000;
    },
    's': () => {
        camera.position.z += 15000;
    },
    'd': () => {
        camera.position.x += 15000;
    },
    'ArrowUp': () => {
        camera.rotation.x += 0.1;
    },
    'ArrowDown': () => {
        camera.rotation.x -= 0.1;
    },
    'ArrowRight': () => {
        camera.rotation.y -= 0.1;
    },
    'ArrowLeft': () => {
        camera.rotation.y += 0.1;
    },
    '1': () => {
        console.log('Teleporting to Mercury');
        cameraTarget = bodies[0];
    },
    '2': () => {
        console.log('Teleporting to Venus');
        cameraTarget = bodies[1];
    },
    '3': () => {
        console.log('Teleporting to Earth');
        cameraTarget = bodies[2];
    },
    '4': () => {
        console.log('Teleporting to Mars');
        cameraTarget = bodies[3];
    },
    '5': () => {
        console.log('Teleporting to Jupiter');
        cameraTarget = bodies[4];
    },
    '6': () => {
        console.log('Teleporting to Saturn');
        cameraTarget = bodies[5];
    },
    '7': () => {
        console.log('Teleporting to Uranus');
        cameraTarget = bodies[6];
    },
    '8': () => {
        console.log('Teleporting to Neptune');
        cameraTarget = bodies[7];
    },
    '0': () => {
        console.log('Teleporting to Sun');
        cameraTarget = bodies[8];
    },
    '9': () => {
        console.log('Teleporting to Moon');
        cameraTarget = bodies[9];
    },
    '-': () => {
        console.log('Camera target set to null');
        cameraTarget = null;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    renderer.setAnimationLoop(animate);

    // Keyboard Binds Listener
    document.addEventListener('keydown', (event) => {
        const key = event.key;
        if (keyboardBinds[key]) {
            keyboardBinds[key]();
        }
    });
});
