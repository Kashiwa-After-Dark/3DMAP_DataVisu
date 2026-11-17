/**
 * ファイル概要: テラス3D地図のシーン、カメラ、操作、描画更新を管理する。
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { COLORS } from "./config.js";
import { fitDistance, orthographicSpan } from "./cameraFit.js";
import { GAME_STYLE, gameFogRange } from "./gameAppearance.js";
import { createAutoCamera } from "./autoCamera.js?v=20261116-monitor1";
import { createCameraFocus } from "./cameraFocus.js";
import { focused2dFrame } from "./focused2dFrame.js";

export function createTerraceView(canvas, onViewChange) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "default" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = GAME_STYLE.exposure;
  canvas.style.filter = GAME_STYLE.filter;
  const fillLight = new THREE.HemisphereLight(GAME_STYLE.skyColor, GAME_STYLE.groundColor, GAME_STYLE.fillIntensity);
  scene.add(fillLight);
  const keyLight = new THREE.DirectionalLight(GAME_STYLE.sunColor, GAME_STYLE.sunIntensity);
  keyLight.position.set(-8, 18, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.setScalar(window.innerWidth <= 760 ? 1024 : 2048);
  keyLight.shadow.bias = -0.0003;
  keyLight.shadow.normalBias = 0.025;
  scene.add(keyLight, keyLight.target);
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
  let tourBounds = null;
  let topDownBounds = null;
  let mode = "3d";
  let dirty = true;
  let width = 1;
  let height = 1;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const renderListeners = new Set();
  const beforeRenderListeners = new Set();
  const animationListeners = new Set();
  const heading = document.querySelector("#north-arrow");
  const cameraFocus = createCameraFocus({ camera: perspective, controls,
    onAnimate(listener) { animationListeners.add(listener); } });
  const autoCamera = createAutoCamera({ camera: perspective, controls, canvas,
    onAnimate(listener) { animationListeners.add(listener); },
    invalidate() { dirty = true; }, canStart() { cameraFocus.stop(); return Boolean(bounds) && mode === "3d"; },
    getFocus() {
      const region = tourBounds || bounds;
      return { center: region.getCenter(new THREE.Vector3()), size: region.getSize(new THREE.Vector3()),
        radius: fitDistance(region.getBoundingSphere(new THREE.Sphere()).radius, perspective.fov, width / height) };
    },
  });
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
    cameraFocus.stop();
    autoCamera.stop();
    if (!bounds) return;
    const framingBounds = mode === "2d" && topDownBounds ? topDownBounds : bounds;
    framingBounds.getCenter(center);
    framingBounds.getSize(size);
    controls.target.copy(center);
    if (mode === "3d") {
      const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
      const distance = fitDistance(radius, perspective.fov, width / height);
      perspective.position.copy(center).addScaledVector(new THREE.Vector3(0.85, 1.25, 1.05).normalize(), distance);
      perspective.zoom = 1;
      controls.minDistance = distance * 0.08;
      controls.maxDistance = distance * 1.65;
      perspective.updateProjectionMatrix();
    } else {
      const span = orthographicSpan(size, width / height);
      overhead.left = -span.width / 2;
      overhead.right = span.width / 2;
      overhead.top = span.height / 2;
      overhead.bottom = -span.height / 2;
      if (topDownBounds) {
        const tools = document.querySelector(".model-mode-tools");
        const inset = tools ? canvas.getBoundingClientRect().right - tools.getBoundingClientRect().left + 18 : 0;
        Object.assign(overhead, focused2dFrame(size, width, height, inset));
      }
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
    controls.maxZoom = 10;
    reset();
    onViewChange(mode);
  }
  function zoom(factor) {
    cameraFocus.stop();
    autoCamera.stop();
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
  function refreshShadows() {
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
  }
  function focusAt(target, normal, objectWidth) {
    autoCamera.stop();
    if (mode !== "3d") setMode("3d");
    const distance = THREE.MathUtils.clamp(fitDistance(objectWidth * 0.65, perspective.fov, width / height), controls.minDistance, controls.maxDistance);
    const offset = normal.clone();
    offset.y = 0.28;
    cameraFocus.start(target, target.clone().addScaledVector(offset.normalize(), distance));
    dirty = true;
  }
  function render(time = 0) {
    controls.update();
    for (const listener of animationListeners) if (listener(time)) dirty = true;
    if (dirty) {
      const direction = camera.position.clone().sub(controls.target);
      heading.style.transform = `rotate(${-Math.atan2(direction.x, direction.z)}rad)`;
      for (const listener of beforeRenderListeners) listener(camera);
      renderer.render(scene, camera);
      for (const listener of renderListeners) listener();
      dirty = false;
    }
    requestAnimationFrame(render);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  render();
  return { scene, reset, setMode, zoom, focusAt, autoCamera, refreshShadows, getCamera() { return camera; }, onAnimate(listener) { animationListeners.add(listener); return () => animationListeners.delete(listener); }, onBeforeRender(listener) { beforeRenderListeners.add(listener); return () => beforeRenderListeners.delete(listener); }, onRender(listener) { renderListeners.add(listener); return () => renderListeners.delete(listener); }, setBounds(value, tourArea = value, topDownArea = null) {
    bounds = value;
    tourBounds = tourArea;
    topDownBounds = topDownArea;
    const target = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    keyLight.target.position.copy(target);
    keyLight.position.copy(target).add(new THREE.Vector3(-radius * 0.7, radius * 1.5, radius));
    Object.assign(keyLight.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 0.1, far: radius * 5 });
    keyLight.shadow.camera.updateProjectionMatrix();
    const fogRange = gameFogRange(radius);
    scene.fog = new THREE.Fog(GAME_STYLE.fogColor, fogRange.near, fogRange.far);
    refreshShadows();
    reset();
  }, invalidate() { dirty = true; } };
}
