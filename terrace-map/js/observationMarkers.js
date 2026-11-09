import * as THREE from "three";
import { projectLocation } from "./geoProjection.js";
function project(record) {
  const { x, z } = projectLocation(record);
  return new THREE.Vector3(x, 0, z);
}

export function createObservationMarkers({ view, focusMeshes, onSelect }) {
  const canvas = document.querySelector("#map");
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = 32;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(textureCanvas);
  const dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: texture, vertexColors: true, size: 10, sizeAttenuation: false, transparent: true, alphaTest: 0.1, depthTest: false, depthWrite: false }));
  dots.renderOrder = 10;
  dots.visible = false;
  const selected = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: texture, color: 0xffc477, size: 17, sizeAttenuation: false, transparent: true, alphaTest: 0.1, depthTest: false, depthWrite: false }));
  selected.renderOrder = 11;
  selected.visible = false;
  view.scene.add(dots, selected);
  let positioned = [];
  const positionsById = new Map();
  const heightRay = new THREE.Raycaster();
  const picker = new THREE.Raycaster();
  picker.params.Points.threshold = 2;
  const pointer = new THREE.Vector2();
  let down = null;
  canvas.addEventListener("pointerdown", (event) => { down = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener("pointerup", (event) => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
    down = null;
    if (!positioned.length) { onSelect(null); return; }
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    picker.setFromCamera(pointer, view.getCamera());
    const hit = picker.intersectObject(dots)[0];
    onSelect(hit ? positioned[hit.index]?.id : null);
  });
  return {
    update(records, activeCode = "all", catalog = []) {
      const placeColors = new Map(catalog.map((place) => [place.code, place.color]));
      positionsById.clear();
      positioned = records.filter((record) => record.hasLocation);
      const positions = [];
      const colors = [];
      for (const record of positioned) {
        const point = project(record);
        heightRay.set(new THREE.Vector3(point.x, 500, point.z), new THREE.Vector3(0, -1, 0));
        const surface = heightRay.intersectObjects(focusMeshes)[0];
        point.y = (surface?.point.y ?? 8) + 1;
        positionsById.set(record.id, point);
        positions.push(point.x, point.y, point.z);
        const code = activeCode !== "all" && record.placeCodes.includes(activeCode) ? activeCode : record.placeCodes[0];
        const color = new THREE.Color(placeColors.get(code) || 0xe4eee9);
        colors.push(color.r, color.g, color.b);
      }
      dots.geometry.dispose();
      dots.geometry = new THREE.BufferGeometry();
      dots.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      dots.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      dots.visible = positioned.length > 0;
      view.invalidate();
    },
    select(id) {
      const point = positionsById.get(id);
      selected.visible = Boolean(point);
      selected.geometry.dispose();
      selected.geometry = new THREE.BufferGeometry().setFromPoints(point ? [point] : []);
      view.invalidate();
    },
  };
}
