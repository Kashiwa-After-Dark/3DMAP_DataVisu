import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_URL, FOCUS_OBJECTS, FOCUS_WIRE, CONTEXT_PADDING, COLORS } from "./config.js";

export async function loadTerraceModel(scene) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const focus = [];
  const context = [];
  const bounds = new THREE.Box3();
  model.traverse((object) => {
    if (!object.isMesh) return;
    if (FOCUS_OBJECTS.includes(object.name)) {
      focus.push(object);
      bounds.union(new THREE.Box3().setFromObject(object));
    }
  });
  const missing = FOCUS_OBJECTS.filter((name) => !focus.some((object) => object.name === name));
  if (missing.length) throw new Error(`Missing focus objects: ${missing.join(", ")}`);
  const clipBounds = bounds.clone().expandByScalar(CONTEXT_PADDING);
  const clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -clipBounds.min.x),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipBounds.max.x),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -clipBounds.min.z),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), clipBounds.max.z),
  ];
  model.traverse((object) => {
    if (!object.isMesh) return;
    const selected = FOCUS_OBJECTS.includes(object.name);
    const wire = object.name === FOCUS_WIRE;
    const contextWire = object.name === "3D_wier";
    const ground = ["plane", "space"].includes(object.name);
    const road = object.name.startsWith("Ways") || object.name === "main_street";
    const color = selected ? COLORS[object.name] : wire ? COLORS.focusWire : contextWire ? COLORS.wire : ground ? COLORS.ground : road ? COLORS.road : COLORS.buildings;
    const previous = Array.isArray(object.material) ? object.material : [object.material];
    object.material = new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide, transparent: true,
      opacity: selected || wire || ground ? 1 : contextWire ? 0.25 : 0.3,
      depthWrite: ground, depthTest: !selected && !wire,
      clippingPlanes: selected || wire ? [] : clippingPlanes,
    });
    object.renderOrder = selected ? 5 : wire ? 6 : ground ? 0 : 1;
    object.castShadow = false;
    object.receiveShadow = false;
    if (!selected && !wire) context.push(object);
    for (const material of previous) material.dispose();
  });
  scene.add(model);
  return {
    bounds,
    focusMeshes: focus,
    setContextVisible(visible) { for (const object of context) object.visible = visible; },
  };
}
