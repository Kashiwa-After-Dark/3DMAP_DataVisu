/**
 * ファイル概要: 場所コードの原点と範囲面から、輪郭円の中心・向き・半径を求める。
 */

const VALID_PLACE_CODE = /^TR-\d{2}$/u;
const MONITOR_FRONT_OFFSET_Z = -0.48;

function displayCenter(code, origin) {
  if (code !== "TR-04") return origin;
  const [x, y, z] = origin;
  return [x, y, z + MONITOR_FRONT_OFFSET_Z];
}

export function buildPlaceRegionRingSpecs(regions) {
  const bestByCode = new Map();
  for (const { code, origin, triangles } of regions) {
    if (!VALID_PLACE_CODE.test(code) || code === "TR-00" || code === "TR-02") continue;
    for (const points of triangles) {
      const [a, b, c] = points;
      const ab = b.map((value, index) => value - a[index]);
      const ac = c.map((value, index) => value - a[index]);
      const cross = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ];
      const doubleArea = Math.hypot(...cross);
      if (doubleArea <= 1e-8) continue;
      const lengths = [
        Math.hypot(...b.map((value, index) => value - c[index])),
        Math.hypot(...a.map((value, index) => value - c[index])),
        Math.hypot(...a.map((value, index) => value - b[index])),
      ];
      const perimeter = lengths.reduce((sum, value) => sum + value, 0);
      const inradius = doubleArea / perimeter;
      const previous = bestByCode.get(code);
      if (previous && previous.inradius >= inradius) continue;
      let normal = cross.map((value) => value / doubleArea);
      if (normal[1] < 0) normal = normal.map((value) => -value);
      bestByCode.set(code, { code, center: displayCenter(code, origin), normal, radius: Math.max(0.32, inradius * 1.05), inradius });
    }
  }
  return [...bestByCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}
