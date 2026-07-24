import * as THREE from "three";
import { GPX_FILES, INITIAL_CENTER_GEO } from "../src/config.js";
import { createMapDisplay } from "../src/main.js?v=20260724-04";
import { PHOTOS } from "../src/photos.js";

const canvas = document.querySelector("#scene");
const detailRevealCanvas = document.querySelector("#detail-reveal-scene");
const loading = document.querySelector("#loading");
const modelBadge = document.querySelector("#model-badge");
const openPhotoListButton = document.querySelector("#open-photo-list");
const startCalibrationButton = document.querySelector("#start-calibration");
const closePhotoListButton = document.querySelector("#close-photo-list");
const photoList = document.querySelector("#photo-list");
const photoGrid = document.querySelector("#photo-grid");
const photoViewer = document.querySelector("#photo-viewer");
const photoOverlay = document.querySelector("#photo-overlay");
const photoClose = document.querySelector("#photo-close");
const photoPrev = document.querySelector("#photo-prev");
const photoNext = document.querySelector("#photo-next");
const photoOpacity = document.querySelector("#photo-opacity");
const photoScale = document.querySelector("#photo-scale");
const photoScaleReadout = document.querySelector("#photo-scale-readout");
const cameraFov = document.querySelector("#camera-fov");
const cameraFovReadout = document.querySelector("#camera-fov-readout");
const photoTitle = document.querySelector("#photo-title");
const photoPosition = document.querySelector("#photo-position");
const calibrationPanel = document.querySelector("#calibration-panel");
const calibrationProgress = document.querySelector("#calibration-progress");
const calibrationConfirm = document.querySelector("#confirm-calibration");
const calibrationCancel = document.querySelector("#cancel-calibration");
const calibrationReset = document.querySelector("#reset-calibration");
const poseInputs = [...document.querySelectorAll("[data-pose]")];
const calibrationStep = document.querySelector("#calibration-step");
const nudgeButtons = [...document.querySelectorAll("[data-nudge-axis]")];
const calibrationSummary = document.querySelector("#calibration-summary");
const calibrationResultList = document.querySelector("#calibration-result-list");
const calibrationOutput = document.querySelector("#calibration-output");
const copyCalibrationButton = document.querySelector("#copy-calibration");
const restartCalibrationButton = document.querySelector("#restart-calibration");
const closeCalibrationSummaryButton = document.querySelector("#close-calibration-summary");
const CALIBRATION_DRAFT_KEY = "kashiwa-photo-calibration-draft-v1";
const isPublicViewer = document.body.dataset.viewerMode === "public";

const {
  renderer,
  scene,
  perspectiveCamera,
  controls,
  mapGroup,
  groundGrid,
  bounds,
  modelCenter,
  modelSize,
  raycaster,
  pointer,
  loadModel,
  loadDetailModel,
  setModelMode,
  renderDetailLayer,
  setDetailLighting,
  getDetailSurfaceHeight,
  geoToWorld,
} = createMapDisplay(canvas);

const detailRevealRenderer = detailRevealCanvas
  ? new THREE.WebGLRenderer({
      canvas: detailRevealCanvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    })
  : null;
if (detailRevealRenderer) {
  detailRevealRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  detailRevealRenderer.outputColorSpace = THREE.SRGBColorSpace;
  detailRevealRenderer.setClearColor(0x000000, 0);
}

const photoGroup = new THREE.Group();
const photoHitTargets = [];
scene.add(photoGroup);

let routeTracks = [];
let photoMode = false;
let activePhotoIndex = -1;
let cameraSnapshot = null;
let pointerDown = null;
let viewToken = 0;
let calibrationMode = false;
let calibrationResults = [];
let detailRevealReady = false;
let overviewRevealTarget = null;
let overviewRevealCenter = null;
let overviewRevealVelocity = { x: 0, y: 0 };
let overviewRevealLastPointerAt = 0;
let overviewRevealLastFrameAt = performance.now();

loadModel(async () => {
  fitOverviewCamera();
  routeTracks = await loadRouteTracks();
  placePhotos();
  renderPhotoGrid();
  if (detailRevealRenderer) {
    loadDetailModel()
      .then(() => {
        detailRevealReady = true;
      })
      .catch((error) => {
        console.warn("Blosm overview reveal could not be prepared.", error);
      });
  }
  loading.classList.add("is-done");
  window.setTimeout(() => loading.remove(), 450);
});

