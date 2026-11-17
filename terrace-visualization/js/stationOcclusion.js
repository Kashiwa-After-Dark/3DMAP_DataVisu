/** ファイル概要: 画面上で床面へ飛ばす光線を使い、駅による遮蔽率を測定する。 */
import * as THREE from "three";
import { hideStationForCoverage } from "./occlusionRule.js";

export function createStationOcclusion(station, floorMeshes) {
  const stationMeshes = [];
  station?.traverse((object) => { if (object.isMesh) stationMeshes.push(object); });
  const bounds = new THREE.Box3();
  for (const mesh of floorMeshes) bounds.union(new THREE.Box3().setFromObject(mesh));
  const corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const ray = new THREE.Raycaster();
  const point = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const lastMatrix = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();
  let cached = false;
  let initialized = false;
  return function shouldHide(camera) {
    if (!stationMeshes.length) return false;
    camera.updateMatrixWorld();
    if (initialized && camera.matrixWorld.equals(lastMatrix) && camera.projectionMatrix.equals(lastProjection)) return cached;
    lastMatrix.copy(camera.matrixWorld);
    lastProjection.copy(camera.projectionMatrix);
    initialized = true;
    let left = 1, right = -1, bottom = 1, top = -1;
    for (const corner of corners) {
      point.copy(corner).project(camera);
      left = Math.min(left, point.x); right = Math.max(right, point.x);
      bottom = Math.min(bottom, point.y); top = Math.max(top, point.y);
    }
    left = Math.max(-1, left); right = Math.min(1, right);
    bottom = Math.max(-1, bottom); top = Math.min(1, top);
    let total = 0;
    let covered = 0;
    // Equal screen-space cells estimate visible area, not floor vertex density.
    for (let row = 0; row < 16; row++) for (let col = 0; col < 20; col++) {
      if (right <= left || top <= bottom) continue;
      ndc.set(left + (col + 0.5) / 20 * (right - left), bottom + (row + 0.5) / 16 * (top - bottom));
      ray.far = Infinity;
      ray.setFromCamera(ndc, camera);
      const floor = ray.intersectObjects(floorMeshes, false)[0];
      if (!floor) continue;
      total++;
      ray.far = Math.max(0, floor.distance - 0.001);
      if (ray.intersectObjects(stationMeshes, false).length) covered++;
    }
    cached = hideStationForCoverage(covered, total);
    return cached;
  };
}
