/** Draws the observation grid on the deck geometry itself, including its exact edges and holes. */
import * as THREE from "three";
import { readPeopleAreas } from "./peopleRegionGeometry.js";
import { activityLegend, summarizeRingActivities } from "./ringActivityModel.js";
import { aggregateMesh, createMeshGrid, createActivityMosaic } from "./activityMeshModel.js?v=inspect1";
import { buildMeshInspectionGroups } from "./meshInspectionGroups.js";

const FADE_MS = 650;

const GRID_VERTEX = `
  varying vec2 deckPosition;
  void main() {
    deckPosition = (modelMatrix * vec4(position, 1.0)).xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const SAMPLE_CELL = `
  uniform sampler2D cells;
  uniform sampler2D previousCells;
  uniform float cellBlend;
  uniform vec2 origin;
  uniform vec2 dimensions;
  uniform float stepSize;
  varying vec2 deckPosition;
  vec4 activityCell(vec2 uv) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThanEqual(uv, dimensions))) return vec4(0.0);
    vec2 at = (floor(uv) + 0.5) / dimensions;
    vec4 next = texture2D(cells, at);
    if (cellBlend >= 1.0) return next;
    vec4 prev = texture2D(previousCells, at);
    float alpha = mix(prev.a, next.a, cellBlend);
    vec3 rgb = mix(prev.rgb * prev.a, next.rgb * next.a, cellBlend) / max(alpha, 0.001);
    return vec4(rgb, alpha);
  }`;

const GRID_FRAGMENT = `
  ${SAMPLE_CELL}
  uniform sampler2D groupIds;
  uniform float hoverGroup;
  uniform float selectedGroup;
  float groupAt(vec2 cell) {
    if (any(lessThan(cell, vec2(0.0))) || any(greaterThanEqual(cell, dimensions))) return 0.0;
    vec2 encoded = floor(texture2D(groupIds, (cell + 0.5) / dimensions).rg * 255.0 + 0.5);
    return encoded.x + 256.0 * encoded.y;
  }
  void main() {
    vec2 uv = (deckPosition - origin) / stepSize;
    vec2 pixel = max(fwidth(uv), vec2(0.0001));
    vec2 edge = abs(fract(uv - 0.5) - 0.5) / pixel;
    float line = (1.0 - smoothstep(0.12, 0.82, min(edge.x, edge.y))) * 0.38;
    vec4 tint = activityCell(uv);
    float fill = max(0.20, tint.a * 0.73);
    vec3 fillColor = tint.a > 0.0 ? tint.rgb : vec3(0.47);
    float alpha = line + fill * (1.0 - line);
    vec3 color = (vec3(0.27) * line + fillColor * fill * (1.0 - line)) / max(0.001, alpha);
    vec2 cell = floor(uv);
    float id = groupAt(cell);
    bool selected = id > 0.0 && id == selectedGroup;
    bool hovered = id > 0.0 && id == hoverGroup;
    float border = 0.0;
    if (hovered || selected) {
      vec2 part = fract(uv);
      float distanceToEdge = 10000.0;
      if (groupAt(cell + vec2(-1.0, 0.0)) != id) distanceToEdge = min(distanceToEdge, part.x / pixel.x);
      if (groupAt(cell + vec2(1.0, 0.0)) != id) distanceToEdge = min(distanceToEdge, (1.0 - part.x) / pixel.x);
      if (groupAt(cell + vec2(0.0, -1.0)) != id) distanceToEdge = min(distanceToEdge, part.y / pixel.y);
      if (groupAt(cell + vec2(0.0, 1.0)) != id) distanceToEdge = min(distanceToEdge, (1.0 - part.y) / pixel.y);
      border = 1.0 - smoothstep(1.0, 2.3, distanceToEdge);
    }
    gl_FragColor = mix(vec4(color, alpha), vec4(selected ? vec3(0.62, 1.0, 0.89) : vec3(0.96), 1.0), border);
    #include <colorspace_fragment>
  }`;

const OBJECT_FRAGMENT = `
  ${SAMPLE_CELL}
  uniform vec3 baseColor;
  uniform float baseOpacity;
  uniform float tintStrength;
  void main() {
    vec4 tint = activityCell((deckPosition - origin) / stepSize);
    float amount = tint.a * tintStrength;
    gl_FragColor = vec4(mix(baseColor, tint.rgb, amount), mix(baseOpacity, 0.76, amount));
    #include <colorspace_fragment>
  }`;

export function createActivityMeshLayer(view, model, project = null) {
  const areas = readPeopleAreas(model.regionSources);
  const bounds = new THREE.Box3();
  for (const mesh of model.focusMeshes) bounds.union(new THREE.Box3().setFromObject(mesh));
  const grid = createMeshGrid(bounds, areas);
  const pixels = new Uint8Array(grid.width * grid.height * 4);
  const previousPixels = new Uint8Array(pixels.length), groupPixels = new Uint8Array(pixels.length);
  function createAtlas(data) {
    const atlas = new THREE.DataTexture(data, grid.width, grid.height);
    atlas.minFilter = atlas.magFilter = THREE.NearestFilter;
    atlas.needsUpdate = true;
    return atlas;
  }
  const texture = createAtlas(pixels), previousTexture = createAtlas(previousPixels), groupTexture = createAtlas(groupPixels);
  const cellBlend = { value: 1 };
  const gridUniforms = { cells: { value: texture }, previousCells: { value: previousTexture }, cellBlend,
    origin: { value: new THREE.Vector2(grid.origin.x, grid.origin.z) },
    dimensions: { value: new THREE.Vector2(grid.width, grid.height) }, stepSize: { value: grid.step } };
  const hoverGroup = { value: 0 }, selectedGroup = { value: 0 };
  const material = new THREE.ShaderMaterial({
    vertexShader: GRID_VERTEX, fragmentShader: GRID_FRAGMENT,
    uniforms: { ...gridUniforms, groupIds: { value: groupTexture }, hoverGroup, selectedGroup },
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const layer = new THREE.Group();
  layer.visible = false;
  for (const source of model.focusMeshes) {
    const overlay = new THREE.Mesh(source.geometry, material);
    overlay.matrix.copy(source.matrixWorld);
    overlay.matrixAutoUpdate = false;
    overlay.renderOrder = 11;
    layer.add(overlay);
  }
  view.scene.add(layer);
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  function floorAt(x, z) {
    ray.ray.origin.set(x, bounds.max.y + 1, z);
    return ray.intersectObjects(model.focusMeshes, false)[0]?.point.y;
  }
  let palette = new Map();
  let onDeck, ids, groups;
  let fadeStarted = null, drawn = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const pickRay = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function showGroup(target, id) {
    if (target.value === (id ?? 0)) return;
    target.value = id ?? 0;
    view.invalidate();
  }
  function rememberColors() {
    if (cellBlend.value >= 1) {
      previousPixels.set(pixels);
    } else {
      const blend = cellBlend.value;
      for (let i = 0; i < pixels.length; i += 4) {
        const prev = previousPixels[i + 3] * (1 - blend), next = pixels[i + 3] * blend;
        for (let channel = 0; channel < 3; channel++) {
          previousPixels[i + channel] = (previousPixels[i + channel] * prev + pixels[i + channel] * next) / (prev + next || 1);
        }
        previousPixels[i + 3] = prev + next;
      }
    }
    previousTexture.needsUpdate = true;
  }
  return {
    animate(time) {
      if (!layer.visible || fadeStarted === null) return false;
      const t = Math.min(1, Math.max(0, (time - fadeStarted) / FADE_MS));
      cellBlend.value = t * t * (3 - 2 * t);
      if (t === 1) fadeStarted = null;
      return true;
    },
    hitAt(clientX, clientY, rect) {
      if (!layer.visible || !rect.width || !rect.height) return null;
      ndc.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
      const camera = view.getCamera();
      camera.updateMatrixWorld();
      pickRay.setFromCamera(ndc, camera);
      const hit = pickRay.intersectObjects(model.focusMeshes, false)[0];
      return hit ? ids?.[grid.cellAt(hit.point.x, hit.point.z)] || null : null;
    },
    hover(id) { showGroup(hoverGroup, id); },
    select(id) { showGroup(selectedGroup, id); },
    detail(id) { return groups?.[id] ?? { source: null, records: [] }; },
    createObjectMaterial(color, opacity, tintStrength) {
      return new THREE.ShaderMaterial({
        vertexShader: GRID_VERTEX, fragmentShader: OBJECT_FRAGMENT, transparent: true, depthWrite: false,
        uniforms: { ...gridUniforms, baseColor: { value: new THREE.Color(color) },
          baseOpacity: { value: opacity }, tintStrength: { value: tintStrength } },
      });
    },
    setVisible(visible) { layer.visible = visible; view.invalidate(); },
    setRecords(records) {
      const legend = activityLegend(summarizeRingActivities(records, new Set(records.flatMap(({ placeCodes }) => placeCodes))))
        .filter(({ tag }) => tag !== null);
      palette = new Map(legend.map(({ tag, color }) => [tag, new THREE.Color(color)]));
    },
    update(records) {
      const { exact, approximate, exactRecords, approximateRecords } = aggregateMesh(records, grid, areas, floorAt, project);
      const mosaic = createActivityMosaic(grid, exact, approximate);
      const details = new Map();
      onDeck ??= Uint8Array.from({ length: grid.width * grid.height }, (_, index) => {
        const x = grid.origin.x + (index % grid.width + 0.5) * grid.step;
        const z = grid.origin.z + (Math.floor(index / grid.width) + 0.5) * grid.step;
        return Number.isFinite(floorAt(x, z)) ? 1 : 0;
      });
      if (drawn && !reducedMotion.matches) {
        rememberColors();
        cellBlend.value = 0;
        fadeStarted = performance.now();
      }
      drawn = true;
      pixels.fill(0);
      for (const [index, { tag, source, sourceCell }] of mosaic) {
        const color = palette.get(tag);
        if (!color) continue;
        pixels.set([color.r * 255, color.g * 255, color.b * 255,
          source === "estimated" ? 91 : source === "code" ? 172 : 235], index * 4);
        let evidence = exactRecords.get(sourceCell) ?? approximateRecords.get(sourceCell) ?? [];
        if (source === "estimated") evidence = evidence.filter((record) => record.activityCategories.some(({ id }) => id === tag));
        details.set(index, { source, records: evidence });
      }
      ({ ids, groups } = buildMeshInspectionGroups(grid.width, grid.height, details, onDeck));
      for (let index = 0; index < ids.length; index++) groupPixels.set([ids[index] % 256, ids[index] >> 8, 0, 255], index * 4);
      groupTexture.needsUpdate = true;
      texture.needsUpdate = true;
      view.invalidate();
    },
  };
}
