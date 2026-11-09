import test from "node:test";
import assert from "node:assert/strict";
import { collectStationDirections, directionSymbols } from "../time-space-graph/js/features/stationDirectionModel.js";

const cell = { id: "road", a: { x: 0, z: 0 }, b: { x: 100, z: 0 }, center: { x: 50, z: 0 }, tangent: { x: 1, z: 0 }, normal: { x: 0, z: 1 }, towardSign: 1 };
const period = { start: 0, end: 1800000, cells: new Map([[cell.id, cell]]) };
const memo = { isPeople: true, time: 1000, count: 3, hasLocation: true, world: { x: 50, z: 0 }, direction: "to_station" };
const collect = (memos, extra = {}) => collectStationDirections({ period, memos, currentTime: 1800000, rangeStart: 0, ...extra });

test("direction counts do not require an inferred walking classification", () => {
  const result = collect([memo, { ...memo, count: 4, direction: "from_station" }]);
  assert.equal(result.totals.to_station, 3);
  assert.equal(result.totals.from_station, 4);
  assert.equal(result.flows.length, 2);
});

test("missing and distant positions remain in totals but are explicitly unplaced", () => {
  const result = collect([memo, { ...memo, hasLocation: false }, { ...memo, world: { x: 50, z: 100 } }]);
  assert.equal(result.totals.to_station, 9);
  assert.equal(result.totals.unplaced, 6);
  assert.equal(result.flows[0].people, 3);
});

test("period boundaries, time range, people flag and filters are respected", () => {
  const memos = [memo, { ...memo, time: 0 }, { ...memo, time: period.end }, { ...memo, time: 1600 }, { ...memo, isPeople: false }];
  assert.equal(collect(memos, { rangeStart: 500, currentTime: 1500 }).records, 1);
  assert.equal(collect(memos, { matches: () => false }).records, 0);
});

test("stationary use and unknown movement are separated without inventing directions", () => {
  const result = collect([{ ...memo, direction: null, motion: "walking" }, { ...memo, direction: null, motion: "", activity: "休憩" }]);
  assert.equal(result.totals.unknown, 3);
  assert.equal(result.totals.stationary, 3);
  assert.equal(result.stationary.length, 1);
  assert.equal(result.flows.length, 0);
});

test("direction symbols are bounded and never modify the actual observation totals", () => {
  const result = collect([{ ...memo, count: 100 }, { ...memo, count: 2, direction: "from_station" }]);
  assert.deepEqual(directionSymbols(result.flows).map((flow) => flow.people), [3, 2]);
  assert.equal(directionSymbols(result.flows, "from_station").length, 1);
  assert.equal(result.totals.to_station, 100);
});
