/** Verifies the direction and placement of top-down route arrows. */
import test from "node:test";
import assert from "node:assert/strict";
import { arrowAt, arrowFrameAt, measureArrowRoute, rectilinearRoute, separateArrowLane, traceArrowTail } from "../js/routeArrowModel.js";

const path = [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0.2, z: 0 }, { x: 4, z: 0 }];

test("station-bound arrows reverse the station-to-exit path direction", () => {
  const route = measureArrowRoute(path);
  const coordinates = (direction) => [0.25, 0.5, 0.75].map((phase) => {
    const { x, dx } = arrowAt(route, phase, direction);
    return [x, dx];
  });
  assert.deepEqual(coordinates("to_station"), [[3, -1], [2, -1], [1, -1]]);
  assert.deepEqual(coordinates("from_station"), [[1, 1], [2, 1], [3, 1]]);
  assert.equal(arrowAt(route, 1, "from_station").endDistance, 0);
});

test("orthogonal routes use the open corner and never fall back to a diagonal", () => {
  const points = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }];
  const result = rectilinearRoute(points, (a, b) => a.x === b.x ? a.x === 1 : a.z === b.z && a.z === 0);
  assert.deepEqual(result, [points[0], { x: 1, y: 0, z: 0 }, points[1]]);
  assert.deepEqual(rectilinearRoute(points, () => false), []);
  const route = measureArrowRoute(result);
  assert.deepEqual([0.25, 0.75].map((t) => {
    const { dx, dz } = arrowAt(route, t, "from_station");
    return [dx, dz];
  }), [[1, 0], [0, 1]]);
});

test("tails follow a bend in either direction and never wrap across an entrance", () => {
  const route = measureArrowRoute([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }]);
  const positions = (distance, direction) => traceArrowTail(route, distance, direction, 2).map(({ x, z }) => [x, z]);
  assert.deepEqual(positions(3, "from_station"), [[1, 0], [2, 0], [2, 1]]);
  assert.deepEqual(positions(1, "to_station"), [[2, 1], [2, 0], [1, 0]]);
  assert.deepEqual(positions(0.25, "from_station"), [[0, 0], [0.25, 0]]);
});

test("the second lane separates the long run without cutting a blocked corner", () => {
  const path = [{ x: 0, z: 0 }, { x: 5, z: 0 }];
  const clear = (a, b) => [a, b].every(({ x, z }) => z === 0 || (x > 0 && x < 5));
  const result = separateArrowLane(path, clear);
  assert.deepEqual(result.map(({ x, z }) => [x, z]), [[0, 0], [0.45, 0], [0.45, -0.24], [4.55, -0.24], [4.55, 0], [5, 0]]);
  assert.deepEqual(separateArrowLane(path, (a, b) => a.z === 0 && b.z === 0), path);
});

test("motion holds each of five evenly spaced frames", () => {
  assert.deepEqual([0, 249, 250, 499, 500, 750, 1000, 1249, 1250].map(arrowFrameAt), [0, 0, 1, 1, 2, 3, 4, 4, 5]);
});
