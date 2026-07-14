import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ORIGIN = {
  lat: 35.86183529140233,
  lon: 139.97190479462844,
};

const COORDINATE_SCALE = {
  east: 1.0004200803610934,
  north: -0.9955676144207827,
};

const INITIAL_CENTER_GEO = {
  lat: 35.861448118098,
  lon: 139.972500801647,
};

const canvas = document.querySelector("#scene");
const coordReadout = document.querySelector("#coord-readout");
const view3dButton = document.querySelector("#view-3d");
const view2dButton = document.querySelector("#view-2d");
const playToggle = document.querySelector("#play-toggle");
const timeSlider = document.querySelector("#time-slider");
const timeReadout = document.querySelector("#time-readout");
const memoList = document.querySelector("#memo-list");
const BACKGROUND_COLOR = 0x020611;
const GRID_COLOR_LINES = 0x18324f;
const GPX_FILE = "../RH01_0707/01_1820_中村.gpx";
const PLAYBACK_DURATION_SECONDS = 30;
const ROUTE_BASE_COLOR = 0x166534;
const ROUTE_ACTIVE_COLOR = 0x22c55e;
const MEMO_COLOR = 0x86efac;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(BACKGROUND_COLOR);

const perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
perspectiveCamera.position.set(170, 145, 220);

const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
let activeCamera = perspectiveCamera;

const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 0, 0);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb7c4d6, 1.8);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(160, 260, 120);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const mapGroup = new THREE.Group();
scene.add(mapGroup);

const gpxGroup = new THREE.Group();
scene.add(gpxGroup);

const groundGrid = new THREE.GridHelper(1600, 80, GRID_COLOR_LINES, GRID_COLOR_LINES);
groundGrid.position.y = -0.04;
groundGrid.material.transparent = true;
groundGrid.material.opacity = 0.72;
groundGrid.material.depthWrite = false;
scene.add(groundGrid);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let selectableMeshes = [];
let bounds = new THREE.Box3();
let modelCenter = new THREE.Vector3();
let modelSize = new THREE.Vector3();
let viewMode = "3d";
let cameraState = null;
let trackPoints = [];
let memoPoints = [];
let elapsedRouteLine = null;
let playStartMs = 0;
let playStartOffset = 0;
let isPlaying = false;
let timelineStart = 0;
let timelineEnd = 0;
let playbackScale = 1;

new GLTFLoader().load(
  "../3Dmap/Kashiwa_3Dmap.glb",
  (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = true;
      selectableMeshes.push(child);
      keepOriginalMaterial(child);
    });

    mapGroup.add(model);
    fitCameraToModel();
    loadGpx();
  },
  undefined,
  (error) => {
    console.error(error);
  },
);

view3dButton.addEventListener("click", () => setViewMode("3d"));
view2dButton.addEventListener("click", () => setViewMode("2d"));
playToggle.addEventListener("click", togglePlayback);
timeSlider.addEventListener("input", () => {
  stopPlayback();
  updateTimeline(Number(timeSlider.value));
});
canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, activeCamera);
  const hits = raycaster.intersectObjects(selectableMeshes, true);
  const groundPoint = new THREE.Vector3();
  const point = hits.length
    ? hits[0].point
    : raycaster.ray.intersectPlane(groundPlane, groundPoint);

  if (!point) return;

  const geo = worldToGeo(point);
  coordReadout.textContent = `${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)}, ${geo.lat.toFixed(12)}, ${geo.lon.toFixed(12)}`;
});
window.addEventListener("resize", resize);

resize();
animate();

function worldToGeo(point) {
  const unitScale = 1;
  const metersEast = point.x * unitScale * COORDINATE_SCALE.east;
  const metersNorth = point.z * unitScale * COORDINATE_SCALE.north;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(THREE.MathUtils.degToRad(ORIGIN.lat));

  return {
    lat: ORIGIN.lat + metersNorth / metersPerDegreeLat,
    lon: ORIGIN.lon + metersEast / metersPerDegreeLon,
  };
}

function fitCameraToModel() {
  mapGroup.updateWorldMatrix(true, true);
  bounds.setFromObject(mapGroup);
  bounds.getCenter(modelCenter);
  bounds.getSize(modelSize);

  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const maxSize = Math.max(modelSize.x, modelSize.y, modelSize.z, 120);
  const fov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
  const distance = (sphere.radius / Math.tan(fov / 2)) * 0.52;
  const focus = geoToWorld(INITIAL_CENTER_GEO);
  focus.y = modelCenter.y + modelSize.y * 0.08;

  cameraState = { distance, focus, maxSize };
  perspectiveCamera.position.set(
    focus.x + distance * 0.18,
    focus.y + distance * 0.58,
    focus.z + distance * 0.86,
  );
  perspectiveCamera.near = Math.max(distance / 2000, 0.1);
  perspectiveCamera.far = distance * 6;
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(focus);
  controls.maxDistance = distance * 4;
  controls.minDistance = distance * 0.18;

  groundGrid.position.set(modelCenter.x, -0.04, modelCenter.z);
  groundGrid.scale.setScalar(Math.max(maxSize / 900, 1));

  controls.update();
}

