import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { COLORS } from "./config.js";
import { fitDistance, orthographicSpan } from "./cameraFit.js";

export function createTerraceView(canvas, onViewChange) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "default" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8395a0, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-8, 18, 10);
  scene.add(keyLight);
  const perspective = new THREE.PerspectiveCamera(42, 1, 0.1, 3000);
  const overhead = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 3000);
  overhead.up.set(0, 0, -1);
  let camera = perspective;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.screenSpacePanning = true;
  let bounds = null;
  let mode = "3d";
  let dirty = true;
  let width = 1;
  let height = 1;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const renderListeners = new Set();
  const heading = document.querySelector("#north-arrow");
  controls.addEventListener("change", () => { dirty = true; });

  function resize() {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / (width * height))));
    renderer.setSize(width, height, false);
    perspective.aspect = width / height;
    perspective.updateProjectionMatrix();
    if (bounds) reset();
    dirty = true;
  }
  function reset() {
    if (!bounds) return;
    bounds.getCenter(center);
    bounds.getSize(size);
    controls.target.copy(center);
    if (mode === "3d") {
      const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
      const distance = fitDistance(radius, perspective.fov, width / height);
      perspective.position.copy(center).addScaledVector(new THREE.Vector3(0.85, 1.25, 1.05).normalize(), distance);
      perspective.zoom = 1;
      controls.minDistance = distance * 0.3;
      controls.maxDistance = distance * 1.65;
      perspective.updateProjectionMatrix();
    } else {
      const span = orthographicSpan(size, width / height);
      overhead.left = -span.width / 2;
      overhead.right = span.width / 2;
      overhead.top = span.height / 2;
      overhead.bottom = -span.height / 2;
      overhead.zoom = 1;
      overhead.position.copy(center).add(new THREE.Vector3(0, Math.max(30, size.length() * 2), 0));
      overhead.lookAt(center);
      overhead.updateProjectionMatrix();
    }
    controls.update();
    dirty = true;
  }
  function setMode(next) {
    mode = next;
    camera = mode === "3d" ? perspective : overhead;
    controls.object = camera;
    controls.enableRotate = mode === "3d";
    controls.minPolarAngle = mode === "3d" ? Math.PI * 0.08 : 0;
    controls.maxPolarAngle = mode === "3d" ? Math.PI * 0.45 : Math.PI / 2;
    controls.minZoom = 0.6;
    controls.maxZoom = 3.5;
    reset();
    onViewChange(mode);
  }
  function zoom(factor) {
    if (mode === "3d") {
      const offset = perspective.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance);
      perspective.position.copy(controls.target).add(offset.setLength(distance));
    } else {
      overhead.zoom = THREE.MathUtils.clamp(overhead.zoom * factor, controls.minZoom, controls.maxZoom);
      overhead.updateProjectionMatrix();
    }
    controls.update();
    dirty = true;
  }
  function render() {
    controls.update();
    if (dirty) {
      const direction = camera.position.clone().sub(controls.target);
      heading.style.transform = `rotate(${-Math.atan2(direction.x, direction.z)}rad)`;
      renderer.render(scene, camera);
      for (const listener of renderListeners) listener();
      dirty = false;
    }
    requestAnimationFrame(render);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  render();
  return { scene, reset, setMode, zoom, getCamera() { return camera; }, onRender(listener) { renderListeners.add(listener); return () => renderListeners.delete(listener); }, setBounds(value) { bounds = value; reset(); }, invalidate() { dirty = true; } };
}