openPhotoListButton.addEventListener("click", () => {
  photoList.hidden = false;
});
startCalibrationButton?.addEventListener("click", startCalibration);
closePhotoListButton.addEventListener("click", () => {
  photoList.hidden = true;
});
photoClose.addEventListener("click", () => {
  if (calibrationMode) cancelCalibration();
  else closePhoto();
});
photoPrev.addEventListener("click", () => stepPhoto(-1));
photoNext.addEventListener("click", () => stepPhoto(1));
photoOpacity.addEventListener("input", updatePhotoOpacity);
photoScale.addEventListener("input", updatePhotoScale);
cameraFov?.addEventListener("input", updateCameraFov);
calibrationConfirm?.addEventListener("click", confirmCalibrationPose);
calibrationCancel?.addEventListener("click", cancelCalibration);
calibrationReset?.addEventListener("click", resetCalibration);
poseInputs.forEach((input) => input.addEventListener("change", applyPoseInputs));
nudgeButtons.forEach((button) => button.addEventListener("click", () => {
  nudgeCamera(
    button.dataset.nudgeAxis,
    Number(button.dataset.nudgeDirection) * Number(calibrationStep.value),
  );
}));
copyCalibrationButton?.addEventListener("click", copyCalibrationOutput);
restartCalibrationButton?.addEventListener("click", () => {
  calibrationSummary.hidden = true;
  clearCalibrationDraft();
  startCalibration();
});
closeCalibrationSummaryButton?.addEventListener("click", () => {
  calibrationSummary.hidden = true;
});
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
  updateOverviewReveal(event);
});
canvas.addEventListener("pointermove", updateOverviewReveal);
canvas.addEventListener("pointerleave", hideOverviewReveal);
canvas.addEventListener("pointerup", selectPhotoPoint);
window.addEventListener("resize", resize);
window.addEventListener("keydown", handleKeyDown);

resize();
animate();

function fitOverviewCamera() {
  mapGroup.updateWorldMatrix(true, true);
  bounds.setFromObject(mapGroup);
  bounds.getCenter(modelCenter);
  bounds.getSize(modelSize);

  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const focus = geoToWorld(INITIAL_CENTER_GEO);
  focus.y = modelCenter.y - modelSize.y * 0.22;
  const fov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
  const distance = (sphere.radius / Math.tan(fov / 2)) * 0.34;

  perspectiveCamera.position.set(
    focus.x + distance * 0.36,
    focus.y + distance * 0.58,
    focus.z + distance * 0.9,
  );
  perspectiveCamera.near = Math.max(distance / 2500, 0.1);
  perspectiveCamera.far = Math.max(distance * 8, 3000);
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(focus);
  controls.minDistance = Math.max(distance * 0.12, 30);
  controls.maxDistance = distance * 4;
  controls.update();

  groundGrid.position.set(modelCenter.x, -0.04, modelCenter.z);
  groundGrid.scale.setScalar(Math.max(Math.max(modelSize.x, modelSize.z) / 900, 1));
}

async function loadRouteTracks() {
  const results = await Promise.allSettled(
    GPX_FILES.map(async (source) => {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`Failed to load ${source.file}`);
      const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
      return parseTrackSegments(xml, source);
    }),
  );

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
}

function parseTrackSegments(doc, source) {
  let segments = [...doc.getElementsByTagNameNS("*", "trkseg")];
  if (!segments.length) segments = [doc];

  return segments
    .map((segment, index) => ({
      id: `${source.id}-${index}`,
      sourceId: source.id,
      sourceLabel: source.label,
      points: [...segment.getElementsByTagNameNS("*", "trkpt")]
        .map((point) => ({
          lat: Number(point.getAttribute("lat")),
          lon: Number(point.getAttribute("lon")),
          time: Date.parse(point.getElementsByTagNameNS("*", "time")[0]?.textContent || ""),
        }))
        .filter((point) => (
          Number.isFinite(point.lat)
          && Number.isFinite(point.lon)
          && Number.isFinite(point.time)
        ))
        .sort((a, b) => a.time - b.time),
    }))
    .filter((track) => track.points.length > 1);
}

