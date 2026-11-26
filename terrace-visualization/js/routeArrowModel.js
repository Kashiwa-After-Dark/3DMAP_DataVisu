/** Spaced directional markers on a validated terrace walking path. */
export const ROUTE_DIRECTIONS = Object.freeze([
  { id: "to_station", label: "駅へ", color: "#8bd2f4", mapColor: "#347dad", headColor: "#c2ecff" },
  { id: "from_station", label: "駅から", color: "#f4bb90", mapColor: "#bd6737", headColor: "#ffe0bf" },
]);
export const ARROW_FRAME_COUNT = 5;
export const ARROW_CYCLE_MS = 1250;
export const arrowFrameAt = (time) => Math.floor(time * ARROW_FRAME_COUNT / ARROW_CYCLE_MS);

export function rectilinearRoute(path, canCross) {
  if (path.length < 2) return [];
  const result = [path[0]];
  const same = (a, b) => a.x === b.x && a.z === b.z;
  for (let i = 0; i < path.length - 1;) {
    const a = path[i];
    let next = i;
    for (let j = path.length - 1; j > i; j -= j - i > 8 ? 4 : 1) {
      const b = path[j];
      const corners = [
        { x: b.x, y: a.y, z: a.z },
        { x: a.x, y: a.y, z: b.z },
      ];
      const corner = corners.find((p) => (same(a, p) || canCross(a, p)) && (same(p, b) || canCross(p, b)));
      if (!corner) continue;
      if (!same(a, corner) && !same(b, corner)) result.push(corner);
      if (!same(a, b)) result.push(b);
      next = j;
      break;
    }
    if (next === i) return [];
    i = next;
  }
  return result.filter((b, i) => {
    const a = result[i - 1], c = result[i + 1];
    if (!a || !c) return true;
    return !((a.x === b.x && b.x === c.x && (b.z - a.z) * (c.z - b.z) > 0)
      || (a.z === b.z && b.z === c.z && (b.x - a.x) * (c.x - b.x) > 0));
  });
}

export function measureArrowRoute(path) {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  }
  return { path, lengths, total: lengths.at(-1) };
}

export function separateArrowLane(path, canCross) {
  const result = [...path];
  for (let i = 1; i < result.length; i++) {
    const a = result[i - 1], b = result[i];
    const axis = a.z === b.z ? "z" : "x";
    const travel = axis === "z" ? "x" : "z";
    const length = Math.abs(b[travel] - a[travel]);
    if (length < 2.5) continue;
    const previous = result[i - 2], next = result[i + 1];
    if ((previous && previous[axis] === a[axis]) || (next && next[axis] === b[axis])) continue;
    let separated = false;
    for (const delta of [-0.24, 0.24]) {
      const start = { x: a.x, y: a.y, z: a.z, [axis]: a[axis] + delta };
      const end = { x: b.x, y: b.y, z: b.z, [axis]: b[axis] + delta };
      if (!canCross(start, end) || (previous && !canCross(previous, start)) || (next && !canCross(end, next))) continue;
      result[i - 1] = start;
      result[i] = end;
      separated = true;
      break;
    }
    if (separated) continue;
    // Keep the original corners when the second lane only fits mid-segment.
    const sign = Math.sign(b[travel] - a[travel]);
    for (const inset of [0.45, 0.8, 1.1]) {
      const start = { ...a, [travel]: a[travel] + sign * inset };
      const end = { ...b, [travel]: b[travel] - sign * inset };
      const shifted = [-0.24, 0.24].map((delta) => [
        start, { ...start, [axis]: start[axis] + delta }, { ...end, [axis]: end[axis] + delta }, end,
      ]).find((points) => {
        const joined = [a, ...points, b];
        return joined.slice(1).every((point, j) => canCross(joined[j], point));
      });
      if (!shifted) continue;
      result.splice(i, 0, ...shifted);
      i += shifted.length;
      break;
    }
  }
  return result;
}

export function arrowAt({ path, lengths, total }, progress, direction) {
  const sign = direction === "to_station" ? -1 : 1;
  const phase = ((progress % 1) + 1) % 1;
  const distance = sign < 0 ? (1 - phase) * total : phase * total;
  let i = 1;
  while (i < lengths.length - 1 && (lengths[i] < distance || (sign > 0 && lengths[i] === distance))) i++;
  const a = path[i - 1], b = path[i];
  const length = lengths[i] - lengths[i - 1];
  const t = length ? (distance - lengths[i - 1]) / length : 0;
  return {
    x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    dx: length ? sign * (b.x - a.x) / length : 0, dz: length ? sign * (b.z - a.z) / length : 0,
    endDistance: Math.min(distance, total - distance),
    distance,
  };
}

export function traceArrowTail({ path, lengths, total }, head, direction, size) {
  const reverse = direction === "to_station";
  const tail = head + (reverse ? size : -size);
  const low = Math.max(0, Math.min(tail, head));
  const high = Math.min(total, Math.max(tail, head));
  const points = [];
  for (let i = 1; i < lengths.length && low < high; i++) {
    const start = Math.max(low, lengths[i - 1]);
    const end = Math.min(high, lengths[i]);
    if (start >= end) continue;
    const a = path[i - 1], b = path[i];
    const pointAt = (distance) => {
      const t = (distance - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
        progress: 1 - Math.abs(distance - head) / size };
    };
    if (!points.length) points.push(pointAt(start));
    points.push(pointAt(end));
  }
  return reverse ? points.reverse() : points;
}
