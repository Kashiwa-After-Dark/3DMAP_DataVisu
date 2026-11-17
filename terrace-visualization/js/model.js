/**
 * ファイル概要: テラス3Dモデルを読み込み、表示位置と縮尺を整える。
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createModelAppearance } from "./modelAppearance.js?v=20261113-gameonly1";
import { shouldHideBuilding } from "./contextVisibility.js?v=20261113-station1";
import { createStationOcclusion } from "./stationOcclusion.js";
import { createPlaceRegions } from "./placeRegions.js?v=20261113-people1";
import { MODEL_URL, FOCUS_OBJECTS, CONTEXT_OBJECTS, HIDDEN_OBJECTS, MODEL_GEOREFERENCED } from "./config.js?v=20261112-regions1";

export async function loadTerraceModel(scene, onProgress, { stationOcclusion = false } = {}) {
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
  const regions = createPlaceRegions(model);
  const bounds = new THREE.Box3();
  model.traverseVisible((object) => {
    if (object.isMesh) bounds.union(new THREE.Box3().setFromObject(object));
  });
  if (bounds.isEmpty()) throw new Error("Terrace model is empty");
  const station = model.getObjectByName("Kashiwa_Station");
  let monitorSurface = null;
  station?.traverse((object) => {
    if (object.isMesh && /Display black/i.test(object.material?.name || "")) monitorSurface = object;
  });
  let stationAnchor = null;
  if (station) {
    const stationBounds = new THREE.Box3().setFromObject(station);
    if (!stationBounds.isEmpty()) {
      stationAnchor = stationBounds.getCenter(new THREE.Vector3());
      stationAnchor.y = stationBounds.max.y + 0.5;
    }
  }
  const context = CONTEXT_OBJECTS.map((name) => model.getObjectByName(name)).filter(Boolean);
  const deckBounds = new THREE.Box3();
  for (const mesh of focusMeshes) deckBounds.union(new THREE.Box3().setFromObject(mesh));
  const deckCenter = deckBounds.getCenter(new THREE.Vector3());
  const tourBounds = new THREE.Box3();
  for (const { object, code } of regions.sources) {
    if (["TR-04", "TR-05", "TR-06", "TR-07", "TR-08", "TR-09"].includes(code)) tourBounds.union(new THREE.Box3().setFromObject(object));
  }
  if (tourBounds.isEmpty()) tourBounds.copy(deckBounds);
  const topDownBounds = tourBounds.clone();
  const walkway = model.getObjectByName("Covered_Walkway");
  if (walkway) topDownBounds.union(new THREE.Box3().setFromObject(walkway));
  const contextStates = context.map((object) => ({ object, center: new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()), hidden: false }));
  let contextVisible = true;
  let stationInfoActive = false;
  const stationIsOccluded = stationOcclusion ? createStationOcclusion(station, focusMeshes) : null;
  createModelAppearance(model);
  scene.add(model);
  return {
    bounds, tourBounds, topDownBounds, focusMeshes, stationAnchor, monitorSurface, stationObject: station, georeferenced: MODEL_GEOREFERENCED,
    selectPlace: regions.select,
    placeCodes: regions.codes,
    regionSources: regions.sources,
    peopleHeight: deckBounds.getSize(new THREE.Vector3()).length() * 0.0115,
    peopleObstacles: context.map((object) => new THREE.Box3().setFromObject(object)),
    isStationVisible() { return Boolean(station?.visible); },
    setStationInfoActive(active) {
      stationInfoActive = active;
      if (active && station) station.visible = contextVisible;
    },
    updateForCamera(camera) {
      for (const state of contextStates) {
        state.hidden = state.object === station && stationIsOccluded
          ? stationIsOccluded(camera)
          : !(stationInfoActive && state.object === station) && !camera.isOrthographicCamera && shouldHideBuilding(camera.position, deckCenter, state.center, state.hidden);
        state.object.visible = contextVisible && !state.hidden;
      }
    },
    setContextVisible(visible) {
      contextVisible = visible;
      for (const state of contextStates) state.object.visible = visible && !state.hidden;
    },
  };
}