function placePhotos() {
  const ringGeometry = new THREE.RingGeometry(2.7, 3.2, 28);
  const hitGeometry = new THREE.CircleGeometry(4.8, 24);

  PHOTOS.forEach((photo, index) => {
    const frame = getPhotoFrame(photo);
    photo.worldPosition = frame.position;
    photo.direction = getPhotoDirection(photo, frame.tangent);

    const marker = new THREE.Group();
    marker.position.copy(photo.worldPosition);
    marker.position.y = 7;

    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    ring.renderOrder = 80;

    const hit = new THREE.Mesh(
      hitGeometry,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    hit.userData.photoIndex = index;
    hit.renderOrder = 81;

    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -7, 0),
        new THREE.Vector3(0, -3.2, 0),
      ]),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        toneMapped: false,
      }),
    );
    stem.renderOrder = 80;

    marker.add(ring, hit, stem);
    photo.marker = marker;
    photoHitTargets.push(hit);
    photoGroup.add(marker);
  });
}

function getPhotoFrame(photo) {
  const matchingTracks = routeTracks.filter(
    (track) => track.sourceLabel.toLowerCase() === photo.author.toLowerCase(),
  );
  const candidates = matchingTracks.length ? matchingTracks : routeTracks;
  const track = candidates.reduce((closest, candidate) => {
    const start = candidate.points[0].time;
    const end = candidate.points[candidate.points.length - 1].time;
    const distance = photo.capturedAt < start
      ? start - photo.capturedAt
      : photo.capturedAt > end
        ? photo.capturedAt - end
        : 0;
    return !closest || distance < closest.distance ? { track: candidate, distance } : closest;
  }, null)?.track;

  if (!track) {
    return {
      position: geoToWorld(INITIAL_CENTER_GEO),
      tangent: new THREE.Vector3(1, 0, 0),
    };
  }

  const nextIndex = countPointsUntil(track.points, photo.capturedAt);
  const beforeIndex = THREE.MathUtils.clamp(nextIndex - 1, 0, track.points.length - 1);
  const afterIndex = THREE.MathUtils.clamp(nextIndex, 0, track.points.length - 1);
  const before = track.points[beforeIndex];
  const after = track.points[afterIndex];
  const duration = Math.max(after.time - before.time, 1);
  const progress = THREE.MathUtils.clamp((photo.capturedAt - before.time) / duration, 0, 1);
  const position = geoToWorld(before).lerp(geoToWorld(after), progress);

  const tangentStart = geoToWorld(track.points[Math.max(0, beforeIndex - 1)]);
  const tangentEnd = geoToWorld(track.points[Math.min(track.points.length - 1, afterIndex + 1)]);
  const tangent = tangentEnd.sub(tangentStart);
  tangent.y = 0;
  if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
  tangent.normalize();
  return { position, tangent };
}

function countPointsUntil(points, time) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}

function getPhotoDirection(photo, routeDirection) {
  if (!Number.isFinite(photo.heading)) return routeDirection.clone();
  const radians = THREE.MathUtils.degToRad(photo.heading);
  return new THREE.Vector3(Math.sin(radians), 0, -Math.cos(radians)).normalize();
}

function renderPhotoGrid() {
  const cards = PHOTOS.map((photo, index) => {
    const button = document.createElement("button");
    button.className = "photo-card";
    button.type = "button";
    button.setAttribute("aria-label", `${photo.author} ${formatPhotoTime(photo.capturedAt)}の写真を開く`);

    const image = document.createElement("img");
    image.src = photo.url;
    image.alt = "";
    image.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = `${photo.author.toUpperCase()} · ${formatPhotoTime(photo.capturedAt)}`;
    button.append(image, label);
    button.addEventListener("click", () => {
      photoList.hidden = true;
      openPhoto(index);
    });
    return button;
  });
  photoGrid.replaceChildren(...cards);
}

