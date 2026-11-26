/** Draws model-anchored observer impressions in the 3D terrace. */
import * as THREE from "three";
import { readPeopleAreas } from "./peopleRegionGeometry.js";
import { summarizePlaceImpressions } from "./impressionCloudModel.js";

const PALETTE = ["#a2f5ec", "#ffabd3", "#d4bfff", "#fff0a7", "#a8d7ff"];
const WEB_FONT = '64px "DotGothic16"';
const FONT = `${WEB_FONT}, "Yu Gothic UI", Meiryo, sans-serif`;
const SLOTS = [[0, 0], [-0.16, -1], [0.21, 1], [0.30, -2], [-0.34, 2], [-0.58, -1],
  [0.61, 1], [-0.53, 0], [0.53, 0], [-0.17, -3], [0.17, 3], [0.62, -2], [-0.62, 2]];

function shortenLabel(text) {
  const chars = [...text];
  return chars.length > 13 ? chars.slice(0, 12).join("") + "…" : text;
}

function labelTexture(label) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = FONT;
  canvas.width = Math.ceil(ctx.measureText(label).width) + 8;
  canvas.height = 80;
  ctx.font = FONT;
  ctx.fillStyle = "#fff";
  ctx.fillText(label, 4, 62);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return { texture, aspect: canvas.width / canvas.height };
}

export function createImpressionCloud(view, model, canvas, controls) {
  const layer = new THREE.Group();
  layer.name = "terrace-observer-impression-cloud";
  layer.visible = false;
  view.scene.add(layer);
  const areas = readPeopleAreas(model.regionSources);
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const anchors = new Map();
  for (const { object, code } of model.regionSources) {
    if (code === "TR-00" || anchors.has(code)) continue;
    const local = object.getWorldPosition(new THREE.Vector3());
    const triangle = areas.get(code)?.[0];
    const center = triangle?.points.reduce((sum, point) => sum.addScaledVector(point, 1 / 3), new THREE.Vector3());
    for (const candidate of code === "TR-02" ? [center] : [local, center]) {
      if (!candidate) continue;
      ray.ray.origin.copy(candidate).y += 2;
      const hit = ray.intersectObjects(model.focusMeshes, false)[0];
      if (hit) { anchors.set(code, hit.point.clone()); break; }
    }
  }
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const textures = new Map();
  const fallbackTextures = new Map();
  let sprites = [], lastFrame = 0, revision = 0;
  const projected = new THREE.Vector3(), edge = new THREE.Vector3();
  view.onBeforeRender((camera) => {
    if (!layer.visible || !sprites.length) return;
    camera.updateMatrixWorld();
    const viewport = canvas.getBoundingClientRect();
    const { width, height } = viewport;
    if (!width || !height) return;
    const compact = width < 600;
    const occupied = controls.map((element) => element.getBoundingClientRect()).filter((rect) => rect.width).map((rect) => [
      rect.left - viewport.left - 5, rect.top - viewport.top - 5,
      rect.right - viewport.left + 5, rect.bottom - viewport.top + 5,
    ]);
    const origins = new Map();
    for (const { sprite, base, phase, rank, count, aspect } of sprites) {
      sprite.visible = false;
      projected.copy(base).project(camera);
      if (projected.z <= -1 || projected.z >= 1) continue;
      const anchorX = (projected.x + 1) * width / 2, anchorY = (1 - projected.y) * height / 2;
      const [cx, cy] = origins.get(base) ?? [anchorX, anchorY];
      const size = Math.max(compact ? 15 : 19, (compact ? 22 : 33) - rank * 3)
        + Math.min(5, Math.log2(count) * 2);
      const textWidth = Math.min(aspect * size, width * (compact ? 0.30 : 0.19));
      const halfW = textWidth / 2 + 4, halfH = size / 2 + 3;
      for (const [dx, dy] of SLOTS) {
        const x = cx + dx * (compact ? 80 : 135), y = cy + dy * (compact ? 23 : 31);
        const box = [x - halfW, y - halfH, x + halfW, y + halfH];
        if (box[0] < 3 || box[2] > width - 3 || box[1] < 3 || box[3] > height - 3 ||
          occupied.some(([a, b, c, d]) => box[0] < c && box[2] > a && box[1] < d && box[3] > b)) continue;
        occupied.push(box);
        if (!origins.has(base)) origins.set(base, [x, y]);
        const drift = reducedMotion.matches ? 0 : Math.sin(lastFrame / 1450 + phase) * 2;
        const screenX = x / width * 2 - 1, screenY = 1 - (y + drift) / height * 2;
        sprite.position.set(screenX, screenY, projected.z).unproject(camera);
        edge.set(screenX, screenY + size * 2 / height, projected.z).unproject(camera);
        const worldHeight = edge.distanceTo(sprite.position);
        sprite.scale.set(worldHeight * textWidth / size, worldHeight, 1);
        sprite.visible = true;
        break;
      }
    }
  });
  view.onAnimate((now) => {
    if (!layer.visible || !sprites.length || reducedMotion.matches || document.hidden || now - lastFrame < 40) return false;
    lastFrame = now;
    return true;
  });
  return {
    setVisible(visible) { layer.visible = visible; view.invalidate(); },
    async update(records) {
      const current = ++revision;
      for (const { sprite } of sprites) sprite.material.dispose();
      for (const { texture } of fallbackTextures.values()) texture.dispose();
      fallbackTextures.clear();
      layer.clear();
      sprites = [];
      view.invalidate();
      const groups = summarizePlaceImpressions(records, anchors);
      if (!groups.size) return;
      // Canvas needs the relevant Japanese font subsets before it rasterizes the labels.
      const labels = [...groups.values()].flatMap((words) => words.map(({ text }) => shortenLabel(text)));
      const glyphs = [...new Set(labels.join(""))].join("");
      const loaded = await document.fonts.load(WEB_FONT, glyphs).catch(() => []);
      if (current !== revision) return;
      const cache = loaded.length ? textures : fallbackTextures;
      for (const [code, words] of groups) {
        const base = anchors.get(code).clone().add(new THREE.Vector3(0, 0.84, 0));
        for (const [rank, { text, count }] of words.entries()) {
          const phase = Number(code.slice(3)) + rank;
          const color = PALETTE[phase % PALETTE.length];
          const label = shortenLabel(text);
          if (!cache.has(label)) cache.set(label, labelTexture(label));
          const { texture, aspect } = cache.get(label);
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color, transparent: true, depthWrite: false,
            depthTest: false, toneMapped: false, fog: false }));
          sprite.frustumCulled = false;
          sprite.renderOrder = 15;
          sprites.push({ sprite, base, phase, rank, count, aspect });
          layer.add(sprite);
        }
      }
      sprites.sort((a, b) => a.rank - b.rank || b.count - a.count);
      view.invalidate();
    },
  };
}
