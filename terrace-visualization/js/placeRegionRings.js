/**
 * ファイル概要: 場所コード領域ごとに、デッキ面と平行な輪郭だけの円を配置する。
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildPlaceRegionRingSpecs } from "./placeRegionRingModel.js?v=20261123-monitor-offset1";
import { activityLegend, activityRingLayers, activityRingRadius, RING_DECK_OFFSET, summarizeRingActivities } from "./ringActivityModel.js?v=20261123-ring-neon1";

export function createPlaceRegionRings(scene, sources, floorMeshes, canvas, getCamera) {
  const grouped = new Map();
  for (const { object, code } of sources) {
    if (!grouped.has(code)) grouped.set(code, {
      code, origin: object.getWorldPosition(new THREE.Vector3()).toArray(), triangles: [],
    });
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.getAttribute("position");
      const index = mesh.geometry.index;
      const { triangles } = grouped.get(code);
      for (let offset = 0; offset + 2 < (index?.count || position.count); offset += 3) {
        const points = [0, 1, 2].map((vertex) => {
          const point = new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(offset + vertex) : offset + vertex);
          return point.applyMatrix4(mesh.matrixWorld).toArray();
        });
        triangles.push(points);
      }
    });
  }

  const layer = new THREE.Group();
  const spins = [];
  layer.name = "terrace-place-region-rings";
  const materials = new Map();
  const hoverMaterials = new Map();
  const white = new THREE.Color(0xffffff);
  let colors = new Map();
  let labels = new Map();
  let maxCount = 0;
  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float d = abs(length(vUv - 0.5) - 0.39);
        gl_FragColor = vec4(0.04, 0.06, 0.08, 0.32 * (1.0 - smoothstep(0.015, 0.085, d)));
      }`,
  });
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  for (const spec of buildPlaceRegionRingSpecs(grouped.values())) {
    const normal = new THREE.Vector3(...spec.normal);
    const ring = new THREE.Group();
    ring.visible = false;
    ring.position.fromArray(spec.center).addScaledVector(normal, RING_DECK_OFFSET);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    ray.ray.origin.set(spec.center[0] + 0.075, spec.center[1] + 0.5, spec.center[2] - 0.075);
    const floor = ray.intersectObjects(floorMeshes, false)[0];
    let shadow = null;
    if (floor) {
      shadow = new THREE.Mesh(new THREE.PlaneGeometry(2 / 0.78, 2 / 0.78), shadowMaterial);
      shadow.visible = false;
      shadow.position.copy(floor.point);
      shadow.position.y += 0.003;
      shadow.rotateX(-Math.PI / 2);
      shadow.renderOrder = 1;
      layer.add(shadow);
    }
    const spin = new THREE.Group();
    ring.add(spin);
    spins.push({
      code: spec.code, ring, shadow, spin, normal, speed: 1, levels: [],
    });
    ring.name = `place-code-ring-${spec.code}`;
    ring.renderOrder = 8;
    layer.add(ring);
  }
  const codes = new Set(spins.map(({ code }) => code));
  scene.add(layer);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const hoverRay = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();
  let pointer = null;
  let lastFrame = null;
  let hovered = null;
  let pinnedCode = null;
  let notifyHover = () => {};
  canvas.addEventListener("pointermove", (event) => {
    pointer = event.pointerType === "touch" || event.buttons ? null : { x: event.clientX, y: event.clientY };
  });
  for (const type of ["pointerleave", "pointerdown", "pointercancel"]) {
    canvas.addEventListener(type, () => { pointer = null; });
  }
  function hitAt(point) {
    if (!point || !layer.visible) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointerNdc.set((point.x - rect.left) / rect.width * 2 - 1, 1 - (point.y - rect.top) / rect.height * 2);
    const camera = getCamera();
    camera.updateMatrixWorld();
    hoverRay.setFromCamera(pointerNdc, camera);
    let nearest = null;
    let depth = Infinity;
    for (const ring of spins) {
      if (!ring.ring.visible) continue;
      for (const level of ring.levels) {
        const { center, plane, radius } = level;
        if (!hoverRay.ray.intersectPlane(plane, hitPoint)) continue;
        const distance = hitPoint.distanceTo(hoverRay.ray.origin);
        const radial = hitPoint.distanceTo(center);
        const gap = Math.min(Math.abs(radial - radius), Math.abs(radial - radius * ring.spin.scale.x));
        if (distance < depth && gap <= Math.max(0.045, radius * 0.21)) {
          nearest = { ring, level };
          depth = distance;
        }
      }
    }
    return nearest;
  }
  function describeHit(hit) {
    if (!hit) return null;
    const { ring, level } = hit;
    return { code: ring.code, tag: level.tag, label: labels.get(level.tag), color: colors.get(level.tag), anchor: ring.ring.position.clone() };
  }
  function highlight() {
    for (const entry of spins) {
      const active = entry === hovered?.ring || entry.code === pinnedCode;
      entry.spin.scale.set(active ? 1.12 : 1, active ? 1.12 : 1, 1);
      for (const mesh of entry.spin.children) mesh.material = active ? mesh.userData.highlight : mesh.userData.normal;
    }
  }
  return {
    hitAt(clientX, clientY) { return describeHit(hitAt({ x: clientX, y: clientY })); },
    onHover(listener) { notifyHover = listener; },
    select(code) { pinnedCode = code; highlight(); },
    animate(time) {
      if (!layer.visible) { lastFrame = null; return false; }
      if (lastFrame !== null && time - lastFrame < 1000 / 30) return false;
      const delta = lastFrame === null ? 0 : Math.min(time - lastFrame, 100);
      lastFrame = time;
      const hit = hitAt(pointer);
      const changed = hovered?.level !== hit?.level;
      if (changed) {
        hovered = hit;
        highlight();
        notifyHover(describeHit(hovered));
      }
      if (reducedMotion.matches) return changed;
      for (const ring of spins) {
        if (!ring.ring.visible) continue;
        ring.speed += ((ring === hovered?.ring ? 3.5 : 1) - ring.speed) * (1 - Math.exp(-delta / 160));
        ring.spin.rotation.z = (ring.spin.rotation.z + delta / 14000 * 2 * Math.PI * ring.speed) % (2 * Math.PI);
      }
      return spins.some(({ ring }) => ring.visible);
    },
    setRecords(records) {
      const legend = activityLegend(summarizeRingActivities(records, codes));
      colors = new Map(legend.map(({ tag, color }) => [tag, color]));
      labels = new Map(legend.map(({ tag, label }) => [tag, label]));
      maxCount = 0;
      for (const period of new Set(records.map(({ period }) => period))) {
        if (period < 0) continue;
        const summaries = summarizeRingActivities(records.filter((record) => record.period === period), codes);
        for (const summary of summaries.values()) {
          for (const { count } of summary.values()) maxCount = Math.max(maxCount, count);
        }
      }
      return legend;
    },
    update(records) {
      const summaries = summarizeRingActivities(records, codes);
      for (const entry of spins) {
        const { code, ring, shadow, spin } = entry;
        const summary = summaries.get(code);
        for (const level of spin.children) level.geometry.dispose();
        entry.levels = [];
        spin.clear();
        ring.visible = Boolean(summary);
        if (shadow) shadow.visible = ring.visible;
        if (!summary) continue;
        const levels = activityRingLayers(summary);
        shadow?.scale.setScalar(activityRingRadius(Math.max(...levels.map(({ count }) => count)), maxCount));
        const quarter = Math.PI / 2;
        const gap = Math.PI / 36;
        for (const { tag, count, offset } of levels) {
          const radius = activityRingRadius(count, maxCount);
          const width = Math.min(radius * 0.4, Math.max(0.04, radius * 0.105));
          const arcs = Array.from({ length: 4 }, (_, i) => new THREE.RingGeometry(
            radius - width / 2, radius + width / 2, 24, 1, i * quarter + gap / 2, quarter - gap,
          ));
          const geometry = mergeGeometries(arcs);
          arcs.forEach((arc) => arc.dispose());
          const color = colors.get(tag);
          if (!materials.has(color)) {
            const base = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false, fog: false });
            materials.set(color, base);
            const highlightMaterial = base.clone();
            highlightMaterial.color.lerp(white, 0.43);
            hoverMaterials.set(color, highlightMaterial);
          }
          const level = new THREE.Mesh(geometry, materials.get(color));
          level.userData.normal = materials.get(color);
          level.userData.highlight = hoverMaterials.get(color);
          level.position.z = offset;
          level.renderOrder = 8;
          spin.add(level);
          const center = ring.position.clone().addScaledVector(entry.normal, offset);
          entry.levels.push({ tag, center, radius, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(entry.normal, center) });
        }
      }
      highlight();
    },
    setVisible(visible) {
      layer.visible = Boolean(visible);
      if (!visible) { pointer = null; hovered = null; highlight(); }
    },
    get count() { return spins.length; },
  };
}
