import { nearestSegment } from "./averageRouteModel.js?v=20261029-03";

export function getActivityPlaybackPositions({ tracks, currentTime, rangeStart, project, segments, isTrackVisible = () => true }) {
  return tracks.flatMap((track, trackIndex) => {
    const points = track.points;
    if (!isTrackVisible(track) || points.length < 2 || currentTime < Math.max(rangeStart, points[0].time) || currentTime > points.at(-1).time) return [];
    let lo = 1;
    let hi = points.length - 1;
    while (lo < hi) {
      const middle = (lo + hi) >> 1;
      if (points[middle].time < currentTime) lo = middle + 1;
      else hi = middle;
    }
    const a = points[lo - 1];
    const b = points[lo];
    const duration = b.time - a.time;
    if (duration <= 0 || duration > 120000) return [];
    const from = project(a);
    const to = project(b);
    const ratio = (currentTime - a.time) / duration;
    const point = { x: from.x + (to.x - from.x) * ratio, z: from.z + (to.z - from.z) * ratio };
    const hit = nearestSegment(point, segments, 60);
    if (!hit) return [];
    const sign = (to.x - from.x) * hit.segment.tangent.x + (to.z - from.z) * hit.segment.tangent.z >= 0 ? 1 : -1;
    return [{ trackIndex, x: hit.x, z: hit.z, sign }];
  });
}
