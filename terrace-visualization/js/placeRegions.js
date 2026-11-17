/**
 * ファイル概要: TRコードの範囲面を非表示で保持し、選択場所だけを表示用に強調する。
 */
import * as THREE from "three";
import { placeRegionCode } from "./placeRegionNames.js";

export function createPlaceRegions(model) {
  const sources = [];
  model.traverse((object) => {
    const code = placeRegionCode(object.name);
    if (code) sources.push({ object, code });
  });
  const overlays = new Map();
  const inverse = model.matrixWorld.clone().invert();
  for (const { object, code } of sources) {
    object.visible = false;
    if (!overlays.has(code)) {
      const group = new THREE.Group();
      group.name = `place-region-overlay-${code}`;
      group.visible = false;
      overlays.set(code, group);
    }
    const group = overlays.get(code);
    object.traverse((source) => {
      if (!source.isMesh) return;
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, source.matrixWorld);
      matrix.elements[13] += 0.025;
      const face = new THREE.Mesh(source.geometry, new THREE.MeshBasicMaterial({ color: 0xa9e1d1, side: THREE.DoubleSide, transparent: true, opacity: 0.2, depthTest: false, depthWrite: false }));
      face.matrixAutoUpdate = false;
      face.matrix.copy(matrix);
      face.renderOrder = 8;
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(source.geometry, 20), new THREE.LineBasicMaterial({ color: 0xa9e1d1, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
      edge.matrixAutoUpdate = false;
      edge.matrix.copy(matrix);
      edge.renderOrder = 9;
      group.add(face, edge);
    });
  }
  // Attach overlays after collecting source nodes so they cannot be mistaken for range data.
  for (const group of overlays.values()) model.add(group);
  return {
    sources,
    codes: [...overlays.keys()].sort(),
    select(code, color = "#a9e1d1") {
      for (const [key, group] of overlays) {
        group.visible = key === code;
        if (group.visible) for (const object of group.children) object.material.color.set(color);
      }
      return overlays.has(code);
    },
  };
}
