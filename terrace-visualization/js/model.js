/**
 * ファイル概要: テラス3Dモデルを読み込み、表示位置と縮尺を整える。
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MODEL_URL, FOCUS_OBJECTS, CONTEXT_OBJECTS, HIDDEN_OBJECTS, MODEL_GEOREFERENCED } from "./config.js?v=20261111-model1";

export async function loadTerraceModel(scene, onProgress) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL, onProgress);
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const focusMeshes = [];
  for (const name of FOCUS_OBJECTS) {
    const object = model.getObjectByName(name);
    if (!object) throw new Error(`Missing focus object: ${name}`);
    object.traverse((child) => { if (child.isMesh) focusMeshes.push(child); });
  }
  if (!focusMeshes.length) throw new Error("Terrace floor contains no mesh");
  for (const name of HIDDEN_OBJECTS) {
    const object = model.getObjectByName(name);
    if (object) object.visible = false;
  }
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
  });
  const bounds = new THREE.Box3();
  model.traverseVisible((object) => {
    if (object.isMesh) bounds.union(new THREE.Box3().setFromObject(object));
  });
  if (bounds.isEmpty()) throw new Error("Terrace model is empty");
  const station = model.getObjectByName("駅");
  let stationAnchor = null;
  if (station) {
    const stationBounds = new THREE.Box3().setFromObject(station);
    if (!stationBounds.isEmpty()) {
      stationAnchor = stationBounds.getCenter(new THREE.Vector3());
      stationAnchor.y = stationBounds.max.y + 0.5;
    }
  }
  const context = CONTEXT_OBJECTS.map((name) => model.getObjectByName(name)).filter(Boolean);
  scene.add(model);
  return {
    bounds, focusMeshes, stationAnchor, georeferenced: MODEL_GEOREFERENCED,
    isStationVisible() { return Boolean(station?.visible); },
    setContextVisible(visible) { for (const object of context) object.visible = visible; },
  };
}
