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
const speedSlider = document.querySelector("#speed-slider");
const speedReadout = document.querySelector("#speed-readout");
const timeProgress = document.querySelector("#time-progress");
const timeEventMarkers = document.querySelector("#time-event-markers");
const observationCount = document.querySelector("#observation-count");
const memoList = document.querySelector("#memo-list");
const cameraModeButtons = [...document.querySelectorAll("[data-camera-mode]")];
const cameraModeReadout = document.querySelector("#camera-mode-readout");
const BACKGROUND_COLOR = 0x020611;
const GRID_COLOR_LINES = 0x18324f;
const GPX_FILES = [
  "01_1820_Omori.gpx",
  "01_1820_中村.gpx",
  "01_2022_Tomoya.gpx",
  "01_2224_Kobayashi.gpx",
  "01_2224_Yoh.gpx",
].map((file, index) => ({
  id: `gpx-${index}`,
  file,
  url: `../RH01_0707/${file}`,
  label: file.replace(/^\d+_\d+_/, "").replace(/\.gpx$/i, ""),
}));
const PLAYBACK_DURATION_SECONDS = 30;
const ROUTE_BASE_COLOR = 0x1d3552;
const TIME_BASE_Y = 3;
const TIME_AXIS_HEIGHT = 180;
const TIME_START_HOUR = 18;
const TIME_END_HOUR = 24;
const DEFAULT_CATEGORY = "UN";
const GRAFFITI_OFFSET_SLOTS = [0, -1, 1, -2, 2, -3, 3];
const CAMERA_MODES = {
  free: { label: "FREE / 自由" },
  street: {
    label: "STREET / 街路",
    distance: 7,
    height: 6.5,
    lookAhead: 16,
    targetHeight: 4.5,
    shoulder: 0.8,
    damping: 7,
    fov: 62,
    stampScale: 0.25,
    curtainOpacity: 0.12,
  },
  kite: {
    label: "KITE / カイト",
    distance: 55,
    height: 72,
    lookAhead: 42,
    targetHeight: 8,
    shoulder: 0,
    damping: 3.2,
    fov: 50,
    stampScale: 0.52,
    curtainOpacity: 0.2,
  },
  chase: {
    label: "CHASE / 遠景",
    distance: 170,
    height: 82,
    lookAhead: 90,
    targetHeight: 14,
    shoulder: 0,
    damping: 2.2,
    fov: 45,
    stampScale: 0.72,
    curtainOpacity: 0.26,
  },
  aerial: {
    label: "AERIAL / 空撮",
    distance: 60,
    height: 230,
    lookAhead: 80,
    targetHeight: 2,
    shoulder: 0,
    damping: 1.7,
    fov: 38,
    stampScale: 0.62,
    curtainOpacity: 0.25,
  },
};
const CATEGORY_STYLES = {
  H: { label: "高校生", color: "#22d3ee", soft: "#a5f3fc" },
  U: { label: "大学生", color: "#3b82f6", soft: "#bfdbfe" },
  Y: { label: "若い社会人", color: "#8b5cf6", soft: "#ddd6fe" },
  A: { label: "中高年", color: "#f59e0b", soft: "#fde68a" },
  S: { label: "高齢者", color: "#ef4444", soft: "#fecaca" },
  CP: { label: "カップル", color: "#ec4899", soft: "#fbcfe8" },
  FM: { label: "家族", color: "#14b8a6", soft: "#99f6e4" },
  MX: { label: "属性混合", color: "#a78bfa", soft: "#ede9fe" },
  UN: { label: "その他・不明", color: "#94a3b8", soft: "#e2e8f0" },
};

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
let cameraMode = "free";
let cameraState = null;
let trackPoints = [];
let routeTracks = [];
let memoPoints = [];
let memosBySource = new Map();
let elapsedRouteLines = [];
let elapsedCurtains = [];
let playStartMs = 0;
let playStartOffset = 0;
let isPlaying = false;
let timelineStart = 0;
let timelineEnd = 0;
let playbackScale = 1;
let playbackRate = 1;
let lastFrameMs = performance.now();
const followTarget = new THREE.Vector3();
const followDirection = new THREE.Vector3(1, 0, 0);

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
for (const button of cameraModeButtons) {
  button.addEventListener("click", () => setCameraMode(button.dataset.cameraMode));
}
playToggle.addEventListener("click", togglePlayback);
speedSlider.addEventListener("input", () => setPlaybackRate(Number(speedSlider.value)));
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
    cameraMode = "free";
    syncCameraModeUi();
    controls.enabled = true;
    setTopDownView();
  } else {
    cameraMode = "free";
    syncCameraModeUi();
    setPerspectiveView();
  }
}