async function openPhoto(index) {
  const normalizedIndex = (index + PHOTOS.length) % PHOTOS.length;
  const photo = PHOTOS[normalizedIndex];
  if (!photo.worldPosition) return;

  if (!photoMode) {
    cameraSnapshot = {
      position: perspectiveCamera.position.clone(),
      target: controls.target.clone(),
      fov: perspectiveCamera.fov,
      near: perspectiveCamera.near,
      far: perspectiveCamera.far,
      minDistance: controls.minDistance,
      maxDistance: controls.maxDistance,
      enablePan: controls.enablePan,
      enabled: controls.enabled,
      enableDamping: controls.enableDamping,
    };
  }

  const token = ++viewToken;
  photoMode = true;
  activePhotoIndex = normalizedIndex;
  document.body.classList.add("photo-mode");
  photoViewer.hidden = false;
  hideOverviewReveal();
  photoList.hidden = true;
  photoGroup.visible = false;
  photoOverlay.src = photo.url;
  photoOverlay.alt = `${photo.author}が${formatPhotoTime(photo.capturedAt)}に撮影した写真`;
  photoTitle.textContent = `${photo.author.toUpperCase()} · ${formatPhotoTime(photo.capturedAt)}`;
  photoPosition.textContent = `${normalizedIndex + 1} / ${PHOTOS.length}`;
  if (calibrationMode) {
    updateCalibrationProgress(normalizedIndex);
  }
  modelBadge.innerHTML = "<i></i>BLOSM · PHOTO VIEW";
  const savedCalibration = calibrationResults[normalizedIndex];
  photoOpacity.value = String(Math.round((savedCalibration?.photoOpacity ?? 0.58) * 100));
  photoScale.value = String(Math.round((savedCalibration?.photoScale || 1) * 100));
  if (cameraFov) cameraFov.value = String(savedCalibration?.fov ?? 62);
  updatePhotoOpacity();
  updatePhotoScale();
  updateCameraFov();

  controls.enabled = !isPublicViewer;
  controls.enableDamping = !isPublicViewer;
  controls.enablePan = calibrationMode;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = calibrationMode ? 0.45 : 1;
  controls.panSpeed = calibrationMode ? 0.8 : 1;
  controls.zoomSpeed = calibrationMode ? 0.7 : 1;
  controls.minDistance = calibrationMode ? 0.5 : 4;
  controls.maxDistance = calibrationMode ? 100 : 60;
  perspectiveCamera.up.set(0, 1, 0);
  const position = photo.worldPosition.clone();
  position.y = 7;
  const target = position.clone().addScaledVector(photo.direction, 28);
  target.y = 7;
  perspectiveCamera.position.copy(position);
  perspectiveCamera.fov = Number(cameraFov?.value ?? 62);
  perspectiveCamera.near = 0.1;
  perspectiveCamera.far = Math.max(cameraSnapshot?.far || 3000, 3000);
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();

  try {
    setDetailLighting(isPhotoBeforeTwenty(photo.capturedAt));
    await setModelMode("detail");
    if (token !== viewToken || !photoMode) {
      setModelMode("overview");
      return;
    }
    const surfaceY = getDetailSurfaceHeight(photo.worldPosition);
    if (savedCalibration) {
      restoreCalibrationPose(savedCalibration);
    } else if (Number.isFinite(surfaceY)) {
      position.y = surfaceY + 2.4;
      target.y = position.y;
      perspectiveCamera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    }
    if (calibrationMode) {
      updatePoseFields(true);
      calibrationConfirm.disabled = false;
    }
  } catch (error) {
    console.error("Blosm model could not be loaded.", error);
    closePhoto();
  }
}

function closePhoto() {
  if (!photoMode) return;
  photoMode = false;
  activePhotoIndex = -1;
  viewToken += 1;
  document.body.classList.remove("photo-mode");
  photoViewer.hidden = true;
  photoOverlay.removeAttribute("src");
  photoGroup.visible = true;
  modelBadge.innerHTML = "<i></i>3DMAP · OVERVIEW";
  setModelMode("overview");

  if (!cameraSnapshot) return;
  perspectiveCamera.position.copy(cameraSnapshot.position);
  perspectiveCamera.up.set(0, 1, 0);
  perspectiveCamera.fov = cameraSnapshot.fov;
  perspectiveCamera.near = cameraSnapshot.near;
  perspectiveCamera.far = cameraSnapshot.far;
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(cameraSnapshot.target);
  controls.minDistance = cameraSnapshot.minDistance;
  controls.maxDistance = cameraSnapshot.maxDistance;
  controls.enablePan = cameraSnapshot.enablePan;
  controls.enabled = cameraSnapshot.enabled;
  controls.enableDamping = cameraSnapshot.enableDamping;
  controls.update();
}

function stepPhoto(offset) {
  if (photoMode && !calibrationMode) openPhoto(activePhotoIndex + offset);
}

