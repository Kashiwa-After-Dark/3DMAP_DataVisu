import { buildContinuousAverageRoutes } from "./continuousAverageRoute.js?v=20261029-01";

export const HALF_HOUR_MS = 30 * 60 * 1000;
export const AVERAGE_ROUTE_OPTIONS = Object.freeze({
  cellLength: 14,
  sampleSpacing: 5,
  maxRoadDistance: 25,
  maxGapMs: 120000,
  maxJump: 120,
  maxRecorderSpeed: 6,
  minimumDeviation: 5,
  madMultiplier: 3,
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function robustMean(values, options = AVERAGE_ROUTE_OPTIONS) {
  if (!values.length) return null;
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  const threshold = Math.max(options.minimumDeviation, options.madMultiplier * 1.4826 * mad);
  const kept = values.filter((value) => Math.abs(value - center) <= threshold);
  return { mean: kept.reduce((sum, value) => sum + value, 0) / kept.length, kept: kept.length, rejected: values.length - kept.length };
}

export function projectToSegment(point, segment) {
  const dx = segment.b.x - segment.a.x;
  const dz = segment.b.z - segment.a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((point.x - segment.a.x) * dx + (point.z - segment.a.z) * dz) / lengthSquared));
  const projected = lerp(segment.a, segment.b, t);
  return { ...projected, t, distance: distance(point, projected), offset: (point.x - projected.x) * segment.normal.x + (point.z - projected.z) * segment.normal.z };
}

export function nearestSegment(point, segments, maxDistance = Infinity) {
  let best = null;
  for (const segment of segments) {
    const projection = projectToSegment(point, segment);
    if (projection.distance > maxDistance || (best && projection.distance >= best.distance)) continue;
    best = { ...projection, segment };
  }
  return best;
}