function setCameraMode(nextMode) {
  if (!CAMERA_MODES[nextMode] || !cameraState) return;

  if (viewMode !== "3d") {
    setViewMode("3d");
  }

  cameraMode = nextMode;
  syncCameraModeUi();

  if (cameraMode === "free") {
    controls.enabled = true;
    setPerspectiveView();
    return;
  }

  activeCamera = perspectiveCamera;
  controls.object = perspectiveCamera;
  controls.enabled = false;
  followTarget.copy(controls.target);
  const direction = new THREE.Vector3();
  perspectiveCamera.getWorldDirection(direction);
  direction.y = 0;
  if (direction.lengthSq() > 0.001) followDirection.copy(direction.normalize());

  const config = CAMERA_MODES[cameraMode];
  perspectiveCamera.fov = config.fov;
  perspectiveCamera.near = 0.1;
  perspectiveCamera.far = Math.max(cameraState.distance * 10, 2000);
  perspectiveCamera.up.set(0, 1, 0);
  perspectiveCamera.updateProjectionMatrix();
}

function syncCameraModeUi() {
  for (const button of cameraModeButtons) {
    const isActive = button.dataset.cameraMode === cameraMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  cameraModeReadout.textContent = CAMERA_MODES[cameraMode].label;
  updateCameraVisualDensity();
}

function updateCameraVisualDensity() {
  const config = CAMERA_MODES[cameraMode];
  const stampScale = config.stampScale ?? 1;
  for (const memo of memoPoints) {
    const stamp = memo.marker?.userData.stamp;
    const baseScale = stamp?.userData.baseScale;
    if (stamp && baseScale) stamp.scale.copy(baseScale).multiplyScalar(stampScale);
  }
  for (const { curtain } of elapsedCurtains) {
    curtain.material.opacity = config.curtainOpacity ?? 0.32;
  }
}

function setPerspectiveView() {
  const { distance, focus } = cameraState;

  activeCamera = perspectiveCamera;
  controls.object = activeCamera;
  controls.enabled = true;
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
  controls.enabled = true;
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
  const results = await Promise.allSettled(
    GPX_FILES.map(async (source) => {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`Failed to load GPX: ${source.url}`);
      const gpxText = await response.text();
      const doc = new DOMParser().parseFromString(gpxText, "application/xml");
      if (doc.querySelector("parsererror")) throw new Error(`Invalid GPX: ${source.url}`);
      return {
        tracks: parseTrackSegments(doc, source),
        memos: parseMemoPoints(doc, source),
      };
    }),
  );

  const loaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => console.error(result.reason));

  routeTracks = loaded.flatMap((result) => result.tracks);
  trackPoints = routeTracks.flatMap((track) => track.points).sort((a, b) => a.time - b.time);
  memoPoints = loaded.flatMap((result) => result.memos).sort((a, b) => a.time - b.time);
  memosBySource = new Map(
    GPX_FILES.map((source) => [source.id, memoPoints.filter((memo) => memo.sourceId === source.id)]),
  );

  if (!trackPoints.length) return;

  ({ start: timelineStart, end: timelineEnd } = getTimeRange(trackPoints[0].time));
  timeSlider.max = String(Math.round((timelineEnd - timelineStart) / 1000));
  playbackScale = Number(timeSlider.max) / PLAYBACK_DURATION_SECONDS;

  addRouteLines();
  addTimeAxis();
  addMemoPins();
  renderTimelineMarkers();
  updateCameraVisualDensity();
  focusCameraOnRoute();
  updateTimeline(0);
}

