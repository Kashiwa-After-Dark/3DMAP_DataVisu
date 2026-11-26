/** Five prebuilt 2D drawings; animation only swaps the visible frame. */
import * as THREE from "three";
import { ROUTE_DIRECTIONS } from "./routeArrowModel.js?v=20261123-stop-motion1";
import { LOCAL_ARROW_FRAMES, LOCAL_ARROW_FRAME_MS, TERRACE_2D_ROUTES, localArrowPoses } from "./terrace2dRoutes.js";

export function createRouteArrowLayer(view, floorMeshes) {
  const layer = new THREE.Group();
  layer.name = "terrace-2d-route-arrows";
  layer.visible = false;
  view.scene.add(layer);
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 600px)");
  const shape = [[0.13, 0], [-0.09, 0.08], [-0.09, 0.035], [0.026, 0], [-0.09, -0.035], [-0.09, -0.08]];
  const indices = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5];
  const sets = new Map();
  const materials = new Map(ROUTE_DIRECTIONS.map(({ id, mapColor }) => [id, new THREE.MeshBasicMaterial({
    color: mapColor, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false, fog: false,
  })]));
  let active = new Set();
  let frames = [];
  let shown = 0;
  let elapsed = 0;
  let lastFrame = null;
  let paused = false;

  function floorAt(x, z) {
    ray.ray.origin.set(x, 2, z);
    return ray.intersectObjects(floorMeshes, false)[0]?.point.y;
  }
  function makeFrames(scale) {
    const next = Array.from({ length: LOCAL_ARROW_FRAMES }, () => new THREE.Group());
    for (const { id } of ROUTE_DIRECTIONS) {
      const vertices = next.map(() => []);
      for (const route of TERRACE_2D_ROUTES) for (let i = 1; i < route.length; i++) {
        for (const poses of localArrowPoses(route[i - 1], route[i], id)) {
          const drawings = poses.map(({ x, z, dx, dz }) => {
            const y = floorAt(x, z);
            if (y === undefined) return null;
            const points = shape.map(([f, s]) => [x + scale * (f * dx - s * dz), z + scale * (f * dz + s * dx)]);
            if (points.some(([px, pz]) => Math.abs((floorAt(px, pz) ?? Infinity) - y) > 0.035)) return null;
            return indices.flatMap((index) => [points[index][0], y + 0.04, points[index][1]]);
          });
          if (drawings.every(Boolean)) drawings.forEach((drawing, index) => vertices[index].push(...drawing));
        }
      }
      for (const [i, group] of next.entries()) {
        if (!vertices[i].length) continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices[i], 3));
        const mesh = new THREE.Mesh(geometry, materials.get(id));
        mesh.name = id;
        mesh.renderOrder = 21;
        group.add(mesh);
      }
    }
    return next;
  }
  function selectFrames() {
    if (!active.size) { layer.clear(); frames = []; return; }
    const key = compact.matches;
    if (!sets.has(key)) sets.set(key, makeFrames(key ? 1.4 : 1));
    frames = sets.get(key);
    layer.clear();
    for (const [index, group] of frames.entries()) {
      group.visible = index === shown;
      for (const mesh of group.children) mesh.visible = active.has(mesh.name);
      layer.add(group);
    }
  }
  view.onAnimate((time) => {
    if (!layer.visible || paused || reducedMotion.matches || !frames.length || document.hidden) {
      lastFrame = null;
      return false;
    }
    if (lastFrame !== null) elapsed += Math.min(100, time - lastFrame);
    lastFrame = time;
    const frame = Math.floor(elapsed / LOCAL_ARROW_FRAME_MS) % LOCAL_ARROW_FRAMES;
    if (frame === shown) return false;
    frames[shown].visible = false;
    frames[frame].visible = true;
    shown = frame;
    return true;
  });
  compact.addEventListener("change", () => { if (layer.visible) { selectFrames(); view.invalidate(); } });
  return {
    setVisible(visible) { layer.visible = visible; lastFrame = null; view.invalidate(); },
    setPaused(next) { paused = next; lastFrame = null; },
    update(flows) {
      active = new Set(flows.map(({ direction }) => direction));
      selectFrames();
      view.invalidate();
    },
  };
}
