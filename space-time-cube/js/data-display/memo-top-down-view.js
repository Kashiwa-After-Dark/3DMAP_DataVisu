/**
 * ファイル概要: 観察メモ選択時に対象地点を真上から見るカメラへ切り替える。
 */
import * as THREE from "three";
import { applyTopDownCameraConstraints } from "../screen-control/camera.js?v=20260809-02";

const MEMO_ROTATE_SPEED = 0.45;
const MAX_MEMO_POLAR_ANGLE = Math.PI / 2 - THREE.MathUtils.degToRad(2);

export function createMemoTopDownView({ camera, controls }) {
  const focus = new THREE.Vector3();
  let active = false;
  let previousRotateSpeed = controls.rotateSpeed;

  function activate({ mapFocus, maxSize, viewportWidth, viewportHeight }) {
    if (!active) previousRotateSpeed = controls.rotateSpeed;
    active = true;
    focus.copy(mapFocus);
    const cameraHeight = THREE.MathUtils.clamp(maxSize * 1.05, 340, 620);

    camera.position.set(focus.x, focus.y + cameraHeight, focus.z);
    camera.up.set(0, 1, 0);
    camera.fov = 38;
    camera.aspect = Math.max(viewportWidth / viewportHeight, 0.01);
    camera.near = 0.1;
    camera.far = Math.max(cameraHeight * 8, 2000);
    camera.updateProjectionMatrix();

    controls.object = camera;
    controls.target.copy(focus);
    controls.enabled = true;
    controls.enableRotate = true;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.rotateSpeed = MEMO_ROTATE_SPEED;
    controls.screenSpacePanning = false;
    applyTopDownCameraConstraints(controls, cameraHeight);
    controls.maxPolarAngle = MAX_MEMO_POLAR_ANGLE;
    controls.update();
    return camera;
  }

  function deactivate() {
    if (!active) return;
    active = false;
    controls.rotateSpeed = previousRotateSpeed;
    controls.screenSpacePanning = false;
  }

  function resize(width, height) {
    if (!active) return;
    camera.aspect = Math.max(width / height, 0.01);
    camera.updateProjectionMatrix();
  }

  return { activate, deactivate, resize };
}