function parseTrackSegments(doc, source) {
  let segments = [...doc.getElementsByTagNameNS("*", "trkseg")];
  if (!segments.length) segments = [doc];

  return segments
    .map((segment, index) => ({
      id: `${source.id}-track-${index}`,
      sourceId: source.id,
      sourceLabel: source.label,
      points: [...segment.getElementsByTagNameNS("*", "trkpt")]
        .map((point) => ({
          lat: Number(point.getAttribute("lat")),
          lon: Number(point.getAttribute("lon")),
          time: parseTime(getChildText(point, "time")),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.time))
        .sort((a, b) => a.time - b.time),
    }))
    .filter((track) => track.points.length > 1);
}

function parseMemoPoints(doc, source) {
  return [...doc.getElementsByTagNameNS("*", "wpt")]
    .map((point, index) => {
      const rawName = getChildText(point, "name");
      const rawDesc = getChildText(point, "desc");
      return {
        lat: Number(point.getAttribute("lat")),
        lon: Number(point.getAttribute("lon")),
        time: parseTime(getChildText(point, "time")),
        name: rawName || rawDesc || `Memo ${index + 1}`,
        desc: rawName ? rawDesc : "",
        sourceId: source.id,
        sourceLabel: source.label,
        ...getMemoProfile(`${rawName} ${rawDesc}`),
        marker: null,
      };
    })
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

function addRouteLines() {
  elapsedRouteLines = [];
  elapsedCurtains = [];

  for (const track of routeTracks) {
    const positions = [];
    const colors = [];
    for (const point of track.points) {
      const world = geoToWorld(point);
      positions.push(world.x, timeToHeight(point.time), world.z);
      colors.push(...getRouteColor(point.time, track.sourceId).toArray());
    }

    const routeGeometry = new THREE.BufferGeometry();
    routeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    routeGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const fullRouteLine = new THREE.Line(
      routeGeometry.clone(),
      new THREE.LineBasicMaterial({
        color: ROUTE_BASE_COLOR,
        transparent: true,
        opacity: 0.26,
        depthTest: false,
      }),
    );
    fullRouteLine.renderOrder = 20;
    gpxGroup.add(fullRouteLine);

    const line = new THREE.Line(
      routeGeometry.clone(),
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthTest: false,
      }),
    );
    line.renderOrder = 21;
    line.geometry.setDrawRange(0, 0);
    gpxGroup.add(line);
    elapsedRouteLines.push({ line, points: track.points });

    const curtain = new THREE.Mesh(
      createCurtainGeometry(track.points, track.sourceId),
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    curtain.renderOrder = 18;
    curtain.geometry.setDrawRange(0, 0);
    gpxGroup.add(curtain);
    elapsedCurtains.push({ curtain, points: track.points });
  }
}

function createCurtainGeometry(points, sourceId) {
  const positions = [];
  const colors = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const first = geoToWorld(points[index]);
    const second = geoToWorld(points[index + 1]);
    const firstTop = new THREE.Vector3(first.x, timeToHeight(points[index].time), first.z);
    const secondTop = new THREE.Vector3(second.x, timeToHeight(points[index + 1].time), second.z);
    const firstBase = new THREE.Vector3(first.x, TIME_BASE_Y, first.z);
    const secondBase = new THREE.Vector3(second.x, TIME_BASE_Y, second.z);
    const firstColor = getRouteColor(points[index].time, sourceId);
    const secondColor = getRouteColor(points[index + 1].time, sourceId);
    const firstShadow = firstColor.clone().multiplyScalar(0.16);
    const secondShadow = secondColor.clone().multiplyScalar(0.16);

    pushCurtainVertex(positions, colors, firstBase, firstShadow);
    pushCurtainVertex(positions, colors, firstTop, firstColor);
    pushCurtainVertex(positions, colors, secondTop, secondColor);
    pushCurtainVertex(positions, colors, firstBase, firstShadow);
    pushCurtainVertex(positions, colors, secondTop, secondColor);
    pushCurtainVertex(positions, colors, secondBase, secondShadow);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function pushCurtainVertex(positions, colors, point, color) {
  positions.push(point.x, point.y, point.z);
  colors.push(color.r, color.g, color.b);
}

function getRouteColor(time, sourceId) {
  let latestMemo = null;
  for (const memo of memosBySource.get(sourceId) || []) {
    if (memo.time > time) break;
    latestMemo = memo;
  }
  const category = latestMemo?.category || DEFAULT_CATEGORY;
  const color = new THREE.Color(CATEGORY_STYLES[category].color);
  if (latestMemo?.count) {
    const groupStrength = THREE.MathUtils.clamp(Math.log2(latestMemo.count + 1) / 8, 0, 0.22);
    color.lerp(new THREE.Color(0xffffff), groupStrength);
  }
  return color;
}

function addTimeAxis() {
  const routeBounds = new THREE.Box3();
  for (const point of [...trackPoints, ...memoPoints]) {
    routeBounds.expandByPoint(geoToWorld(point));
  }

  const size = routeBounds.getSize(new THREE.Vector3());
  const padding = Math.max(Math.min(Math.max(size.x, size.z) * 0.08, 24), 10);
  const minX = routeBounds.min.x - padding;
  const maxX = routeBounds.max.x + padding;
  const minZ = routeBounds.min.z - padding;
  const maxZ = routeBounds.max.z + padding;
  const axisColor = 0x6090bd;
  const frameMaterial = new THREE.LineBasicMaterial({
    color: axisColor,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const axisMaterial = frameMaterial.clone();
  axisMaterial.opacity = 0.48;

  const corners = [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ],
  ];
  for (const [x, z] of corners) {
    const post = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, TIME_BASE_Y, z),
        new THREE.Vector3(x, TIME_BASE_Y + TIME_AXIS_HEIGHT, z),
      ]),
      frameMaterial,
    );
    post.renderOrder = 12;
    gpxGroup.add(post);
  }

  for (let hour = TIME_START_HOUR; hour <= TIME_END_HOUR; hour += 1) {
    const ratio = (hour - TIME_START_HOUR) / (TIME_END_HOUR - TIME_START_HOUR);
    const y = TIME_BASE_Y + ratio * TIME_AXIS_HEIGHT;
    const frame = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(minX, y, minZ),
        new THREE.Vector3(maxX, y, minZ),
        new THREE.Vector3(maxX, y, maxZ),
        new THREE.Vector3(minX, y, maxZ),
      ]),
      hour === TIME_START_HOUR || hour === TIME_END_HOUR ? axisMaterial : frameMaterial,
    );
    frame.renderOrder = 12;
    gpxGroup.add(frame);

    const label = makeAxisLabel(hour === 24 ? "24:00" : `${String(hour).padStart(2, "0")}:00`);
    label.position.set(minX - padding * 0.65, y, minZ);
    gpxGroup.add(label);
  }

  const title = makeAxisLabel("TIME (Z) · JST", true);
  title.position.set(minX, TIME_BASE_Y + TIME_AXIS_HEIGHT + 12, minZ);
  gpxGroup.add(title);
}

