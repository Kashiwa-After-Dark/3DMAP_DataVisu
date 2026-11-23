/** Grayscale architectural drawing for the terrace's overhead view. */
import * as THREE from "three";
import { appearanceRole } from "./appearanceSettings.js?v=20261123-monitor2";

export function createTerraceTopAppearance(view, model, activityMesh) {
  const scene = view.scene;
  const face = (color, opacity) => new THREE.MeshBasicMaterial({ color, opacity, transparent: true,
    depthWrite: false, toneMapped: false, fog: false });
  const floorFace = face(0xa5a5a5, 0.25);
  const contextFace = face(0x929292, 0.13);
  const detailFace = activityMesh.createObjectMaterial(0xc0c0c0, 0.18, 1.0);
  const denseFace = activityMesh.createObjectMaterial(0xaaaaaa, 0.22, 0.75);
  const outline = (opacity) => new THREE.LineBasicMaterial({ color: 0xc8c8c8, opacity,
    transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const majorEdge = outline(0.50), minorEdge = activityMesh.createObjectMaterial(0xc8c8c8, 0.34, 1.0);
  let drawing;

  function build() {
    const group = new THREE.Group();
    model.root.traverse((source) => {
      if (!source.isMesh) return;
      const names = [];
      for (let item = source; item && item !== model.root; item = item.parent) names.push(item.name);
      const role = appearanceRole(names, source.material?.name);
      if (role === "region") return;
      const dense = names.some((name) => /^(Planting|Deck_Railings|Tactile_Paving)/.test(name));
      const roof = role === "walkway-roof";
      const surface = new THREE.Mesh(source.geometry, role === "floor" ? floorFace :
        role === "context" || roof ? contextFace : dense ? denseFace : detailFace);
      surface.matrix.copy(source.matrixWorld);
      surface.matrixAutoUpdate = false;
      surface.renderOrder = role === "floor" ? 1 : 12;
      group.add(surface);
      if (dense) return;
      const originalEdges = source.children.find(({ name }) => name === "terrace-architectural-edges");
      const geometry = originalEdges?.geometry ?? new THREE.EdgesGeometry(source.geometry, role === "floor" ? 35 : 42);
      const lines = new THREE.LineSegments(geometry, ["floor", "context"].includes(role) ? majorEdge : minorEdge);
      lines.renderOrder = 13;
      surface.add(lines);
    });
    scene.add(group);
    return group;
  }

  return {
    setVisible(visible) {
      if (visible) drawing ??= build();
      if (drawing) drawing.visible = visible;
      model.root.visible = !visible;
      view.invalidate();
    },
  };
}
