/**
 * ファイル概要: 分析で使用する指定済みルート座標と時間帯レイヤーを作る。
 */
import { HALF_HOUR_MS } from "./average-route-model.js?v=20261029-03";

export const ROUTE_COORDINATES = Object.freeze([
  [35.862324, 139.971564],
  [35.862541, 139.971761],
  [35.86263, 139.971913],
  [35.8628, 139.972048],
  [35.862729, 139.972158],
  [35.862454, 139.971926],
  [35.86216, 139.971709],
  [35.861979, 139.971712],
  [35.861693, 139.971967],
  [35.860372, 139.97372],
  [35.859954, 139.973245],
  [35.860666, 139.972582],
  [35.860728, 139.972356],
  [35.860771, 139.971728],
  [35.861484, 139.971877],
  [35.86169, 139.971963],
  [35.862002, 139.971679],
  [35.862197, 139.971607],
].map(Object.freeze));

export const ROUTE_STYLE = Object.freeze({ opacity: 0.3, width: 6 });

export function buildSpecifiedRouteModel({ project, station, startTime, endTime }) {
  const path = ROUTE_COORDINATES.map(([lat, lon]) => project({ lat, lon }));
  path.push({ ...path[0] });
  const stationPoint = project(station);
  const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
  const segments = [];
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const length = distance(from, to);
    if (length < 0.001) continue;
    const tangent = { x: (to.x - from.x) / length, z: (to.z - from.z) / length };
    const divisions = Math.ceil(length / 14);
    for (let slot = 0; slot < divisions; slot += 1) {
      const point = (t) => ({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });
      const a = point(slot / divisions);
      const b = point((slot + 1) / divisions);
      const delta = distance(b, stationPoint) - distance(a, stationPoint);
      segments.push({
        id: `specified:${index}:${slot}`, a, b, tangent,
        normal: { x: -tangent.z, z: tangent.x },
        center: point((slot + 0.5) / divisions),
        towardSign: Math.abs(delta) > 0.01 ? (delta < 0 ? 1 : -1) : 0,
      });
    }
  }
  const cells = new Map(segments.map((segment) => [segment.id, segment]));
  const periods = Array.from({ length: Math.ceil((endTime - startTime) / HALF_HOUR_MS) }, (_, index) => ({
    index, start: startTime + index * HALF_HOUR_MS,
    end: Math.min(startTime + (index + 1) * HALF_HOUR_MS, endTime),
    path, cells, routeCells: cells,
  }));
  return { periods, segments, startTime, endTime };
}