function focusCameraOnRoute() {
  const routeVisualBounds = new THREE.Box3();
  for (const point of [...trackPoints, ...memoPoints]) {
    const world = geoToWorld(point);
    routeVisualBounds.expandByPoint(new THREE.Vector3(world.x, TIME_BASE_Y, world.z));
    routeVisualBounds.expandByPoint(new THREE.Vector3(world.x, timeToHeight(point.time), world.z));
  }
  routeVisualBounds.max.y = Math.max(routeVisualBounds.max.y, TIME_BASE_Y + TIME_AXIS_HEIGHT);

  const focus = routeVisualBounds.getCenter(new THREE.Vector3());
  const size = routeVisualBounds.getSize(new THREE.Vector3());
  const sphere = routeVisualBounds.getBoundingSphere(new THREE.Sphere());
  const fov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
  const distance = (sphere.radius / Math.tan(fov / 2)) * 1.2;
  const maxSize = Math.max(size.x, size.y, size.z);

  cameraState = { distance, focus, maxSize };
  perspectiveCamera.position.set(
    focus.x + distance * 0.24,
    focus.y + distance * 0.52,
    focus.z + distance * 0.88,
  );
  perspectiveCamera.near = Math.max(distance / 2000, 0.1);
  perspectiveCamera.far = distance * 10;
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(focus);
  controls.minDistance = distance * 0.14;
  controls.maxDistance = distance * 5;
  controls.update();
}