function setViewMode(nextMode) {
  if (!cameraState) return;

  viewMode = nextMode;
  view3dButton.classList.toggle("is-active", viewMode === "3d");
  view2dButton.classList.toggle("is-active", viewMode === "2d");

  if (viewMode === "2d") {
    setTopDownView();
  } else {
    setPerspectiveView();
  }
}

function setPerspectiveView() {
  const { distance, focus } = cameraState;

  activeCamera = perspectiveCamera;
  controls.object = activeCamera;
  perspectiveCamera.fov = 45;
  perspectiveCamera.position.set(
    focus.x + distance * 0.18,
    focus.y + distance * 0.58,
    focus.z + distance * 0.86,
  );
  perspectiveCamera.up.set(0, 1, 0);
  perspectiveCamera.near = Math.max(distance / 2000, 0.1);
  perspectiveCamera.far = distance * 6;
  perspectiveCamera.updateProjectionMatrix();

  controls.enableRotate = true;
  controls.enablePan = true;
  controls.target.copy(focus);
  controls.update();
}

function setTopDownView() {
  const { focus, maxSize } = cameraState;
  const height = maxSize * 1.8;
  const viewSize = maxSize * 0.62;

  activeCamera = orthographicCamera;
  controls.object = activeCamera;
  updateOrthographicFrustum(viewSize);

  orthographicCamera.position.set(focus.x, focus.y + height, focus.z);
  orthographicCamera.up.set(0, 0, -1);
  orthographicCamera.near = 0.1;
  orthographicCamera.far = height * 3;
  orthographicCamera.updateProjectionMatrix();

  controls.enableRotate = false;
  controls.enablePan = true;
  controls.target.copy(focus);
  controls.update();
}

function geoToWorld({ lat, lon }) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(THREE.MathUtils.degToRad(ORIGIN.lat));

  return new THREE.Vector3(
    ((lon - ORIGIN.lon) * metersPerDegreeLon) / COORDINATE_SCALE.east,
    0,
    ((lat - ORIGIN.lat) * metersPerDegreeLat) / COORDINATE_SCALE.north,
  );
}

async function loadGpx() {
  const response = await fetch(GPX_FILE);
  if (!response.ok) {
    throw new Error(`Failed to load GPX: ${GPX_FILE}`);
  }

  const gpxText = await response.text();
  const doc = new DOMParser().parseFromString(gpxText, "application/xml");
  trackPoints = parseTrackPoints(doc);
  memoPoints = parseMemoPoints(doc);

  if (!trackPoints.length) return;

  timelineStart = Math.min(
    trackPoints[0].time,
    ...memoPoints.map((point) => point.time),
  );
  timelineEnd = Math.max(
    trackPoints[trackPoints.length - 1].time,
    ...memoPoints.map((point) => point.time),
  );
  timeSlider.max = String(Math.round((timelineEnd - timelineStart) / 1000));
  playbackScale = Number(timeSlider.max) / PLAYBACK_DURATION_SECONDS;

  addRouteLines();
  addMemoPins();
  updateTimeline(0);
}