function buildRoadSegments(roads, project, station, options) {
  const segments = [];
  const nodes = new Map();
  const getNode = (point) => {
    const key = `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
    if (!nodes.has(key)) nodes.set(key, { ...point, edges: [], distance: Infinity });
    return nodes.get(key);
  };
  for (const [id, coordinates] of roads) {
    let previous = null;
    for (let index = 1; index < coordinates.length; index += 1) {
      const a = project({ lon: coordinates[index - 1][0], lat: coordinates[index - 1][1] });
      const b = project({ lon: coordinates[index][0], lat: coordinates[index][1] });
      const length = distance(a, b);
      if (length < 0.1) continue;
      const divisions = Math.ceil(length / options.cellLength);
      for (let slot = 0; slot < divisions; slot += 1) {
        const start = lerp(a, b, slot / divisions);
        const end = lerp(a, b, (slot + 1) / divisions);
        const cellLength = distance(start, end);
        const tangent = { x: (end.x - start.x) / cellLength, z: (end.z - start.z) / cellLength };
        const from = getNode(start);
        const to = getNode(end);
        from.edges.push({ node: to, length: cellLength });
        to.edges.push({ node: from, length: cellLength });
        const segment = { id: `${id}:${index}:${slot}`, a: start, b: end, tangent, normal: { x: -tangent.z, z: tangent.x }, from, to, previous };
        if (previous) previous.next = segment;
        segments.push(segment);
        previous = segment;
      }
    }
  }
  // Network distance follows streets around corners rather than pointing through buildings.
  const allNodes = [...nodes.values()];
  const root = allNodes.reduce((best, node) => !best || distance(node, station) < distance(best, station) ? node : best, null);
  if (root) root.distance = 0;
  const pending = new Set(allNodes);
  while (pending.size) {
    let closest = null;
    for (const node of pending) if (!closest || node.distance < closest.distance) closest = node;
    if (!closest || !Number.isFinite(closest.distance)) break;
    pending.delete(closest);
    for (const edge of closest.edges) edge.node.distance = Math.min(edge.node.distance, closest.distance + edge.length);
  }
  for (const segment of segments) {
    const connected = Number.isFinite(segment.from.distance) && Number.isFinite(segment.to.distance);
    const delta = connected
      ? segment.to.distance - segment.from.distance
      : distance(segment.b, station) - distance(segment.a, station);
    segment.towardSign = Math.abs(delta) > 0.25 ? (delta < 0 ? 1 : -1) : 0;
  }
  return segments;
}

export function buildAverageRouteModel({ tracks, roads, project, station, startTime, endTime, options = AVERAGE_ROUTE_OPTIONS }) {
  const segments = buildRoadSegments(roads, project, project(station), options);
  const periodCount = Math.ceil((endTime - startTime) / HALF_HOUR_MS);
  const periods = Array.from({ length: periodCount }, (_, index) => ({
    index, start: startTime + index * HALF_HOUR_MS, end: Math.min(startTime + (index + 1) * HALF_HOUR_MS, endTime),
    samples: new Map(), sequences: new Map(), cells: new Map(), trackIds: new Set(), rejectedSamples: 0, rejectedTrackOffsets: 0,
  }));
  for (const [trackIndex, track] of tracks.entries()) {
    const points = track.points.map((point) => ({ ...project(point), time: point.time }));
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const elapsed = b.time - a.time;
      const length = distance(a, b);
      if (elapsed <= 0 || elapsed > options.maxGapMs || length > options.maxJump || length / (elapsed / 1000) > options.maxRecorderSpeed) continue;
      for (const period of periods) {
        const start = Math.max(a.time, period.start);
        const end = Math.min(b.time, period.end);
        if (end <= start) continue;
        const count = Math.max(1, Math.ceil(length * ((end - start) / elapsed) / options.sampleSpacing));
        for (let sample = 0; sample < count; sample += 1) {
          const time = start + (end - start) * (sample + 0.5) / count;
          const point = lerp(a, b, (time - a.time) / elapsed);
          const hit = nearestSegment(point, segments, options.maxRoadDistance);
          if (!hit) { period.rejectedSamples += 1; continue; }
          let contributors = period.samples.get(hit.segment.id);
          if (!contributors) period.samples.set(hit.segment.id, contributors = new Map());
          let offsets = contributors.get(trackIndex);
          if (!offsets) contributors.set(trackIndex, offsets = []);
          offsets.push(hit.offset);
          let sequence = period.sequences.get(trackIndex);
          if (!sequence) period.sequences.set(trackIndex, sequence = []);
          if (sequence.at(-1) !== hit.segment.id) sequence.push(hit.segment.id);
          period.trackIds.add(trackIndex);
        }
      }
    }
  }
  for (const period of periods) {
    for (const segment of segments) {
      const contributors = period.samples.get(segment.id);
      if (!contributors) continue;
      // Each track has one vote, regardless of its sampling rate or dwell duration.
      const offsets = [...contributors.values()].map((samples) => robustMean(samples, options).mean);
      const average = robustMean(offsets, options);
      period.rejectedTrackOffsets += average.rejected;
      period.cells.set(segment.id, { ...segment, offset: average.mean, contributors: average.kept });
    }
    // Average offsets at shared ends keep adjacent supported cells joined.
    for (const cell of period.cells.values()) {
      const previous = period.cells.get(cell.previous?.id);
      const next = period.cells.get(cell.next?.id);
      const start = shifted(cell.a, cell.normal, cell.offset);
      const end = shifted(cell.b, cell.normal, cell.offset);
      cell.start = previous ? lerp(start, shifted(previous.b, previous.normal, previous.offset), 0.5) : start;
      cell.end = next ? lerp(end, shifted(next.a, next.normal, next.offset), 0.5) : end;
      cell.center = lerp(cell.start, cell.end, 0.5);
    }
    delete period.samples;
  }
  buildContinuousAverageRoutes(periods, segments);
  return { periods, segments, startTime, endTime, options };
}

function shifted(point, normal, offset) {
  return { x: point.x + normal.x * offset, z: point.z + normal.z * offset };
}

export function getFlowPeriod(model, currentTime) {
  const index = Math.max(0, Math.min(model.periods.length - 1, Math.floor((currentTime - model.startTime) / HALF_HOUR_MS)));
  return model.periods[index];
}

export function collectDirectionalFlows({ model, period, memos, currentTime, rangeStart, matches = () => true }) {
  const flows = new Map();
  let eligible = 0;
  let unmatched = 0;
  let matchingRecords = 0;
  for (const memo of memos) {
    if (memo.time < Math.max(period.start, rangeStart) || memo.time > currentTime || memo.time >= period.end || !matches(memo)) continue;
    matchingRecords += 1;
    if (!memo.isPeople || !['to_station', 'from_station'].includes(memo.direction)) continue;
    const motions = String(memo.motion || '').split('|').filter((motion) => ['walking', 'running', 'cycling'].includes(motion));
    if (!motions.length) continue;
    eligible += 1;
    if (!memo.hasLocation) { unmatched += 1; continue; }
    const hit = nearestSegment(memo.world, (period.routeCells || period.cells).values(), 30);
    const cell = hit?.segment;
    if (!cell || !cell.towardSign) { unmatched += 1; continue; }
    const motion = motions.includes('running') ? 'running' : motions.includes('cycling') ? 'cycling' : 'walking';
    const key = `${cell.id}:${memo.direction}:${motion}`;
    if (!flows.has(key)) flows.set(key, { cell, direction: memo.direction, motion, records: 0, people: 0 });
    const flow = flows.get(key);
    flow.records += 1;
    flow.people += Number(memo.count) || 1;
  }
  return { flows: [...flows.values()], eligible, unmatched, matchingRecords };
}