function addMemoPins() {
  let clusterStart = -Infinity;
  let clusterIndex = 0;
  for (const memo of memoPoints) {
    if (memo.time - clusterStart > 90_000) {
      clusterStart = memo.time;
      clusterIndex = 0;
    }
    const slot = GRAFFITI_OFFSET_SLOTS[clusterIndex % GRAFFITI_OFFSET_SLOTS.length];
    const marker = createMemoMarker(memo, slot);
    marker.visible = false;
    memo.marker = marker;
    gpxGroup.add(marker);
    clusterIndex += 1;
  }
}

function createMemoMarker(memo, offsetSlot) {
  const frame = getRouteFrameAtTime(memo.time, memo.sourceId);
  const category = CATEGORY_STYLES[memo.category];
  const categoryColor = new THREE.Color(category.color);
  const lateralOffset = offsetSlot * 6.5;
  const offset = frame.normal.clone().multiplyScalar(lateralOffset);
  const group = new THREE.Group();
  group.position.copy(frame.position).add(offset);
  group.position.y = timeToHeight(memo.time);

  const leader = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), offset.clone().multiplyScalar(-1)]),
    new THREE.LineBasicMaterial({
      color: categoryColor,
      transparent: true,
      opacity: lateralOffset ? 0.48 : 0.18,
      depthTest: false,
    }),
  );
  leader.renderOrder = 29;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 12, 8),
    new THREE.MeshBasicMaterial({ color: categoryColor, depthTest: false }),
  );
  head.renderOrder = 31;

  const stamp = makeGraffitiStamp(memo, category);
  stamp.position.y = 2.2;
  stamp.userData.baseScale = stamp.scale.clone();
  group.userData.stamp = stamp;

  group.add(leader, head, stamp);
  return group;
}

function updateTimeline(seconds) {
  const currentTime = timelineStart + seconds * 1000;
  timeSlider.value = String(seconds);
  timeReadout.textContent = formatTime(currentTime);
  const progress = THREE.MathUtils.clamp(seconds / Number(timeSlider.max), 0, 1);
  timeProgress.style.width = `calc((100% - 16px) * ${progress})`;

  for (const { line, points } of elapsedRouteLines) {
    line.geometry.setDrawRange(0, countPointsUntil(points, currentTime));
  }
  for (const { curtain, points } of elapsedCurtains) {
    const routeCount = countPointsUntil(points, currentTime);
    curtain.geometry.setDrawRange(0, Math.max(0, routeCount - 1) * 6);
  }

  for (const memo of memoPoints) {
    memo.marker.visible = memo.time <= currentTime;
  }

  renderMemoList(currentTime);
}

