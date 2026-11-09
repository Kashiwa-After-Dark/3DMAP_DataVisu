import test from "node:test";
import assert from "node:assert/strict";
import { collectRouteActivityDensity, isStationaryObservation } from "../time-space-graph/js/features/routeActivityDensity.js";

const cells = [0, 10, 20, 70].map((x, i) => ({ id: String(i), a: { x, z: 0 }, b: { x: x + 10, z: 0 }, center: { x: x + 5, z: 0 }, normal: { x: 0, z: 1 } }));
const period = { start: 0, end: 100, cells: new Map(cells.map((cell) => [cell.id, cell])) };
const memo = { time: 10, world: { x: 5, z: 0 }, isPeople: true, hasLocation: true, activity: "会話", motion: "standing" };
const collect = (memos, options = {}) => collectRouteActivityDensity({ period, memos, ...options });

test("stationary colors exclude objects, passing, walking, running and cycling", () => {
  assert.ok(isStationaryObservation(memo));
  for (const motion of ["walking", "running", "cycling", "standing|walking"]) assert.ok(!isStationaryObservation({ ...memo, motion }));
  assert.ok(!isStationaryObservation({ ...memo, isPeople: false }));
  assert.ok(!isStationaryObservation({ ...memo, activity: "移動", motion: "" }));
});

test("dominant stationary activity determines color while record density sets opacity", () => {
  const result = collect([memo, memo, { ...memo, activity: "休憩" }]);
  assert.equal(result.bins[0].activity, "conversation");
  assert.equal(result.bins[0].color, "#00e5ff");
  assert.ok(result.bins[0].opacity > result.bins[1].opacity);
  assert.ok(result.bins[1].opacity > result.bins[2].opacity);
  assert.equal(result.bins[3].opacity, 0.06);
  const sparse = collect([memo], { referenceMax: result.maximum });
  assert.ok(sparse.bins[0].opacity < result.bins[0].opacity);
});

test("time, filters, missing locations and off-route records cannot add density", () => {
  assert.equal(collect([memo], { currentTime: 5 }).records, 0);
  assert.equal(collect([memo], { rangeStart: 20 }).records, 0);
  assert.equal(collect([memo], { matches: () => false }).records, 0);
  assert.equal(collect([{ ...memo, hasLocation: false }]).records, 0);
  assert.equal(collect([{ ...memo, world: { x: 5, z: 31 } }]).records, 0);
  assert.equal(collect([{ ...memo, time: 100 }]).records, 0);
});
