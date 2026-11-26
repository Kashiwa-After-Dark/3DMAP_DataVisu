/** ファイル概要: TR-02の駅側と外側の出入口の辺を、デッキ上の歩行経路で結ぶ。 */
import * as THREE from "three";
import { routeBetweenEdges } from "./roadPeopleModel.js?v=20261119-gates1";
import { streamlineRoad, offsetRoad } from "./roadPeopleTrajectories.js?v=20261119-plaza1";
import { rectilinearRoute, separateArrowLane } from "./routeArrowModel.js?v=20261123-stop-motion1";

// The GLB exports triangulated faces without named gates. These identify
// the midpoints of the authored terminal edges, not GPS observations.
const STATION_GATE = { x: 7.366, z: 1.986 };
const OUTSIDE_GATES = [{ x: -3.403, z: -3.667 }, { x: 8.8865, z: -2.7555 }];
const BENCH_MIN_X = 1.35;
const BENCH_MAX_X = 6.95;
const BENCH_MIN_Z = -0.72;

function walkingWidth({ x, z }) {
  const distance = Math.hypot(Math.max(BENCH_MIN_X - x, x - BENCH_MAX_X, 0), Math.max(BENCH_MIN_Z - z, 0));
  return THREE.MathUtils.smoothstep(distance, 0, 0.9);
}

export function createRoadPeoplePaths(triangles, floors, obstacles, benches = [], clearance = 0) {
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const walkingObstacles = [...obstacles, ...benches];
  const rim = Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4;
    return [clearance * Math.cos(angle), clearance * Math.sin(angle)];
  });
  const insideRoute = (x, z) => triangles.some(({ points }) => {
    const sides = points.map((a, i) => {
      const b = points[(i + 1) % 3];
      return (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    });
    return sides.every((v) => v >= -1e-6) || sides.every((v) => v <= 1e-6);
  });
  function deckHeight(x, z) {
    ray.ray.origin.set(x, 2, z);
    return ray.intersectObjects(floors, false)[0]?.point.y;
  }
  function floorAt(x, z, needsClearance = true) {
    if (!insideRoute(x, z) || walkingObstacles.some((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z)) return null;
    const y = deckHeight(x, z);
    if (y === undefined) return null;
    // Reject the edge of holes even when a downward ray finds a lower surface.
    if (needsClearance && clearance && rim.some(([dx, dz]) => {
      const edge = deckHeight(x + dx, z + dz);
      return edge === undefined || Math.abs(edge - y) > 0.035;
    })) return null;
    return new THREE.Vector3(x, y + 0.012, z);
  }
  function sampleSegment(a, b) {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.045));
    const points = [];
    for (let i = 0; i <= count; i++) {
      const x = a.x + (b.x - a.x) * i / count;
      const z = a.z + (b.z - a.z) * i / count;
      const point = floorAt(x, z);
      if (!point) return null;
      points.push(point);
    }
    return points;
  }
  function segment(samples, accepts, a, b) {
    if (!samples.has(a)) samples.set(a, new Map());
    if (!samples.has(b)) samples.set(b, new Map());
    if (!samples.get(a).has(b)) {
      const path = sampleSegment(a, b);
      const safe = path?.every(accepts) ? path : null;
      samples.get(a).set(b, safe);
      samples.get(b).set(a, safe && [...safe].reverse());
    }
    return samples.get(a).get(b);
  }
  const [west, east] = OUTSIDE_GATES;
  const betweenOpenings = ({ x }) => x >= 3 && x <= 5.5;
  const routes = [
    { id: "plaza", gate: west, accepts: (p) => !betweenOpenings(p) || p.z < -1.2, slots: 7 },
    { id: "bench", gate: west, accepts: (p) => !betweenOpenings(p) || p.z > 0.15, slots: 1 },
    { id: "east", gate: east, accepts: () => true, slots: 4 },
  ];
  return routes.flatMap(({ id, gate, accepts, slots }) => {
    const samples = new Map();
    const routeSegment = (a, b) => segment(samples, accepts, a, b);
    const nodes = routeBetweenEdges(triangles, STATION_GATE, [gate], (a, b) => Boolean(routeSegment(a, b)));
    if (!nodes) return [];
    const original = nodes.slice(1).flatMap((b, i) => routeSegment(nodes[i], b).slice(i === 0 ? 0 : 1));
    const controls = original.filter((_, i) => i % 3 === 0 || i === original.length - 1);
    const stitch = (points, check) => {
      const parts = points.slice(1).map((b, i) => check(points[i], b));
      return parts.every(Boolean) ? parts.flatMap((part, i) => part.slice(i === 0 ? 0 : 1)) : null;
    };
    const smooth = streamlineRoad(controls, (a, b) => Boolean(routeSegment(a, b)));
    const base = stitch(smooth, routeSegment) ?? original;
    const { path, length } = resample(base);
    const isWalkable = (points) => points.slice(1).every((b, i) => sampleSegment(points[i], b)?.every(accepts));
    const safePath = isWalkable(path) ? path : base;
    let arrowPath;
    let separatedPath;
    function canCrossArrow(a, b) {
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05));
      for (let i = 0; i <= steps; i++) {
        const x = a.x + (b.x - a.x) * i / steps, z = a.z + (b.z - a.z) * i / steps;
        if (!accepts({ x, z }) || !floorAt(x, z, false)) return false;
      }
      return true;
    }
    return [{
      id, length, slots,
      getArrowPaths() {
        arrowPath ??= rectilinearRoute(safePath.slice(2, -2), canCrossArrow);
        separatedPath ??= separateArrowLane(arrowPath, canCrossArrow);
        return { to_station: arrowPath, from_station: separatedPath };
      },
      pathFor(seed) {
        for (const scale of [0.78, -0.78, 0.6, -0.6, 0.42, -0.42, 0.26, -0.26, 0.12, -0.12]) {
          const points = [];
          for (const { x, z } of offsetRoad(path, seed, scale, walkingWidth)) {
            const point = floorAt(x, z);
            if (!point) break;
            points.push(point);
          }
          if (points.length !== path.length) continue;
          const varied = resample(points).path;
          if (isWalkable(varied)) return varied;
        }
        return safePath;
      },
    }];
  });

  function resample(points) {
    const distances = [0];
    for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + points[i].distanceTo(points[i - 1]));
    let index = 1;
    const length = distances.at(-1);
    const path = Array.from({ length: 256 }, (_, i) => {
      const distance = length * i / 255;
      while (index < distances.length - 1 && distances[index] < distance) index++;
      const fraction = (distance - distances[index - 1]) / (distances[index] - distances[index - 1] || 1);
      return points[index - 1].clone().lerp(points[index], fraction);
    });
    return { path, length };
  }
}
