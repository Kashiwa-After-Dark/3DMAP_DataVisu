import test from "node:test";
import assert from "node:assert/strict";
import { buildSpecifiedRouteModel, ROUTE_COORDINATES } from "../time-space-graph/js/features/specifiedActivityRoute.js";
import { collectDirectionalFlows, HALF_HOUR_MS, getFlowPeriod } from "../time-space-graph/js/features/averageRouteModel.js";

const startTime = Date.parse("2026-10-23T18:00:00+09:00");
const project = ({ lat, lon }) => ({ x: (lon - 139.971) * 90000, z: (lat - 35.862) * -111000 });
const model = buildSpecifiedRouteModel({ project, station: { lat: 35.8623276, lon: 139.9710664 }, startTime, endTime: startTime + 12 * HALF_HOUR_MS });

test("specified route preserves all 18 coordinates in order and closes to the start", () => {
  const path = model.periods[0].path;
  assert.equal(ROUTE_COORDINATES.length, 18);
  assert.equal(path.length, 19);
  ROUTE_COORDINATES.forEach(([lat, lon], index) => assert.deepEqual(path[index], project({ lat, lon })));
  assert.deepEqual(path[0], project({ lat: 35.862324, lon: 139.971564 }));
  assert.deepEqual(path.at(-2), project({ lat: 35.862197, lon: 139.971607 }));
  assert.deepEqual(path.at(-1), path[0]);
});

test("all twelve half-hour layers share exactly the specified path", () => {
  assert.equal(model.periods.length, 12);
  for (const period of model.periods) {
    assert.equal(period.path, model.periods[0].path);
    assert.equal(period.end - period.start, HALF_HOUR_MS);
    for (const cell of period.cells.values()) assert.ok(Math.hypot(cell.b.x - cell.a.x, cell.b.z - cell.a.z) <= 14.001);
  }
  assert.equal(getFlowPeriod(model, startTime + 12 * HALF_HOUR_MS).index, 11);
});

test("directions attach to the specified route and respect filters and playback", () => {
  const period = model.periods[0];
  const cell = [...period.cells.values()].find((segment) => segment.towardSign);
  const memo = { time: startTime + 10000, world: cell.center, isPeople: true, hasLocation: true, motion: "walking", direction: "to_station", count: 1 };
  const options = { model, period, memos: [memo], currentTime: period.end, rangeStart: startTime };
  assert.equal(collectDirectionalFlows(options).flows[0].cell, cell);
  assert.equal(collectDirectionalFlows({ ...options, matches: () => false }).matchingRecords, 0);
  assert.equal(collectDirectionalFlows({ ...options, currentTime: startTime }).flows.length, 0);
});
