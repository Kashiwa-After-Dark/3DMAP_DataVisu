import * as THREE from "three";
import { applyTopDownCameraConstraints } from "./cameraConstraints.js?v=20260809-02";

export function createMemoTopDownView({ camera, controls }) {
  const focus = new THREE.Vector3();
  let active = false;

  function activate({ mapFocus, maxSize, viewportWidth, viewportHeight }) {
    active = true;
    focus.copy(mapFocus);
    const cameraHeight = THREE.MathUtils.clamp(maxSize * 1.05, 340, 620);

    camera.position.set(focus.x, focus.y + cameraHeight, focus.z);
    camera.up.set(0, 0, -1);
    camera.fov = 38;
    camera.aspect = Math.max(viewportWidth / viewportHeight, 0.01);
    camera.near = 0.1;
    camera.far = Math.max(cameraHeight * 8, 2000);
    camera.updateProjectionMatrix();

    controls.object = camera;
    controls.target.copy(focus);
    controls.enabled = true;
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.screenSpacePanning = true;
    applyTopDownCameraConstraints(controls, cameraHeight);
    controls.update();
    return camera;
  }

  function deactivate() {
    if (!active) return;
    active = false;
    controls.screenSpacePanning = false;
  }

  function resize(width, height) {
    if (!active) return;
    camera.aspect = Math.max(width / height, 0.01);
    camera.updateProjectionMatrix();
  }

  return { activate, deactivate, resize };
}
