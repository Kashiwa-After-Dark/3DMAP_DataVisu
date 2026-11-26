/** ファイル概要: 歩行経路の寄り道を短縮し、個体ごとの滑らかな横ずれを計算する。 */
const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

export function streamlineRoad(points, canCross) {
  const corners = [points[0]];
  for (let i = 0; i < points.length - 1;) {
    let next = points.length - 1;
    while (next > i + 1 && !canCross(points[i], points[next])) next--;
    corners.push(points[next]);
    i = next;
  }
  const result = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const a = corners[i - 1], b = corners[i], c = corners[i + 1];
    const radius = Math.min(0.5, distance(a, b) * 0.4, distance(b, c) * 0.4);
    if (radius <= 0.001) { result.push(b); continue; }
    const entry = mix(b, a, radius / distance(a, b));
    const exit = mix(b, c, radius / distance(b, c));
    const curve = Array.from({ length: 9 }, (_, step) => {
      const t = step / 8;
      return mix(mix(entry, b, t), mix(b, exit, t), t);
    });
    result.push(...(curve.every((point, j) => !j || canCross(curve[j - 1], point)) ? curve : [b]));
  }
  result.push(corners.at(-1));
  return result;
}

export function offsetRoad(points, seed, amplitude, widthAt = () => 1) {
  return points.map((point, i) => {
    const t = i / (points.length - 1);
    if (i === 0 || i === points.length - 1) return point;
    const before = points[i - 1], after = points[i + 1];
    const length = distance(before, after);
    if (length === 0) return point;
    const bias = Math.sin(seed * 2.399);
    const wave = Math.sin(t * Math.PI * 3 + seed * 1.73);
    const offset = amplitude * widthAt(point) * Math.sin(Math.PI * t) ** 1.3 * (bias * 0.75 + wave * 0.25);
    return { x: point.x - (after.z - before.z) / length * offset, z: point.z + (after.x - before.x) / length * offset };
  });
}
