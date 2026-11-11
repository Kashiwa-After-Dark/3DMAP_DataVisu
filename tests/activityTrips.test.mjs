/**
 * ファイル概要: 移動アニメーションのレーンと軌跡を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildActivityTripGeometry, tripPhaseAt, TRIP_CYCLE_MS, TRIP_LANE_OFFSET } from "../space-time-cube/js/movement-visualization/activity-trip-geometry.js";

const cell = { center: { x: 0, z: 0 }, towardSign: 1 };
const sampleRoute = (point, offset) => ({ x: point.x + offset, z: 0, tangent: { x: 1, z: 0 } });
const flow = { cell, direction: "to_station", people: 1 };

test("trip phase advances continuously and loops", () => {
  assert.equal(tripPhaseAt(0), 0);
  assert.equal(tripPhaseAt(TRIP_CYCLE_MS / 2), 0.5);
  assert.equal(tripPhaseAt(TRIP_CYCLE_MS), 0);
  assert.equal(tripPhaseAt(-1), 0);
});

test("same-direction trails follow a single offset lane without lateral queues", () => {
  const { positions, progress } = buildActivityTripGeometry([flow], sampleRoute);
  assert.equal(positions.length, progress.length * 3);
  assert.equal(progress.length, 72 * 6);
  assert.ok(positions.every(Number.isFinite));
  assert.ok(positions.filter((_, index) => index % 3 === 2).every((z) => Math.abs(z - TRIP_LANE_OFFSET) <= 0.650001));
  assert.ok(progress.at(-1) > progress[0]);
});

test("opposite directions travel in separate non-overlapping lanes", () => {
  const inward = buildActivityTripGeometry([flow], sampleRoute);
  const outward = buildActivityTripGeometry([{ ...flow, direction: "from_station" }], sampleRoute);
  assert.equal(inward.positions[0], -outward.positions[0]);
  assert.equal(inward.positions[3 * 2], -outward.positions[3 * 2]);
  const zs = (geometry) => geometry.positions.filter((_, index) => index % 3 === 2);
  assert.ok(Math.min(...zs(inward)) > Math.max(...zs(outward)));
  const reverse = buildActivityTripGeometry([{ ...flow, cell: { ...cell, towardSign: -1 } }], sampleRoute);
  assert.deepEqual(reverse.positions, outward.positions);
});

test("lane offset rotates with the sampled tangent at bends", () => {
  const sampleBend = (point, offset) => ({ x: 0, z: point.z + offset, tangent: { x: 0, z: 1 } });
  const inward = buildActivityTripGeometry([flow], sampleBend);
  const xs = inward.positions.filter((_, index) => index % 3 === 0);
  assert.ok(xs.every((x) => Math.abs(x + TRIP_LANE_OFFSET) <= 0.650001));
});

test("empty, unclassified and dense flows remain bounded", () => {
  assert.deepEqual(buildActivityTripGeometry([], sampleRoute), { positions: [], progress: [] });
  assert.equal(buildActivityTripGeometry([{ ...flow, cell: { ...cell, towardSign: 0 } }], sampleRoute).positions.length, 0);
  assert.equal(buildActivityTripGeometry([{ ...flow, people: 1000 }], sampleRoute).progress.length, 72 * 6 * 3);
});
