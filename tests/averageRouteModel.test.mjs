/**
 * ファイル概要: 代表ルートの外れ値除外と時間帯処理を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildAverageRouteModel, collectDirectionalFlows, getFlowPeriod, HALF_HOUR_MS, robustMean } from "../space-time-cube/js/movement-visualization/average-route-model.js";

const startTime = Date.parse("2026-10-23T18:00:00+09:00");
const project = ({ lon, lat }) => ({ x: lon, z: lat });
const makeTrack = (offset, step = 10) => ({ points: Array.from({ length: 30 / step + 1 }, (_, index) => ({ lon: index * step, lat: offset, time: startTime + index * step * 1000 })) });
const makeModel = (tracks = [makeTrack(0)]) => buildAverageRouteModel({
  tracks, roads: [["street", [[0, 0], [30, 0]]]], project, station: { lon: 0, lat: 0 }, startTime, endTime: startTime + 12 * HALF_HOUR_MS,
});
const makeMemo = (overrides = {}) => ({
  id: "one", time: startTime + 10000, world: { x: 10, z: 0 }, isPeople: true, hasLocation: true,
  direction: "to_station", motion: "walking", count: 2, ...overrides,
});

test("median/MAD rejects an isolated spatial outlier", () => {
  assert.deepEqual(robustMean([0, 1, 23]), { mean: 0.5, kept: 2, rejected: 1 });
  const period = makeModel([makeTrack(0), makeTrack(1), makeTrack(23)]).periods[0];
  for (const cell of period.cells.values()) {
    assert.equal(cell.contributors, 2);
    assert.ok(Math.abs(cell.offset - 0.5) < 0.01);
  }
});

test("dense sampling cannot outweigh another recorder", () => {
  const period = makeModel([makeTrack(0, 1), makeTrack(4, 10)]).periods[0];
  for (const cell of period.cells.values()) assert.ok(Math.abs(cell.offset - 2) < 0.01);
});

test("GPS jumps and long missing intervals are never connected", () => {
  for (const points of [
    [{ lon: 0, lat: 0, time: startTime }, { lon: 1000, lat: 0, time: startTime + 1000 }],
    [{ lon: 0, lat: 0, time: startTime }, { lon: 20, lat: 0, time: startTime + 300000 }],
  ]) assert.equal(makeModel([{ points }]).periods[0].cells.size, 0);
});

test("all twelve half-hour windows have unambiguous boundaries", () => {
  const model = makeModel();
  assert.equal(model.periods.length, 12);
  assert.equal(getFlowPeriod(model, startTime + HALF_HOUR_MS - 1).index, 0);
  assert.equal(getFlowPeriod(model, startTime + HALF_HOUR_MS).index, 1);
  assert.equal(getFlowPeriod(model, model.endTime).index, 11);
});

test("direction comes only from observations, follows the road, and respects time and filters", () => {
  const model = makeModel();
  const period = model.periods[0];
  const memos = [
    makeMemo(), makeMemo({ direction: "from_station", motion: "running" }),
    makeMemo({ direction: null }), makeMemo({ direction: "mixed" }),
    makeMemo({ hasLocation: false, world: null }), makeMemo({ motion: "standing" }),
    makeMemo({ time: startTime + 20000 }),
    makeMemo({ id: "excluded" }),
  ];
  const result = collectDirectionalFlows({ model, period, memos, currentTime: startTime + 15000, rangeStart: startTime, matches: (memo) => memo.id !== "excluded" });
  assert.equal(result.flows.length, 2);
  assert.equal(result.unmatched, 1);
  assert.equal(result.flows[0].cell.towardSign, -1);
  assert.equal(result.flows[1].direction, "from_station");
  assert.equal(result.flows[1].motion, "running");
  assert.equal(collectDirectionalFlows({ model, period, memos, currentTime: startTime + 5000, rangeStart: startTime }).flows.length, 0);
  assert.equal(collectDirectionalFlows({ model, period, memos, currentTime: startTime + 15000, rangeStart: startTime + 12000 }).flows.length, 0);
});

test("a single available track is retained as a single contributor", () => {
  for (const cell of makeModel().periods[0].cells.values()) assert.equal(cell.contributors, 1);
});

test("each half-hour produces exactly one continuous ordered path", () => {
  const tracks = Array.from({ length: 12 }, (_, index) => ({ points: makeTrack(0).points.map((point) => ({ ...point, time: point.time + index * HALF_HOUR_MS })) }));
  const model = makeModel(tracks);
  for (const period of model.periods) {
    assert.ok(period.path.length > 1);
    assert.ok(period.routeCells.size > 0);
    for (let index = 1; index < period.path.length; index += 1) {
      assert.ok(Math.hypot(period.path[index].x - period.path[index - 1].x, period.path[index].z - period.path[index - 1].z) <= 14.01);
    }
  }
});

test("continuous path follows a road corner instead of a diagonal shortcut", () => {
  const coordinates = [[0, 0], [30, 0], [30, 30]];
  const model = buildAverageRouteModel({
    tracks: [{ points: coordinates.map(([lon, lat], index) => ({ lon, lat, time: startTime + index * 10000 })) }],
    roads: [["corner", coordinates]], project, station: { lon: 0, lat: 0 }, startTime, endTime: startTime + HALF_HOUR_MS,
  });
  const path = model.periods[0].path;
  assert.ok(path.some((point) => point.x === 30 && point.z === 0));
  for (let index = 1; index < path.length; index += 1) {
    assert.ok(path[index].x === path[index - 1].x || path[index].z === path[index - 1].z);
  }
});

test("repeated laps reduce to a single main traversal", () => {
  const lap = [[0, 0], [30, 0], [30, 30], [0, 30], [0, 0]];
  const coordinates = [...lap, ...lap.slice(1)];
  const model = buildAverageRouteModel({
    tracks: [{ points: coordinates.map(([lon, lat], index) => ({ lon, lat, time: startTime + index * 10000 })) }],
    roads: [["loop", lap]], project, station: { lon: 0, lat: 0 }, startTime, endTime: startTime + HALF_HOUR_MS,
  });
  const path = model.periods[0].path;
  const keys = path.map((point) => `${point.x},${point.z}`);
  assert.ok(path.length > 4);
  assert.equal(new Set(keys.slice(0, -1)).size, keys.length - 1);
  assert.equal(keys[0], keys.at(-1));
});