function updatePhotoOpacity() {
  photoViewer.style.setProperty("--photo-opacity", String(Number(photoOpacity.value) / 100));
}

function updatePhotoScale() {
  const scale = Number(photoScale.value) / 100;
  photoViewer.style.setProperty("--photo-scale", String(scale));
  photoScaleReadout.textContent = `${photoScale.value}%`;
}

function updateOverviewReveal(event) {
  if (!isPublicViewer || photoMode || !detailRevealReady || !detailRevealCanvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = THREE.MathUtils.clamp(event.clientX - rect.left, 0, rect.width);
  const y = THREE.MathUtils.clamp(event.clientY - rect.top, 0, rect.height);
  const now = performance.now();
  if (overviewRevealTarget) {
    const elapsed = THREE.MathUtils.clamp(now - overviewRevealLastPointerAt, 8, 50);
    const velocityX = (x - overviewRevealTarget.x) / elapsed;
    const velocityY = (y - overviewRevealTarget.y) / elapsed;
    overviewRevealVelocity.x = THREE.MathUtils.lerp(overviewRevealVelocity.x, velocityX, 0.42);
    overviewRevealVelocity.y = THREE.MathUtils.lerp(overviewRevealVelocity.y, velocityY, 0.42);
  } else {
    overviewRevealCenter = { x, y };
    detailRevealCanvas.style.setProperty("--reveal-x", `${x}px`);
    detailRevealCanvas.style.setProperty("--reveal-y", `${y}px`);
  }
  overviewRevealTarget = { x, y };
  overviewRevealLastPointerAt = now;
  document.body.classList.add("overview-reveal-active");
}

function hideOverviewReveal() {
  if (!isPublicViewer) return;
  document.body.classList.remove("overview-reveal-active");
  overviewRevealTarget = null;
  overviewRevealCenter = null;
  overviewRevealVelocity = { x: 0, y: 0 };
  detailRevealCanvas?.style.removeProperty("-webkit-clip-path");
  detailRevealCanvas?.style.removeProperty("clip-path");
}

function updateLiquidOverviewReveal(now) {
  if (
    !detailRevealCanvas
    || !overviewRevealTarget
    || !overviewRevealCenter
    || !document.body.classList.contains("overview-reveal-active")
  ) return;

  const elapsed = THREE.MathUtils.clamp(now - overviewRevealLastFrameAt, 1, 50);
  overviewRevealLastFrameAt = now;
  const follow = 1 - Math.exp(-elapsed / 82);
  overviewRevealCenter.x += (overviewRevealTarget.x - overviewRevealCenter.x) * follow;
  overviewRevealCenter.y += (overviewRevealTarget.y - overviewRevealCenter.y) * follow;

  const idleFor = now - overviewRevealLastPointerAt;
  const viscosity = idleFor > 40 ? 470 : 900;
  const damping = Math.exp(-elapsed / viscosity);
  overviewRevealVelocity.x *= damping;
  overviewRevealVelocity.y *= damping;

  const speed = Math.hypot(overviewRevealVelocity.x, overviewRevealVelocity.y);
  const strength = THREE.MathUtils.clamp(speed * 0.14, 0, 0.34);
  const direction = speed > 0.001
    ? Math.atan2(overviewRevealVelocity.y, overviewRevealVelocity.x)
    : 0;
  const radius = window.innerWidth <= 700
    ? 88
    : THREE.MathUtils.clamp(window.innerWidth * 0.1, 82, 132);
  const phase = now * 0.004;
  const points = [];

  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    const alignment = Math.cos(angle - direction);
    const lateral = Math.abs(Math.sin(angle - direction));
    const stretch = strength * (0.52 * Math.abs(alignment) - 0.2 * lateral);
    const tail = strength * 0.3 * Math.max(0, -alignment) ** 2;
    const ripple = strength * (
      Math.sin(angle * 3 + phase) * 0.08
      + Math.sin(angle * 5 - phase * 0.7) * 0.035
    );
    const pointRadius = radius * (1 + stretch + tail + ripple);
    const x = overviewRevealCenter.x + Math.cos(angle) * pointRadius;
    const y = overviewRevealCenter.y + Math.sin(angle) * pointRadius;
    points.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }

  const clip = `polygon(${points.join(", ")})`;
  detailRevealCanvas.style.setProperty("--reveal-x", `${overviewRevealCenter.x}px`);
  detailRevealCanvas.style.setProperty("--reveal-y", `${overviewRevealCenter.y}px`);
  detailRevealCanvas.style.setProperty("-webkit-clip-path", clip);
  detailRevealCanvas.style.setProperty("clip-path", clip);
}