function renderTimelineMarkers() {
  const collisionCounts = new Map();
  const offsets = [0, -3, 3, -6, 6, -9, 9];
  const duration = timelineEnd - timelineStart;
  const markers = memoPoints
    .filter((memo) => memo.time >= timelineStart && memo.time <= timelineEnd)
    .map((memo) => {
      const marker = document.createElement("i");
      const position = ((memo.time - timelineStart) / duration) * 100;
      const collisionKey = Math.floor((memo.time - timelineStart) / 30_000);
      const collisionIndex = collisionCounts.get(collisionKey) || 0;
      collisionCounts.set(collisionKey, collisionIndex + 1);
      const height = memo.isPeople
        ? THREE.MathUtils.clamp(6 + Math.sqrt(memo.count || 1) * 2.6, 8, 16)
        : 6;

      marker.className = `time-event-marker${memo.isPeople ? "" : " is-neutral"}`;
      marker.style.left = `${position}%`;
      marker.style.height = `${height}px`;
      marker.style.setProperty("--marker-color", CATEGORY_STYLES[memo.category].color);
      marker.style.setProperty("--marker-offset", `${offsets[collisionIndex % offsets.length]}px`);
      return marker;
    });

  timeEventMarkers.replaceChildren(...markers);
  observationCount.textContent = String(markers.length);
  timeEventMarkers.setAttribute("aria-label", `${markers.length}件の観察データの時刻`);
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
      const category = CATEGORY_STYLES[memo.category];
      item.style.setProperty("--memo-color", category.color);
      item.style.setProperty("--memo-soft", category.soft);
      item.style.setProperty("--memo-rgb", hexToRgbChannels(category.color));

      const meta = document.createElement("div");
      meta.className = "memo-meta";

      const time = document.createElement("time");
      time.textContent = formatTime(memo.time);

      const badge = document.createElement("span");
      badge.className = "memo-category";
      badge.textContent = formatProfileBadge(memo, category);

      const title = document.createElement("strong");
      title.textContent = memo.name;

      const source = document.createElement("small");
      source.className = "memo-source";
      source.textContent = memo.sourceLabel;

      meta.append(time, badge);
      item.append(meta, title, source);
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

function setPlaybackRate(nextRate) {
  const now = performance.now();
  if (isPlaying) {
    const elapsedSeconds = ((now - playStartMs) / 1000) * playbackScale * playbackRate;
    playStartOffset = Math.min(Number(timeSlider.max), playStartOffset + elapsedSeconds);
    playStartMs = now;
    updateTimeline(Math.floor(playStartOffset));
  }

  playbackRate = THREE.MathUtils.clamp(nextRate, Number(speedSlider.min), Number(speedSlider.max));
  speedSlider.value = String(playbackRate);
  speedReadout.textContent = `${Number(playbackRate.toFixed(2))}×`;
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

function getTimeRange(referenceTime) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).formatToParts(referenceTime);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const start = Date.parse(`${date}T${String(TIME_START_HOUR).padStart(2, "0")}:00:00+09:00`);
  return {
    start,
    end: start + (TIME_END_HOUR - TIME_START_HOUR) * 60 * 60 * 1000,
  };
}

function timeToHeight(time) {
  const ratio = THREE.MathUtils.clamp((time - timelineStart) / (timelineEnd - timelineStart), 0, 1);
  return TIME_BASE_Y + ratio * TIME_AXIS_HEIGHT;
}

function getActiveRouteTrack(time, sourceId = null) {
  const candidates = sourceId
    ? routeTracks.filter((track) => track.sourceId === sourceId)
    : routeTracks;
  return candidates.reduce((closest, track) => {
    const start = track.points[0].time;
    const end = track.points[track.points.length - 1].time;
    const distance = time < start ? start - time : time > end ? time - end : 0;
    return !closest || distance < closest.distance ? { track, distance } : closest;
  }, null)?.track || routeTracks[0];
}

function getRouteFrameAtTime(time, sourceId = null) {
  const track = getActiveRouteTrack(time, sourceId);
  const points = track.points;
  const nextIndex = countPointsUntil(points, time);
  const beforeIndex = THREE.MathUtils.clamp(nextIndex - 1, 0, points.length - 1);
  const afterIndex = THREE.MathUtils.clamp(nextIndex, 0, points.length - 1);
  const before = points[beforeIndex];
  const after = points[afterIndex];
  const duration = Math.max(after.time - before.time, 1);
  const progress = THREE.MathUtils.clamp((time - before.time) / duration, 0, 1);
  const position = geoToWorld(before).lerp(geoToWorld(after), progress);

  const tangentStart = geoToWorld(points[Math.max(0, beforeIndex - 1)]);
  const tangentEnd = geoToWorld(points[Math.min(points.length - 1, afterIndex + 1)]);
  const tangent = tangentEnd.sub(tangentStart);
  tangent.y = 0;
  if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
  tangent.normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
  return { position, tangent, normal, points };
}

function getRoutePointAhead(time, distance) {
  const frame = getRouteFrameAtTime(time);
  const points = frame.points;
  let current = frame.position.clone();
  let remaining = distance;
  const startIndex = countPointsUntil(points, time);

  for (let index = startIndex; index < points.length; index += 1) {
    const next = geoToWorld(points[index]);
    const segmentLength = current.distanceTo(next);
    if (segmentLength >= remaining && segmentLength > 0) {
      return current.lerp(next, remaining / segmentLength);
    }
    remaining -= segmentLength;
    current = next;
  }

  return current;
}

