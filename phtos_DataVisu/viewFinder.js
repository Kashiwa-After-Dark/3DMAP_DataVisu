import * as THREE from "three";
import { GPX_FILES, INITIAL_CENTER_GEO } from "../src/config.js";
import { createMapDisplay } from "../src/main.js?v=20260723-01";
import { PHOTOS } from "../src/photos.js";

const canvas = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const modelBadge = document.querySelector("#model-badge");
const openPhotoListButton = document.querySelector("#open-photo-list");
const closePhotoListButton = document.querySelector("#close-photo-list");
const photoList = document.querySelector("#photo-list");
const photoGrid = document.querySelector("#photo-grid");
const photoViewer = document.querySelector("#photo-viewer");
const photoOverlay = document.querySelector("#photo-overlay");
const photoClose = document.querySelector("#photo-close");
const photoPrev = document.querySelector("#photo-prev");
const photoNext = document.querySelector("#photo-next");
const photoOpacity = document.querySelector("#photo-opacity");
const photoTitle = document.querySelector("#photo-title");
const photoPosition = document.querySelector("#photo-position");

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
  setModelMode,
  geoToWorld,
} = createMapDisplay(canvas);

const photoGroup = new THREE.Group();
const photoHitTargets = [];
scene.add(photoGroup);

let routeTracks = [];
let photoMode = false;
let activePhotoIndex = -1;
let cameraSnapshot = null;
let pointerDown = null;
let viewToken = 0;

loadModel(async () => {
  fitOverviewCamera();
  routeTracks = await loadRouteTracks();
  placePhotos();
  renderPhotoGrid();
  loading.classList.add("is-done");
  window.setTimeout(() => loading.remove(), 450);
});

openPhotoListButton.addEventListener("click", () => {
  photoList.hidden = false;
});
closePhotoListButton.addEventListener("click", () => {
  photoList.hidden = true;
});
photoClose.addEventListener("click", closePhoto);
photoPrev.addEventListener("click", () => stepPhoto(-1));
photoNext.addEventListener("click", () => stepPhoto(1));
photoOpacity.addEventListener("input", updatePhotoOpacity);
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});
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
  focus.y = modelCenter.y + modelSize.y * 0.06;
  const fov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
  const distance = (sphere.radius / Math.tan(fov / 2)) * 0.68;

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
  const ringGeometry = new THREE.RingGeometry(2.2, 3.2, 28);
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
      }),
    );

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
    };
  }

  const token = ++viewToken;
  photoMode = true;
  activePhotoIndex = normalizedIndex;
  document.body.classList.add("photo-mode");
  photoViewer.hidden = false;
  photoList.hidden = true;
  photoGroup.visible = false;
  photoOverlay.src = photo.url;
  photoOverlay.alt = `${photo.author}が${formatPhotoTime(photo.capturedAt)}に撮影した写真`;
  photoTitle.textContent = `${photo.author.toUpperCase()} · ${formatPhotoTime(photo.capturedAt)}`;
  photoPosition.textContent = `${normalizedIndex + 1} / ${PHOTOS.length}`;
  modelBadge.innerHTML = "<i></i>BLOSM · PHOTO VIEW";
  updatePhotoOpacity();

  controls.enabled = true;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 60;
  const position = photo.worldPosition.clone();
  position.y = 7;
  const target = position.clone().addScaledVector(photo.direction, 28);
  target.y = 7;
  perspectiveCamera.position.copy(position);
  perspectiveCamera.fov = 62;
  perspectiveCamera.near = 0.1;
  perspectiveCamera.far = Math.max(cameraSnapshot?.far || 3000, 3000);
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();

  try {
    await setModelMode("detail");
    if (token !== viewToken || !photoMode) setModelMode("overview");
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
  perspectiveCamera.fov = cameraSnapshot.fov;
  perspectiveCamera.near = cameraSnapshot.near;
  perspectiveCamera.far = cameraSnapshot.far;
  perspectiveCamera.updateProjectionMatrix();
  controls.target.copy(cameraSnapshot.target);
  controls.minDistance = cameraSnapshot.minDistance;
  controls.maxDistance = cameraSnapshot.maxDistance;
  controls.enablePan = cameraSnapshot.enablePan;
  controls.update();
}

function stepPhoto(offset) {
  if (photoMode) openPhoto(activePhotoIndex + offset);
}

function updatePhotoOpacity() {
  photoViewer.style.setProperty("--photo-opacity", String(Number(photoOpacity.value) / 100));
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
  if (event.key === "Escape") closePhoto();
  if (event.key === "ArrowLeft") stepPhoto(-1);
  if (event.key === "ArrowRight") stepPhoto(1);
}

function formatPhotoTime(time) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(time);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  controls.update();
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
  requestAnimationFrame(animate);
}
