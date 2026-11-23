/**
 * ファイル概要: 保存済み方向を使い、推測で駅方向や場所コードを書き換えないことと道内の線分を確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { roadRepresentatives, routeBetweenEdges } from "../js/roadPeopleModel.js";
import { selectTerraceObservations } from "../js/observationModel.js";
import { streamlineRoad, offsetRoad } from "../js/roadPeopleTrajectories.js";

test("shortens an unnecessary turnaround and preserves the entrances", () => {
  const points = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 2 }];
  assert.deepEqual(streamlineRoad(points, () => true), [points[0], points.at(-1)]);
});

test("walkers vary smoothly without changing their entrance points", () => {
  const points = Array.from({ length: 101 }, (_, i) => ({ x: i / 10, z: 0 }));
  const a = offsetRoad(points, 1, 0.19), b = offsetRoad(points, 2, 0.19);
  assert.notDeepEqual(a, b);
  assert.deepEqual([a[0], a.at(-1)], [points[0], points.at(-1)]);
  assert.ok(a.every((p, i) => Math.abs(p.z) <= 0.19 && (!i || Math.abs(p.z - a[i - 1].z) < 0.02)));
});

test("walking variation is exactly zero in a fixed-width section", () => {
  const points = Array.from({ length: 101 }, (_, i) => ({ x: i / 10, z: 0 }));
  const varied = offsetRoad(points, 5, 0.78, ({ x }) => x >= 4 && x <= 6 ? 0 : 1);
  assert.deepEqual(varied.slice(40, 61), points.slice(40, 61));
  assert.notDeepEqual(varied.slice(10, 30), points.slice(10, 30));
});

test("terrace conversion preserves saved direction and motion verbatim", () => {
  const input = [{ observationId: "one", time: "2026-10-23T19:00:00+09:00", placeCodes: ["TR-00"], direction: "to_station", motion: "standing|walking" }, { observationId: "two", time: "2026-10-23T20:00:00+09:00", placeCodes: ["TR-09"], activity: "駅へ向かう" }];
  const result = selectTerraceObservations(input, "2026-10-23");
  assert.equal(result.records[0].direction, "to_station");
  assert.equal(result.records[0].motion, "standing|walking");
  assert.equal(result.records[1].direction, null);
  assert.deepEqual(result.records[0].placeCodes, ["TR-00"]);
});

test("only explicit station directions and recorded movement feed the road demo", () => {
  const records = [
    { placeCodes: ["TR-00"], direction: "to_station", motion: "walking" },
    { placeCodes: ["TR-01"], direction: "from_station", motion: "running" },
    { placeCodes: ["TR-05"], direction: "to_station", motion: "standing|walking" },
    { placeCodes: ["TR-09"], direction: "mixed", motion: "walking" },
    { placeCodes: ["TR-09"], direction: null, motion: "walking", activity: "駅へ向かう" },
    { placeCodes: ["TR-09"], direction: "to_station", motion: "standing" },
    { placeCodes: ["TR-09"], direction: "to_station", motion: "walking", isObject: true },
  ];
  const before = JSON.stringify(records);
  const flows = roadRepresentatives(records, ["TR-02"]);
  assert.deepEqual(flows.map((f) => [f.direction, f.count]), [["to_station", 2], ["from_station", 1]]);
  assert.deepEqual(flows[0].sourceCodes, ["TR-00", "TR-05"]);
  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(roadRepresentatives(records, []), []);
  assert.deepEqual(roadRepresentatives([], ["TR-02"]), []);
});

test("road paths join terminal edges through connected faces and never cross blocked sections", () => {
  const [a, b, c, d] = [[0, 0], [2, 0], [0, 2], [2, 2]].map(([x, z]) => ({ x, z }));
  const triangles = [{ points: [a, b, c] }, { points: [b, c, d] }];
  const station = { x: 1, z: 0 }, exit = { x: 1, z: 2 };
  assert.deepEqual(routeBetweenEdges(triangles, station, [exit], () => true), [station, { x: 1, z: 1 }, exit]);
  assert.equal(routeBetweenEdges(triangles, station, [exit], (a, b) => a.z < 2 && b.z < 2), null);
  assert.equal(routeBetweenEdges(triangles, station, [{ x: 1, z: 1 }], () => true), null);
});
