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

export function createActivityMosaic(grid, exact, approximate, inArea = isTerraceActivityArea, recordLookup, onDeck) {
  const { width, height, origin, step } = grid;
  const eligible = (index) => index >= 0 && index < width * height && (!onDeck || onDeck[index]) &&
    inArea(origin.x + ((index % width) + 0.5) * step);
  const neighbors = (index) => [index % width > 0 ? index - 1 : -1, index % width < width - 1 ? index + 1 : -1,
    index - width, index + width];
  const sources = [...new Set([...exact.keys(), ...approximate.keys()])].filter(eligible);
  const keys = new Map(sources.map((index) => {
    const precise = exact.has(index);
    const entries = (exact.get(index) ?? approximate.get(index)).values();
    const summary = [...entries].map(({ tag, count }) => [tag, count]).sort();
    const ids = recordLookup?.(index, precise)?.map(({ id }) => id).sort();
    return [index, JSON.stringify([precise, ids, summary])];
  }));
  const mosaic = new Map();
  // Lay each local mix out in bands, then extend the nearest band into reference cells.
  for (const start of sources) {
    if (mosaic.has(start)) continue;
    const key = keys.get(start);
    const group = [start];
    const visited = new Set(group);
    for (let i = 0; i < group.length; i++) {
      for (const next of neighbors(group[i])) {
        if (keys.get(next) !== key || visited.has(next)) continue;
        visited.add(next);
        group.push(next);
      }
    }
    const choices = [...(exact.get(start) ?? approximate.get(start)).values()]
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    // Tiny groups borrow adjacent reference cells only as needed to show all tags.
    for (let i = 0; group.length < choices.length && i < group.length; i++) {
      for (const next of neighbors(group[i])) {
        if (!eligible(next) || keys.has(next) || mosaic.has(next) || visited.has(next)) continue;
        visited.add(next);
        group.push(next);
        if (group.length === choices.length) break;
      }
    }
    const xs = group.map((cell) => cell % width), zs = group.map((cell) => Math.floor(cell / width));
    const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
    group.sort((a, b) => alongX ? a % width - b % width || a - b : a - b);
    const visible = choices.slice(0, group.length);
    const total = visible.reduce((sum, { count }) => sum + count, 0);
    let first = 0, cumulative = 0;
    for (const [rank, { tag, count }] of visible.entries()) {
      cumulative += count;
      const end = Math.min(group.length - (visible.length - 1 - rank),
        Math.max(first + 1, Math.round(cumulative / total * group.length)));
      for (let i = first; i < end; i++) {
        const index = group[i];
        const source = exact.has(index) ? "coordinate" : approximate.has(index) ? "code" : "estimated";
        mosaic.set(index, { tag, source, sourceCell: source === "estimated" ? start : index });
      }
      first = end;
    }
  }
  const placed = [...mosaic.entries()];
  for (let i = 0; i < width * height; i++) {
    if (!eligible(i) || mosaic.has(i)) continue;
    const x = i % width, z = Math.floor(i / width);
    let distance = Infinity, nearest;
    for (const [index, entry] of placed) {
      const d = (index % width - x) ** 2 + (Math.floor(index / width) - z) ** 2;
      if (d < distance) { distance = d; nearest = entry; }
    }
    if (nearest) mosaic.set(i, { ...nearest, source: "estimated" });
  }
  return mosaic;
}