function updateFollowCamera(deltaSeconds) {
  if (cameraMode === "free" || viewMode !== "3d" || !trackPoints.length) return;

  const config = CAMERA_MODES[cameraMode];
  const currentTime = timelineStart + Number(timeSlider.value) * 1000;
  const frame = getRouteFrameAtTime(currentTime);
  const routePosition = frame.position.clone();
  routePosition.y = TIME_BASE_Y;
  const ahead = getRoutePointAhead(currentTime, config.lookAhead);
  ahead.y = TIME_BASE_Y + config.targetHeight;

  const desiredDirection = ahead.clone().sub(routePosition);
  desiredDirection.y = 0;
  if (desiredDirection.lengthSq() < 0.001) desiredDirection.copy(frame.tangent);
  desiredDirection.normalize();

  const headingAlpha = 1 - Math.exp(-config.damping * 0.72 * deltaSeconds);
  followDirection.lerp(desiredDirection, headingAlpha).normalize();
  const normal = new THREE.Vector3(-followDirection.z, 0, followDirection.x);
  const desiredPosition = routePosition.clone()
    .addScaledVector(followDirection, -config.distance)
    .addScaledVector(normal, config.shoulder);
  desiredPosition.y += config.height;

  const positionAlpha = 1 - Math.exp(-config.damping * deltaSeconds);
  perspectiveCamera.position.lerp(desiredPosition, positionAlpha);
  followTarget.lerp(ahead, positionAlpha);
  perspectiveCamera.lookAt(followTarget);
}

function getMemoProfile(text) {
  const normalized = text
    .normalize("NFKC")
    .toUpperCase()
    .replace(/(^|[^A-Z])YW(?=$|[^A-Z])/g, "$1YF")
    .replace(/(^|[^A-Z])([HUYAS])\s*-\s*CP(?=$|[^A-Z])/g, "$1$2CP");
  const matches = [];
  const tokenPattern = /(^|[^A-Z])((?:[HUYAS](?:M|F|X|CP))|CP|FM|MX|UN)(?:\s*[- ]?\s*(\d+(?:\.\d+)*))?(?=$|[^A-Z])/g;
  let match;

  while ((match = tokenPattern.exec(normalized))) {
    const count = match[3]
      ? match[3].split(".").reduce((total, value) => total + Number(value), 0)
      : null;
    matches.push({ symbol: match[2], count });
  }

  // A few titles use age-only shorthand such as A2. Treat it as mixed gender.
  if (!matches.length) {
    const ageOnly = normalized.match(/(?:^|[^A-Z])([HUYAS])\s*[- ]?\s*(\d+)(?=$|[^A-Z])/);
    if (ageOnly) matches.push({ symbol: `${ageOnly[1]}X`, count: Number(ageOnly[2]) });
  }

  if (!matches.length) {
    return {
      category: DEFAULT_CATEGORY,
      symbol: "UN",
      gender: "U",
      count: null,
      isPeople: false,
    };
  }

  const categories = new Set(matches.map(({ symbol }) => getSymbolCategory(symbol)));
  const genders = new Set(matches.map(({ symbol }) => getSymbolGender(symbol)).filter((value) => value !== "U"));
  const category = categories.size === 1 ? [...categories][0] : "MX";
  const gender = genders.size === 1 ? [...genders][0] : "X";
  const genderCounts = [...normalized.matchAll(/(?:女性|男性)\s*(\d+)\s*人/g)]
    .map((result) => Number(result[1]));
  const narrativeCount = genderCounts.length > 1
    ? genderCounts.reduce((total, value) => total + value, 0)
    : Number(normalized.match(/(\d+)\s*人/)?.[1]) || null;
  const inferredCount = matches.reduce(
    (total, item) => total + (item.count ?? (/CP$/.test(item.symbol) ? 2 : 1)),
    0,
  );
  const hasMissingCount = matches.some((item) => item.count === null);
  const count = narrativeCount && (hasMissingCount || matches.length > 1)
    ? narrativeCount
    : inferredCount;
  const symbol = matches.length === 1
    ? matches[0].symbol
    : category.length === 1
      ? `${category}${gender}`
      : category;

  return { category, symbol, gender, count, isPeople: true };
}

function getSymbolCategory(symbol) {
  return ["CP", "FM", "MX", "UN"].includes(symbol) ? symbol : symbol[0];
}

