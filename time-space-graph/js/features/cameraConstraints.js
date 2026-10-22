const DEG_TO_RAD = Math.PI / 180;

export const CAMERA_LIMITS = Object.freeze({
  perspective: Object.freeze({
    minDistanceRatio: 0.42,
    maxDistanceRatio: 2.4,
    minPolarAngle: 24 * DEG_TO_RAD,
    maxPolarAngle: 82 * DEG_TO_RAD,
  }),
  topDown: Object.freeze({
    minDistanceRatio: 0.5,
    maxDistanceRatio: 1.8,
  }),
  map2d: Object.freeze({
    minZoom: 0.82,
    maxZoom: 2.45,
  }),
});

export function applyPerspectiveCameraConstraints(controls, distance) {
  const limits = CAMERA_LIMITS.perspective;
  controls.enableZoom = true;
  controls.minDistance = distance * limits.minDistanceRatio;
  controls.maxDistance = distance * limits.maxDistanceRatio;
  controls.minPolarAngle = limits.minPolarAngle;
  controls.maxPolarAngle = limits.maxPolarAngle;
}

export function applyTopDownCameraConstraints(controls, cameraHeight) {
  const limits = CAMERA_LIMITS.topDown;
  controls.minDistance = Math.max(cameraHeight * limits.minDistanceRatio, 36);
  controls.maxDistance = cameraHeight * limits.maxDistanceRatio;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
}

export function clamp2DZoom(zoom) {
  return Math.max(CAMERA_LIMITS.map2d.minZoom, Math.min(zoom, CAMERA_LIMITS.map2d.maxZoom));
}
