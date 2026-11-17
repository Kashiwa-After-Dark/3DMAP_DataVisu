/**
 * ファイル概要: 保存済み方向を使い、推測で駅方向や場所コードを書き換えないことと道内の線分を確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { roadRepresentatives, roadSegmentCandidates } from "../js/roadPeopleModel.js";
import { selectTerraceObservations } from "../js/observationModel.js";

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

test("road paths stay in the supplied triangle and move monotonically away from station", () => {
  const triangle = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 10 }];
  const station = { x: 5, z: -1 };
  for (const [near, far] of roadSegmentCandidates(triangle, station)) {
    let distance = -1;
    for (let i = 0; i <= 100; i += 1) {
      const x = near.x + (far.x - near.x) * i / 100;
      const z = near.z + (far.z - near.z) * i / 100;
      assert.ok(x > 0 && z > 0 && x + z < 10);
      const next = Math.hypot(x - station.x, z - station.z);
      assert.ok(next + 1e-10 >= distance);
      distance = next;
    }
  }
});
