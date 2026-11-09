import * as THREE from "three";

export function createStationFlowView({ camera, controls, groundGrid, mapGroup, scene, getAxes }) {
  let saved = null;
  const materials = new Map();
  return {
    activate() {
      if (saved) return;
      saved = { position: camera.position.clone(), target: controls.target.clone(), minDistance: controls.minDistance, maxDistance: controls.maxDistance, minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle, grid: groundGrid.visible, background: scene.background };
      scene.background = new THREE.Color(0x000000);
      groundGrid.visible = false;
      mapGroup.traverse((object) => {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!material?.color || materials.has(material)) continue;
          materials.set(material, { color: material.color.clone(), opacity: material.opacity, transparent: material.transparent, emissive: material.emissive?.clone(), emissiveIntensity: material.emissiveIntensity });
          material.color.setHex(material.emissive ? 0x496373 : 0x0c141a);
          if (material.emissive) {
            material.emissive.setHex(0x263845);
            material.emissiveIntensity = 0.25;
          }
          material.transparent = Boolean(material.emissive);
          material.opacity = material.emissive ? 0.65 : 1;
          material.needsUpdate = true;
        }
      });
      for (const axis of getAxes()) axis.visible = true;
      controls.update();
      document.body.classList.add("station-flow-active");
    },
    deactivate() {
      if (!saved) return;
      camera.position.copy(saved.position);
      controls.target.copy(saved.target);
      for (const key of ["minDistance", "maxDistance", "minPolarAngle", "maxPolarAngle"]) controls[key] = saved[key];
      groundGrid.visible = saved.grid;
      scene.background = saved.background;
      for (const [material, original] of materials) {
        material.color.copy(original.color);
        material.opacity = original.opacity;
        material.transparent = original.transparent;
        if (material.emissive && original.emissive) {
          material.emissive.copy(original.emissive);
          material.emissiveIntensity = original.emissiveIntensity;
        }
        material.needsUpdate = true;
      }
      materials.clear();
      for (const axis of getAxes()) axis.visible = true;
      camera.lookAt(saved.target);
      controls.update();
      saved = null;
      document.body.classList.remove("station-flow-active");
    },
  };
}