function getSymbolGender(symbol) {
  return symbol.length === 2 && ["M", "F", "X"].includes(symbol[1]) ? symbol[1] : "X";
}

function formatProfileBadge(memo, category) {
  if (!memo.isPeople) return category.label;
  const genderLabels = { M: "男性", F: "女性", X: "混合", U: "不明" };
  return `${memo.symbol} · ${genderLabels[memo.gender]} · ${memo.count}人`;
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

function makeGraffitiStamp(memo, category) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const rgb = hexToRgbChannels(category.color);
  const random = makeSeededRandom(`${memo.name}-${memo.time}`);

  ctx.save();
  ctx.shadowColor = category.color;
  ctx.shadowBlur = 22;
  ctx.fillStyle = `rgba(${rgb}, 0.2)`;
  ctx.strokeStyle = category.color;
  ctx.lineWidth = 11;
  ctx.lineJoin = "round";
  drawGenderShape(ctx, memo.gender);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = `rgba(${rgb}, 0.56)`;
  for (let index = 0; index < 18; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 82 + random() * 36;
    const radius = 1.5 + random() * 4.5;
    ctx.beginPath();
    ctx.arc(128 + Math.cos(angle) * distance, 128 + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(2, 6, 17, 0.92)";
  ctx.shadowBlur = 8;
  ctx.font = "900 54px system-ui, sans-serif";
  ctx.fillText(memo.isPeople ? memo.symbol : "•", 128, memo.isPeople ? 108 : 122);
  if (memo.count) {
    ctx.fillStyle = category.soft;
    ctx.font = "900 34px Consolas, monospace";
    ctx.fillText(`×${memo.count}`, 128, 160);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const count = memo.count || 1;
  const size = memo.isPeople
    ? THREE.MathUtils.clamp(10 + Math.sqrt(count) * 4, 14, 27)
    : 8;
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 32;
  return sprite;
}

function drawGenderShape(ctx, gender) {
  if (gender === "F") {
    ctx.beginPath();
    ctx.arc(128, 128, 72, 0, Math.PI * 2);
    return;
  }

  if (gender === "X") {
    ctx.beginPath();
    ctx.moveTo(128, 42);
    ctx.lineTo(214, 128);
    ctx.lineTo(128, 214);
    ctx.lineTo(42, 128);
    ctx.closePath();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(54, 48);
  ctx.lineTo(202, 48);
  ctx.lineTo(214, 62);
  ctx.lineTo(214, 194);
  ctx.lineTo(202, 208);
  ctx.lineTo(54, 208);
  ctx.lineTo(42, 194);
  ctx.lineTo(42, 62);
  ctx.closePath();
}

function makeSeededRandom(value) {
  let seed = 2166136261;
  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let result = seed;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function makeAxisLabel(text, isTitle = false) {
  const canvas = document.createElement("canvas");
  canvas.width = isTitle ? 300 : 150;
  canvas.height = 54;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(2, 6, 17, 0.72)";
  roundedRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, 10);
  ctx.fill();
  ctx.fillStyle = isTitle ? "#bfdbfe" : "#94a3b8";
  ctx.font = `${isTitle ? 700 : 600} ${isTitle ? 22 : 24}px Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: isTitle ? 0.86 : 0.72,
    depthTest: false,
  }));
  sprite.scale.set(canvas.width * 0.14, canvas.height * 0.14, 1);
  sprite.renderOrder = 14;
  return sprite;
}

function hexToRgbChannels(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
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
  const frameMs = performance.now();
  const deltaSeconds = Math.min((frameMs - lastFrameMs) / 1000, 0.1);
  lastFrameMs = frameMs;

  if (isPlaying) {
    const nextSeconds = Math.min(
      Number(timeSlider.max),
      playStartOffset + Math.floor(((frameMs - playStartMs) / 1000) * playbackScale * playbackRate),
    );
    updateTimeline(nextSeconds);
    if (nextSeconds >= Number(timeSlider.max)) {
      stopPlayback();
    }
  }

  if (cameraMode === "free" || viewMode !== "3d") {
    controls.update();
  } else {
    updateFollowCamera(deltaSeconds);
  }
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
