import * as THREE from "three";
import {
  CAMERA_MODES,
  CATEGORY_STYLES,
  DEFAULT_CATEGORY,
  GPX_FILES,
  GRAFFITI_OFFSET_SLOTS,
  INITIAL_CENTER_GEO,
  MAP_BLUE_COLOR,
  PLAYBACK_DURATION_SECONDS,
  ROUTE_BASE_COLOR,
  TIME_AXIS_HEIGHT,
  TIME_BASE_Y,
  TIME_END_HOUR,
  TIME_START_HOUR,
} from "./config.js";
import { createLegendFilter } from "../r4U_js/filters.js";
import { create2DMapController } from "../r4U_js/map2d.js?v=20260722-5";
import { createViewToggle } from "../r4U_js/viewToggle.js";
import { formatTime } from "./formatters.js";
import { createMapDisplay } from "./main.js";
import { makeAxisLabel, makeGraffitiStamp } from "../Yoh_js/markers.js";
import { renderMemoPanel } from "../r4U_js/memoPanel.js";
import { getMemoProfile } from "../r4U_js/profiles.js";

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
const legendFilterRoot = document.querySelector("#legend-filter");
const cameraModeButtons = [...document.querySelectorAll("[data-camera-mode]")];
const cameraModeReadout = document.querySelector("#camera-mode-readout");

const mapDisplay = createMapDisplay(canvas);
const {
  renderer,
  scene,
  perspectiveCamera,
  orthographicCamera,
  controls,
  mapGroup,
  gpxGroup,
  groundGrid,
  raycaster,
  pointer,
  groundPlane,
  selectableMeshes,
  bounds,
  modelCenter,
  modelSize,
  loadModel,
  worldToGeo,
  geoToWorld,
} = mapDisplay;
let activeCamera = perspectiveCamera;
let viewMode = "3d";
let cameraMode = "free";
let cameraState = null;
let trackPoints = [];
let routeTracks = [];
let memoPoints = [];
let memosBySource = new Map();
let activeMemo = null;
let legendFilter = null;
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
const map2d = create2DMapController({
  canvas,
  camera: orthographicCamera,
  controls,
  timeBaseY: TIME_BASE_Y,
  timeAxisHeight: TIME_AXIS_HEIGHT,
});
const viewToggle = createViewToggle({
  view3dButton,
  view2dButton,
  onChange: setViewMode,
});
viewToggle.setActive(viewMode);

loadModel(() => {
  fitCameraToModel();
  loadGpx();
});

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
  viewToggle.setActive(viewMode);

  if (viewMode === "2d") {
    cameraMode = "free";
    syncCameraModeUi();
    activeCamera = map2d.activate(cameraState);
  } else {
    map2d.deactivate();
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
  for (const memo of memoPoints) {
    syncMemoMarkerScale(memo);
  }
  for (const { curtain } of elapsedCurtains) {
    curtain.material.opacity = (config.curtainOpacity ?? 0.32) * 0.36;
  }
}