function setPhotoMarkerAppearance(color, fluorescent = false) {
  for (const photo of PHOTOS) {
    if (!photo.marker) continue;
    const [ring, , stem] = photo.marker.children;
    for (const part of [ring, stem]) {
      if (!part?.material) continue;
      part.material.color.setHex(color);
      part.material.blending = fluorescent
        ? THREE.AdditiveBlending
        : THREE.NormalBlending;
    }
  }
}

function updateCameraFov() {
  const fov = Number(cameraFov?.value ?? 62);
  if (!Number.isFinite(fov)) return;
  perspectiveCamera.fov = fov;
  perspectiveCamera.updateProjectionMatrix();
  if (cameraFovReadout) cameraFovReadout.textContent = `${Math.round(fov)}°`;
}

async function startCalibration() {
  if (!PHOTOS[0]?.worldPosition) return;
  calibrationResults = loadCalibrationDraft();
  const resumeIndex = getResumeIndex();
  calibrationMode = true;
  calibrationSummary.hidden = true;
  calibrationPanel.hidden = false;
  calibrationConfirm.disabled = true;
  document.body.classList.add("calibration-mode");
  await openPhoto(resumeIndex);
}

function cancelCalibration() {
  calibrationMode = false;
  calibrationPanel.hidden = true;
  calibrationConfirm.disabled = false;
  document.body.classList.remove("calibration-mode");
  closePhoto();
}

async function resetCalibration() {
  clearCalibrationDraft();
  calibrationResults = [];
  calibrationConfirm.disabled = true;
  await openPhoto(0);
}

async function confirmCalibrationPose() {
  if (!calibrationMode || activePhotoIndex < 0 || calibrationConfirm.disabled) return;
  calibrationResults[activePhotoIndex] = makeCalibrationRecord(
    PHOTOS[activePhotoIndex],
    activePhotoIndex,
  );
  saveCalibrationDraft();

  if (activePhotoIndex >= PHOTOS.length - 1) {
    finishCalibration();
    return;
  }

  calibrationConfirm.disabled = true;
  await openPhoto(activePhotoIndex + 1);
}

function makeCalibrationRecord(photo, index) {
  const euler = new THREE.Euler().setFromQuaternion(perspectiveCamera.quaternion, "YXZ");
  return {
    index: index + 1,
    id: photo.id,
    author: photo.author,
    file: photo.file,
    position: {
      x: roundNumber(perspectiveCamera.position.x, 4),
      y: roundNumber(perspectiveCamera.position.y, 4),
      z: roundNumber(perspectiveCamera.position.z, 4),
    },
    rotationDegrees: {
      x: roundNumber(THREE.MathUtils.radToDeg(euler.x), 4),
      y: roundNumber(THREE.MathUtils.radToDeg(euler.y), 4),
      z: roundNumber(THREE.MathUtils.radToDeg(euler.z), 4),
    },
    quaternion: {
      x: roundNumber(perspectiveCamera.quaternion.x, 6),
      y: roundNumber(perspectiveCamera.quaternion.y, 6),
      z: roundNumber(perspectiveCamera.quaternion.z, 6),
      w: roundNumber(perspectiveCamera.quaternion.w, 6),
    },
    fov: roundNumber(perspectiveCamera.fov, 2),
    photoOpacity: Number(photoOpacity.value) / 100,
    photoScale: Number(photoScale.value) / 100,
  };
}

function restoreCalibrationPose(record) {
  const position = record?.position;
  const quaternion = record?.quaternion;
  if (
    !position
    || !quaternion
    || ![position.x, position.y, position.z, quaternion.x, quaternion.y, quaternion.z, quaternion.w]
      .every(Number.isFinite)
  ) return;

  perspectiveCamera.position.set(position.x, position.y, position.z);
  perspectiveCamera.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w).normalize();
  perspectiveCamera.updateMatrixWorld(true);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(perspectiveCamera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(perspectiveCamera.quaternion);
  perspectiveCamera.up.copy(up);
  controls.target.copy(perspectiveCamera.position).addScaledVector(forward, 28);
  controls.update();
}

