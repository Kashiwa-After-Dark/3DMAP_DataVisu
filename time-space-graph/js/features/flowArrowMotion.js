export const ARROW_FRAME_MS = 240;
export const arrowFrameAt = (time) => Math.floor(Math.max(0, time) / ARROW_FRAME_MS) % 3;

export function createRouteMotion(path) {
  let total = 0;
  const segments = [];
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 0.001) continue;
    segments.push({ a, length, start: total, tangent: { x: (b.x - a.x) / length, z: (b.z - a.z) / length } });
    total += length;
  }
  const anchors = new WeakMap();
  return (point, offset) => {
    if (!segments.length) return { ...point, tangent: { x: 1, z: 0 } };
    if (!anchors.has(point)) {
      let best = Infinity;
      let anchor = 0;
      for (const segment of segments) {
        const t = Math.max(0, Math.min(segment.length, (point.x - segment.a.x) * segment.tangent.x + (point.z - segment.a.z) * segment.tangent.z));
        const distance = Math.hypot(point.x - segment.a.x - segment.tangent.x * t, point.z - segment.a.z - segment.tangent.z * t);
        if (distance < best) {
          best = distance;
          anchor = segment.start + t;
        }
      }
      anchors.set(point, anchor);
    }
    const along = ((anchors.get(point) + offset) % total + total) % total;
    const segment = segments.find((entry) => along < entry.start + entry.length) || segments.at(-1);
    const distance = along - segment.start;
    return { x: segment.a.x + segment.tangent.x * distance, z: segment.a.z + segment.tangent.z * distance, tangent: segment.tangent };
  };
}
