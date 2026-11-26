/**
 * ファイル概要: 場所コードごとの平面輪郭円が原点を中心とすることを確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildPlaceRegionRingSpecs } from "../js/placeRegionRingModel.js";

const rightTriangle = [[0, 2, 0], [6, 2, 0], [0, 2, 6]];

test("builds one horizontal outline-circle specification per place code", () => {
  const specs = buildPlaceRegionRingSpecs([
    { code: "TR-05", origin: [3, 2, 1], triangles: [rightTriangle, [[10, 3, 0], [12, 3, 0], [10, 3, 2]]] },
    { code: "TR-01", origin: [1, 2, 1], triangles: [rightTriangle] },
    { code: "TR-00", triangles: [rightTriangle] },
  ]);
  assert.deepEqual(specs.map(({ code }) => code), ["TR-01", "TR-05"]);
  assert.equal(specs[1].center[1], 2);
  assert.ok(specs[1].normal.every((value, index) => Math.abs(value - [0, 1, 0][index]) < 1e-12));
  assert.ok(specs[0].radius > 0);
  assert.ok(specs[1].radius <= specs[0].radius);
});

test("keeps the authored origin even outside the largest triangle and increases the radius", () => {
  const origin = [4, 2, 4];
  const [spec] = buildPlaceRegionRingSpecs([{ code: "TR-09", origin, triangles: [rightTriangle] }]);
  assert.deepEqual(spec.center, origin);
  assert.ok(spec.radius > spec.inradius * 0.68);
});

test("the TR-02 passage has no ring and does not affect the TR-05 bench ring", () => {
  const bench = { code: "TR-05", origin: [0.24, 2, 0], triangles: [rightTriangle] };
  const road = { code: "TR-02", origin: [0, 2, 0], triangles: [rightTriangle] };
  assert.deepEqual(buildPlaceRegionRingSpecs([road, bench]), buildPlaceRegionRingSpecs([bench]));
});

test("only the monitor-front ring moves toward the plaza without changing the source origin", () => {
  const origin = [5, 2, 1.48];
  const [monitor, bench] = buildPlaceRegionRingSpecs([
    { code: "TR-04", origin, triangles: [rightTriangle] },
    { code: "TR-05", origin, triangles: [rightTriangle] },
  ]);
  assert.deepEqual(monitor.center, [5, 2, 1]);
  assert.deepEqual(bench.center, [5, 2, 1.48]);
  assert.deepEqual(origin, [5, 2, 1.48]);
});
