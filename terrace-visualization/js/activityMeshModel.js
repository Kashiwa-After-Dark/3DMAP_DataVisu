/** Assigns observations to a grid cell or a coded area, without editing records. */
export const MESH_STEP = 0.38;

function distanceToTriangle(x, z, { points }) {
  let positive = false;
  let negative = false;
  let distance = Infinity;
  for (let i = 0; i < 3; i++) {
    const a = points[i], b = points[(i + 1) % 3];
    const dx = b.x - a.x, dz = b.z - a.z;
    const px = x - a.x, pz = z - a.z;
    const cross = dx * pz - dz * px;
    positive ||= cross > 1e-7;
    negative ||= cross < -1e-7;
    const t = Math.max(0, Math.min(1, (px * dx + pz * dz) / (dx * dx + dz * dz || 1)));
    distance = Math.min(distance, Math.hypot(px - dx * t, pz - dz * t));
  }
  return positive && negative ? distance : 0;
}

export function createMeshGrid(bounds, areas, step = MESH_STEP) {
  const minX = Math.floor(bounds.min.x / step), minZ = Math.floor(bounds.min.z / step);
  const width = Math.ceil(bounds.max.x / step) - minX;
  const height = Math.ceil(bounds.max.z / step) - minZ;
  const cellsByCode = new Map();
  for (const [code, triangles] of areas) {
    if (code === "TR-00" || !triangles.length) continue;
    const cells = [];
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
      const x = (minX + i + 0.5) * step, z = (minZ + j + 0.5) * step;
      if (triangles.some((triangle) => distanceToTriangle(x, z, triangle) <= step * 0.35)) cells.push(j * width + i);
    }
    if (cells.length) cellsByCode.set(code, cells);
  }
  return {
    width, height, step, cellsByCode, origin: { x: minX * step, z: minZ * step },
    cellAt(x, z) {
      const i = Math.floor(x / step) - minX, j = Math.floor(z / step) - minZ;
      return i >= 0 && j >= 0 && i < width && j < height ? j * width + i : null;
    },
  };
}

export function aggregateMesh(records, grid, areas, floorAt, project = null, categoriesFor = (record) => record.activityCategories ?? []) {
  const exact = new Map(), approximate = new Map();
  const exactRecords = new Map(), approximateRecords = new Map();
  const counts = { coordinate: 0, code: 0, unplaced: 0 };
  for (const record of records) {
    const tags = new Map(categoriesFor(record).map(({ id, label }) => [id, label]));
    if (!tags.size) continue;
    const codes = [...new Set(record.placeCodes)].filter((code) => grid.cellsByCode.has(code));
    const point = project && record.hasLocation ? project(record) : null;
    const cell = point && Number.isFinite(point.x) && Number.isFinite(point.z) ? grid.cellAt(point.x, point.z) : null;
    if (cell !== null && Number.isFinite(floorAt(point.x, point.z)) &&
        (!codes.length || codes.some((code) => areas.get(code)
          .some((triangle) => distanceToTriangle(point.x, point.z, triangle) <= grid.step)))) {
      addTags(exact, cell, tags);
      addRecord(exactRecords, cell, record);
      counts.coordinate++;
    } else if (codes.length) {
      const cells = new Set(codes.flatMap((code) => grid.cellsByCode.get(code)));
      for (const index of cells) {
        addTags(approximate, index, tags);
        addRecord(approximateRecords, index, record);
      }
      counts.code++;
    } else {
      counts.unplaced++;
    }
  }
  return { exact, approximate, exactRecords, approximateRecords, counts };
}

function addRecord(lookup, cell, record) {
  if (!lookup.has(cell)) lookup.set(cell, []);
  lookup.get(cell).push(record);
}

function addTags(summaries, cell, tags) {
  if (!summaries.has(cell)) summaries.set(cell, new Map());
  const summary = summaries.get(cell);
  for (const [tag, label] of tags) {
    if (!summary.has(tag)) summary.set(tag, { tag, label, count: 0 });
    summary.get(tag).count++;
  }
}

export function isTerraceActivityArea(x) {
  // Outer deck arms identified in the reference, in the current GLB's coordinates.
  return x >= -5.35 && x <= 9.25;
}

function proportionSample(x, z) {
  // An ordered 8x8 pattern distributes minority categories without changing on redraw.
  const quadrant = [0, 2, 3, 1];
  let rank = 0;
  for (let bit = 0; bit < 3; bit++) rank = rank * 4 + quadrant[((x >> bit) & 1) + 2 * ((z >> bit) & 1)];
  return (rank + 0.5) / 64;
}

export function createActivityMosaic(grid, exact, approximate, inArea = isTerraceActivityArea) {
  const { width, height, origin, step } = grid;
  const eligible = (index) => inArea(origin.x + ((index % width) + 0.5) * step);
  const sources = [...new Set([...exact.keys(), ...approximate.keys()])].filter(eligible);
  const mosaic = new Map();
  for (let i = 0; i < width * height; i++) {
    if (!eligible(i)) continue;
    const sampled = exact.get(i) ?? approximate.get(i);
    const x = i % width, z = Math.floor(i / width);
    const weights = new Map();
    const evidence = new Map();
    const add = (categories, influence, index) => {
      for (const { tag, count } of categories.values()) {
        weights.set(tag, (weights.get(tag) ?? 0) + count * influence);
        if (!evidence.has(tag) || influence > evidence.get(tag).influence) evidence.set(tag, { index, influence });
      }
    };
    if (sampled) {
      add(sampled, 1, i);
    } else if (sources.length) {
      let nearest = Infinity;
      const distances = sources.map((index) => {
        const distance = Math.hypot(index % width - x, Math.floor(index / width) - z);
        nearest = Math.min(nearest, distance);
        return distance;
      });
      for (let j = 0; j < sources.length; j++) {
        if (distances[j] > nearest + 2) continue;
        const source = sources[j];
        add(exact.get(source) ?? approximate.get(source), 1 / distances[j] ** 2, source);
      }
    }
    const choices = [...weights].sort(([a], [b]) => a.localeCompare(b));
    const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
    let pick = proportionSample(x, z) * total;
    for (const [tag, weight] of choices) {
      pick -= weight;
      if (pick > 0) continue;
      mosaic.set(i, { tag, source: exact.has(i) ? "coordinate" : sampled ? "code" : "estimated", sourceCell: evidence.get(tag).index });
      break;
    }
  }
  return mosaic;
}