function parseTrackPoints(doc) {
  return [...doc.getElementsByTagNameNS("*", "trkpt")]
    .map((point) => ({
      lat: Number(point.getAttribute("lat")),
      lon: Number(point.getAttribute("lon")),
      time: parseTime(getChildText(point, "time")),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

function parseMemoPoints(doc) {
  return [...doc.getElementsByTagNameNS("*", "wpt")]
    .map((point, index) => ({
      lat: Number(point.getAttribute("lat")),
      lon: Number(point.getAttribute("lon")),
      time: parseTime(getChildText(point, "time")),
      name: getChildText(point, "name") || `Memo ${index + 1}`,
      desc: getChildText(point, "desc"),
      marker: null,
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

function addRouteLines() {
  const positions = trackPoints.flatMap((point) => {
    const world = geoToWorld(point);
    return [world.x, 3, world.z];
  });
  const routeGeometry = new THREE.BufferGeometry();
  routeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const fullRouteLine = new THREE.Line(
    routeGeometry.clone(),
    new THREE.LineBasicMaterial({
      color: ROUTE_BASE_COLOR,
      transparent: true,
      opacity: 0.34,
      depthTest: false,
    }),
  );
  fullRouteLine.renderOrder = 20;
  gpxGroup.add(fullRouteLine);

  elapsedRouteLine = new THREE.Line(
    routeGeometry.clone(),
    new THREE.LineBasicMaterial({
      color: ROUTE_ACTIVE_COLOR,
      transparent: true,
      opacity: 1,
      depthTest: false,
    }),
  );
  elapsedRouteLine.renderOrder = 21;
  elapsedRouteLine.geometry.setDrawRange(0, 0);
  gpxGroup.add(elapsedRouteLine);
}

function addMemoPins() {
  for (const memo of memoPoints) {
    const marker = createMemoMarker(memo);
    marker.visible = false;
    memo.marker = marker;
    gpxGroup.add(marker);
  }
}

function createMemoMarker(memo) {
  const world = geoToWorld(memo);
  const group = new THREE.Group();
  group.position.set(world.x, 3, world.z);

  const pinHeight = 36;
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, pinHeight, 0),
    ]),
    new THREE.LineBasicMaterial({ color: MEMO_COLOR, depthTest: false }),
  );
  line.renderOrder = 30;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 10),
    new THREE.MeshBasicMaterial({ color: MEMO_COLOR, depthTest: false }),
  );
  head.position.y = pinHeight;
  head.renderOrder = 31;

  const label = makeTextLabel(memo.name, memo.desc);
  label.position.set(0, pinHeight + 11, 0);

  group.add(line, head, label);
  return group;
}

function updateTimeline(seconds) {
  const currentTime = timelineStart + seconds * 1000;
  timeSlider.value = String(seconds);
  timeReadout.textContent = formatTime(currentTime);

  const routeCount = countPointsUntil(trackPoints, currentTime);
  if (elapsedRouteLine) {
    elapsedRouteLine.geometry.setDrawRange(0, routeCount);
  }

  for (const memo of memoPoints) {
    memo.marker.visible = memo.time <= currentTime;
  }

  renderMemoList(currentTime);
}

function renderMemoList(currentTime) {
  const visibleMemos = memoPoints
    .filter((memo) => memo.time <= currentTime)
    .slice(-8)
    .reverse();

  memoList.replaceChildren(
    ...visibleMemos.map((memo) => {
      const item = document.createElement("article");
      item.className = "memo-item";

      const time = document.createElement("time");
      time.textContent = formatTime(memo.time);

      const title = document.createElement("strong");
      title.textContent = memo.name;

      item.append(time, title);
      if (memo.desc) {
        const body = document.createElement("p");
        body.textContent = memo.desc;
        item.append(body);
      }
      return item;
    }),
  );
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }

  isPlaying = true;
  playToggle.textContent = "停止";
  playStartOffset = Number(timeSlider.value);
  playStartMs = performance.now();
}

function stopPlayback() {
  isPlaying = false;
  playToggle.textContent = "再生";
}

function countPointsUntil(points, time) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].time <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}

function getChildText(element, name) {
  return element.getElementsByTagNameNS("*", name)[0]?.textContent?.trim() || "";
}

function parseTime(value) {
  return Date.parse(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(value);
}

function makeTextLabel(title, body) {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = body ? 122 : 78;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(2, 6, 17, 0.9)";
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 3;
  roundedRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(trimText(ctx, title, 380), 18, 14);

  if (body) {
    ctx.fillStyle = "#bbf7d0";
    ctx.font = "400 21px system-ui, sans-serif";
    ctx.fillText(trimText(ctx, body, 380), 18, 58);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width * 0.16, canvas.height * 0.16, 1);
  sprite.renderOrder = 32;
  return sprite;
}

function trimText(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}...`).width > width) {
    value = value.slice(0, -1);
  }
  return `${value}...`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function keepOriginalMaterial(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material) continue;
    material.side = THREE.DoubleSide;
    material.needsUpdate = true;
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  if (viewMode === "2d" && cameraState) {
    updateOrthographicFrustum(cameraState.maxSize * 0.62);
  }
  renderer.setSize(width, height, false);
}

function animate() {
  if (isPlaying) {
    const nextSeconds = Math.min(
      Number(timeSlider.max),
      playStartOffset + Math.floor(((performance.now() - playStartMs) / 1000) * playbackScale),
    );
    updateTimeline(nextSeconds);
    if (nextSeconds >= Number(timeSlider.max)) {
      stopPlayback();
    }
  }

  controls.update();
  renderer.render(scene, activeCamera);
  requestAnimationFrame(animate);
}

function updateOrthographicFrustum(viewSize) {
  const aspect = window.innerWidth / window.innerHeight;
  orthographicCamera.left = (-viewSize * aspect) / 2;
  orthographicCamera.right = (viewSize * aspect) / 2;
  orthographicCamera.top = viewSize / 2;
  orthographicCamera.bottom = -viewSize / 2;
  orthographicCamera.updateProjectionMatrix();
}