function syncMemoMarkerScale(memo) {
  const stamp = memo.marker?.userData.stamp;
  const baseScale = stamp?.userData.baseScale;
  if (!stamp || !baseScale) return;
  const cameraScale = CAMERA_MODES[cameraMode].stampScale ?? 1;
  const selectedScale = memo === activeMemo ? 1.35 : 1;
  stamp.scale.copy(baseScale).multiplyScalar(cameraScale * selectedScale);
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
  legendFilter = createLegendFilter({
    root: legendFilterRoot,
    categories: CATEGORY_STYLES,
    sources: GPX_FILES,
    onChange: applyFilters,
  });
  legendFilter.updateCount(memoPoints);
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
        opacity: 0.1,
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
        opacity: 0.36,
        depthTest: false,
      }),
    );
    line.renderOrder = 21;
    line.geometry.setDrawRange(0, 0);
    gpxGroup.add(line);
    elapsedRouteLines.push({ line, points: track.points, sourceId: track.sourceId });

    const curtain = new THREE.Mesh(
      createCurtainGeometry(track.points, track.sourceId),
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    curtain.renderOrder = 18;
    curtain.geometry.setDrawRange(0, 0);
    gpxGroup.add(curtain);
    elapsedCurtains.push({ curtain, points: track.points, sourceId: track.sourceId });
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
  const axisColor = MAP_BLUE_COLOR;
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
      opacity: lateralOffset ? 0.2 : 0.08,
      depthTest: false,
    }),
  );
  leader.renderOrder = 29;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 12, 8),
    new THREE.MeshBasicMaterial({
      color: categoryColor,
      transparent: true,
      opacity: 0.4,
      depthTest: false,
    }),
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

  for (const { line, points, sourceId } of elapsedRouteLines) {
    line.visible = sourceIsVisible(sourceId);
    line.geometry.setDrawRange(0, countPointsUntil(points, currentTime));
  }
  for (const { curtain, points, sourceId } of elapsedCurtains) {
    curtain.visible = sourceIsVisible(sourceId);
    const routeCount = countPointsUntil(points, currentTime);
    curtain.geometry.setDrawRange(0, Math.max(0, routeCount - 1) * 6);
  }

  for (const memo of memoPoints) {
    memo.marker.visible = memo.time <= currentTime && memoMatchesFilters(memo);
    syncMemoMarkerScale(memo);
  }

  renderMemoPanel({
    list: memoList,
    memos: memoPoints.filter(memoMatchesFilters),
    currentTime,
    activeMemo,
    categories: CATEGORY_STYLES,
    formatTime,
    onSelect: selectMemo,
  });
}

function renderTimelineMarkers() {
  const collisionCounts = new Map();
  const offsets = [0, -3, 3, -6, 6, -9, 9];
  const duration = timelineEnd - timelineStart;
  const markers = memoPoints
    .filter((memo) => memo.time >= timelineStart && memo.time <= timelineEnd && memoMatchesFilters(memo))
    .map((memo) => {
      const marker = document.createElement("i");
      const position = ((memo.time - timelineStart) / duration) * 100;
      const collisionKey = Math.floor((memo.time - timelineStart) / 30_000);
      const collisionIndex = collisionCounts.get(collisionKey) || 0;
      collisionCounts.set(collisionKey, collisionIndex + 1);
      const height = memo.isPeople
        ? THREE.MathUtils.clamp(7 + (memo.count || 1) * 1.7, 9, 28)
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

function memoMatchesFilters(memo) {
  return legendFilter?.matches(memo) ?? true;
}

function sourceIsVisible(sourceId) {
  return legendFilter?.state.sources.has(sourceId) ?? true;
}

function applyFilters() {
  legendFilter?.updateCount(memoPoints);
  renderTimelineMarkers();
  updateTimeline(Number(timeSlider.value));
}

function selectMemo(memo) {
  activeMemo = memo;
  stopPlayback();
  const seconds = Math.round((memo.time - timelineStart) / 1000);
  updateTimeline(THREE.MathUtils.clamp(seconds, 0, Number(timeSlider.max)));
  focusCameraOnMemo(memo);
}

function focusCameraOnMemo(memo) {
  if (!memo.marker || !cameraState) return;

  if (viewMode !== "3d") {
    setViewMode("3d");
  }
  cameraMode = "free";
  syncCameraModeUi();
  controls.enabled = true;

  const focus = memo.marker.position.clone();
  const distance = Math.max(cameraState.distance * 0.18, 42);
  perspectiveCamera.position.set(focus.x + distance * 0.52, focus.y + distance * 0.45, focus.z + distance * 0.68);
  perspectiveCamera.near = 0.1;
  perspectiveCamera.far = Math.max(cameraState.distance * 8, 2000);
  perspectiveCamera.updateProjectionMatrix();
  controls.object = perspectiveCamera;
  controls.target.copy(focus);
  controls.update();
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }

  isPlaying = true;
  syncPlaybackButton();
  playStartOffset = Number(timeSlider.value);
  playStartMs = performance.now();
}

function stopPlayback() {
  isPlaying = false;
  syncPlaybackButton();
}

function syncPlaybackButton() {
  playToggle.classList.toggle("is-playing", isPlaying);
  playToggle.setAttribute("aria-pressed", String(isPlaying));
  const label = isPlaying ? "一時停止" : "再生";
  playToggle.setAttribute("aria-label", label);
  playToggle.title = label;
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

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  map2d.resize(width, height);
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