function updateCalibrationProgress(index = activePhotoIndex) {
  const savedCount = calibrationResults.filter(Boolean).length;
  calibrationProgress.textContent = `PHOTO ${index + 1} / ${PHOTOS.length} · SAVED ${savedCount}`;
}

function getResumeIndex() {
  const missingIndex = PHOTOS.findIndex((photo, index) => (
    !calibrationResults[index] || calibrationResults[index].id !== photo.id
  ));
  return missingIndex < 0 ? PHOTOS.length - 1 : missingIndex;
}

function loadCalibrationDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(CALIBRATION_DRAFT_KEY) || "null");
    if (!draft || draft.format !== "kashiwa-photo-camera-calibration-draft-v1") return [];
    if (!Array.isArray(draft.photos)) return [];
    return PHOTOS.map((photo, index) => (
      draft.photos[index]?.id === photo.id ? draft.photos[index] : undefined
    ));
  } catch {
    return [];
  }
}

function saveCalibrationDraft() {
  try {
    localStorage.setItem(CALIBRATION_DRAFT_KEY, JSON.stringify({
      format: "kashiwa-photo-camera-calibration-draft-v1",
      updatedAt: new Date().toISOString(),
      photos: calibrationResults,
    }));
    updateCalibrationProgress();
  } catch (error) {
    console.warn("Calibration draft could not be saved.", error);
  }
}

function clearCalibrationDraft() {
  try {
    localStorage.removeItem(CALIBRATION_DRAFT_KEY);
  } catch (error) {
    console.warn("Calibration draft could not be cleared.", error);
  }
}

function updatePoseFields(force = false) {
  if (!calibrationMode || !photoMode) return;
  if (!force && poseInputs.includes(document.activeElement)) return;
  const euler = new THREE.Euler().setFromQuaternion(perspectiveCamera.quaternion, "YXZ");
  const values = {
    "position.x": perspectiveCamera.position.x,
    "position.y": perspectiveCamera.position.y,
    "position.z": perspectiveCamera.position.z,
    "rotation.x": THREE.MathUtils.radToDeg(euler.x),
    "rotation.y": THREE.MathUtils.radToDeg(euler.y),
    "rotation.z": THREE.MathUtils.radToDeg(euler.z),
  };
  poseInputs.forEach((input) => {
    input.value = Number(values[input.dataset.pose]).toFixed(
      input.dataset.pose.startsWith("position") ? 3 : 2,
    );
  });
}

