'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function PlanetLabels({ bodies, bodyMeshes, camera, scene, labelsRef: externalLabelsRef }) {
  const internalLabelsRef = useRef([]);
  const labelsRef = externalLabelsRef || internalLabelsRef;

  useEffect(() => {
    if (!bodies || !bodyMeshes || !camera || !scene) return;

    // Create labels for new bodies
    bodies.forEach((body, index) => {
      const mesh = bodyMeshes[index];
      if (!mesh) return;

      let label = labelsRef.current[index];
      
      if (!label) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw text
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(body.name, canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(10, 2.5, 1);
        sprite.userData.bodyName = body.name;
        sprite.userData.bodyIndex = index;
        scene.add(sprite);
        labelsRef.current[index] = sprite;
      }
    });

    // Remove labels for bodies that no longer exist
    if (labelsRef.current.length > bodies.length) {
      for (let i = bodies.length; i < labelsRef.current.length; i++) {
        if (labelsRef.current[i]) {
          scene.remove(labelsRef.current[i]);
          labelsRef.current[i].material.map.dispose();
          labelsRef.current[i].material.dispose();
        }
      }
      labelsRef.current = labelsRef.current.slice(0, bodies.length);
    }

    // Store ref for parent component to update positions
    if (externalLabelsRef) {
      externalLabelsRef.current = labelsRef.current;
    }

    return () => {
      // Only cleanup if we're managing the ref internally
      if (!externalLabelsRef) {
        labelsRef.current.forEach(label => {
          if (label) {
            scene.remove(label);
            if (label.material) {
              label.material.map?.dispose();
              label.material.dispose();
            }
          }
        });
        labelsRef.current = [];
      }
    };
  }, [bodies, bodyMeshes, camera, scene, externalLabelsRef]);

  return null; // This component doesn't render anything in React
}

