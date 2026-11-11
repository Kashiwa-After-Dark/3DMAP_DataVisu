/**
 * ファイル概要: ルート上における感情・印象の密度分布を計算する。
 */
import { IMPRESSION_TYPES, getImpressionType } from "../../../backend/impressionClassifier.js?v=20261029-db1";

export const DYE_GRID_SIZE = 96;
export const DYE_RADIUS = 18;

export function pointInRoute(point, path) {
  let inside = false;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const a = path[i];
    const b = path[j];
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function createDensityDomain(path, size = DYE_GRID_SIZE) {
  const minX = Math.min(...path.map((p) => p.x));
  const minZ = Math.min(...path.map((p) => p.z));
  const width = Math.max(1, Math.max(...path.map((p) => p.x)) - minX);
  const depth = Math.max(1, Math.max(...path.map((p) => p.z)) - minZ);
  const mask = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    mask[z * size + x] = pointInRoute({ x: minX + (x + 0.5) / size * width, z: minZ + (z + 0.5) / size * depth }, path) ? 255 : 0;
  }
  return { minX, minZ, width, depth, size, mask };
}

export function buildImpressionDensity({ memos, domain, currentTime = Infinity, rangeStart = -Infinity, matches = () => true, referenceMax, getType = getImpressionType }) {
  const { minX, minZ, width, depth, size } = domain;
  const field = new Float32Array(size * size * 4);
  const channelFor = new Map(IMPRESSION_TYPES.map(({ id }, index) => [id, index]));
  let located = 0;
  let unplaced = 0;
  for (const memo of memos) {
    if (!memo.isPeople || memo.time > currentTime || memo.time < rangeStart || !matches(memo)) continue;
    const point = memo.world;
    if (!memo.hasLocation || !point || !Number.isFinite(point.x) || !Number.isFinite(point.z)
      || point.x < minX || point.x > minX + width || point.z < minZ || point.z > minZ + depth) {
      unplaced++;
      continue;
    }
    const channel = channelFor.get(getType(memo).id);
    let contributed = false;
    const x0 = Math.max(0, Math.floor((point.x - DYE_RADIUS * 2 - minX) / width * size));
    const x1 = Math.min(size - 1, Math.ceil((point.x + DYE_RADIUS * 2 - minX) / width * size));
    const z0 = Math.max(0, Math.floor((point.z - DYE_RADIUS * 2 - minZ) / depth * size));
    const z1 = Math.min(size - 1, Math.ceil((point.z + DYE_RADIUS * 2 - minZ) / depth * size));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!domain.mask[z * size + x]) continue;
      const dx = minX + (x + 0.5) / size * width - point.x;
      const dz = minZ + (z + 0.5) / size * depth - point.z;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared > DYE_RADIUS * DYE_RADIUS * 4) continue;
      field[(z * size + x) * 4 + channel] += Math.exp(-distanceSquared / (2 * DYE_RADIUS * DYE_RADIUS));
      contributed = true;
    }
    if (contributed) located++;
    else unplaced++;
  }
  let maximum = 1;
  for (let i = 0; i < field.length; i += 4) maximum = Math.max(maximum, field[i] + field[i + 1] + field[i + 2] + field[i + 3]);
  const scale = Math.max(1, referenceMax ?? maximum);
  const data = new Uint8Array(field.length);
  for (let i = 0; i < field.length; i++) data[i] = Math.round(Math.min(1, field[i] / scale) * 255);
  return { data, maximum, located, unplaced };
}