function applyPoseInputs() {
  if (!calibrationMode || !photoMode) return;
  const values = Object.fromEntries(
    poseInputs.map((input) => [input.dataset.pose, Number(input.value)]),
  );
  if (Object.values(values).some((value) => !Number.isFinite(value))) return;

  perspectiveCamera.position.set(
    values["position.x"],
    values["position.y"],
    values["position.z"],
  );
  perspectiveCamera.rotation.order = "YXZ";
  perspectiveCamera.rotation.set(
    THREE.MathUtils.degToRad(values["rotation.x"]),
    THREE.MathUtils.degToRad(values["rotation.y"]),
    THREE.MathUtils.degToRad(values["rotation.z"]),
    "YXZ",
  );
  perspectiveCamera.updateMatrixWorld(true);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(perspectiveCamera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(perspectiveCamera.quaternion);
  perspectiveCamera.up.copy(up);
  controls.target.copy(perspectiveCamera.position).addScaledVector(forward, 28);
  controls.update();
  updatePoseFields(true);
}

function nudgeCamera(axis, amount) {
  if (!calibrationMode || !photoMode || !["x", "y", "z"].includes(axis)) return;
  const offset = new THREE.Vector3();
  offset[axis] = amount;
  translateCamera(offset);
}

function translateCamera(offset) {
  perspectiveCamera.position.add(offset);
  controls.target.add(offset);
  controls.update();
  updatePoseFields(true);
}

function moveCameraWithKeyboard(key, multiplier = 1) {
  const amount = Number(calibrationStep.value) * multiplier;
  const forward = new THREE.Vector3();
  perspectiveCamera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const offset = new THREE.Vector3();

  if (key === "w") offset.copy(forward).multiplyScalar(amount);
  if (key === "s") offset.copy(forward).multiplyScalar(-amount);
  if (key === "a") offset.copy(right).multiplyScalar(-amount);
  if (key === "d") offset.copy(right).multiplyScalar(amount);
  if (key === "q") offset.y = -amount;
  if (key === "e") offset.y = amount;
  if (offset.lengthSq() > 0) translateCamera(offset);
}

function finishCalibration() {
  const payload = {
    format: "kashiwa-photo-camera-calibration-v1",
    model: "kashiwa_Blosm.glb",
    coordinateSystem: "Three.js world coordinates; Y-up",
    rotationUnit: "degrees",
    rotationOrder: "YXZ",
    photos: calibrationResults,
  };

  calibrationMode = false;
  calibrationPanel.hidden = true;
  calibrationConfirm.disabled = false;
  document.body.classList.remove("calibration-mode");
  closePhoto();

  calibrationOutput.value = JSON.stringify(payload, null, 2);
  calibrationResultList.replaceChildren(...calibrationResults.map((result) => {
    const row = document.createElement("div");
    row.className = "calibration-result-row";
    const number = document.createElement("b");
    number.textContent = String(result.index).padStart(2, "0");
    const file = document.createElement("span");
    file.textContent = `${result.author}/${result.file}`;
    const position = document.createElement("span");
    position.textContent = `P ${formatVector(result.position)}`;
    const rotation = document.createElement("span");
    rotation.textContent = `R ${formatVector(result.rotationDegrees)}° · FOV ${result.fov}° · SIZE ${Math.round(result.photoScale * 100)}%`;
    row.append(number, file, position, rotation);
    return row;
  }));
  calibrationSummary.hidden = false;
}

async function copyCalibrationOutput() {
  const text = calibrationOutput.value;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    calibrationOutput.focus();
    calibrationOutput.select();
    document.execCommand("copy");
  }
  const originalLabel = copyCalibrationButton.textContent;
  copyCalibrationButton.textContent = "コピーしました";
  window.setTimeout(() => {
    copyCalibrationButton.textContent = originalLabel;
  }, 1800);
}

function formatVector(vector) {
  return `[${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}]`;
}

function roundNumber(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function selectPhotoPoint(event) {
  if (photoMode || !pointerDown) return;
  if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, perspectiveCamera);
  const hit = raycaster.intersectObjects(photoHitTargets, false)[0];
  if (hit) openPhoto(hit.object.userData.photoIndex);
}

function handleKeyDown(event) {
  if (!photoMode) return;
  if (event.key === "Escape") {
    if (calibrationMode) cancelCalibration();
    else closePhoto();
  }
  if (
    calibrationMode
    && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)
    && ["w", "a", "s", "d", "q", "e"].includes(event.key.toLowerCase())
  ) {
    event.preventDefault();
    moveCameraWithKeyboard(event.key.toLowerCase(), event.shiftKey ? 5 : 1);
  }
  if (!calibrationMode && event.key === "ArrowLeft") stepPhoto(-1);
  if (!calibrationMode && event.key === "ArrowRight") stepPhoto(1);
}

function formatPhotoTime(time) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(time);
}

function isPhotoBeforeTwenty(time) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).format(time));
  return hour < 20;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  detailRevealRenderer?.setSize(width, height, false);
}

function animate() {
  const now = performance.now();
  controls.update();
  updatePoseFields();
  if (!photoMode) {
    for (const photo of PHOTOS) {
      if (!photo.marker) continue;
      const [ring, hit] = photo.marker.children;
      ring.quaternion.copy(perspectiveCamera.quaternion);
      hit.quaternion.copy(perspectiveCamera.quaternion);
      const distance = perspectiveCamera.position.distanceTo(photo.marker.position);
      const scale = THREE.MathUtils.clamp(distance / 180, 1, 4);
      ring.scale.setScalar(scale);
      hit.scale.setScalar(scale);
    }
  }
  renderer.render(scene, perspectiveCamera);
  updateLiquidOverviewReveal(now);
  if (
    detailRevealRenderer
    && detailRevealReady
    && !photoMode
    && document.body.classList.contains("overview-reveal-active")
  ) {
    setPhotoMarkerAppearance(0x008cff, true);
    renderDetailLayer(detailRevealRenderer, perspectiveCamera);
    setPhotoMarkerAppearance(0xffffff);
  }
  requestAnimationFrame(animate);
}
