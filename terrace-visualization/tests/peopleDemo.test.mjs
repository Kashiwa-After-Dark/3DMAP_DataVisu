/**
 * ファイル概要: 模式的人型の選択、元データの保持、範囲三角形から出ない経路を確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { representativePeople, triangleMotion, motionForActivity } from "../js/peopleDemoModel.js";

test("representatives preserve raw action wording and never use counts as avatar numbers", () => {
  const records = [
    { placeCodes: ["TR-09", "TR-09"], activity: "雑談", count: 20 },
    { placeCodes: ["TR-09"], activity: "雑談", count: 10 },
    { placeCodes: ["TR-09"], activity: "スケボーしてる", count: 50 },
    { placeCodes: ["TR-09"], activity: "スマホ見てる", count: 10 },
    { placeCodes: ["TR-09"], activity: "スケボーしてる", isObject: true },
    { placeCodes: ["TR-00"], activity: "雑談" },
  ];
  const before = JSON.stringify(records);
  const people = representativePeople(records, ["TR-09"]);
  assert.equal(people.length, 2);
  assert.deepEqual(people.map((p) => [p.label, p.count]), [["雑談", 2], ["スケボーしてる", 1]]);
  assert.equal(people[1].motion, "skate");
  assert.equal(JSON.stringify(records), before);
});
test("missing regions, blank actions and objects never fabricate people", () => {
  assert.deepEqual(representativePeople([{ placeCodes: ["TR-00"], activity: "雑談" }, { placeCodes: ["TR-09"], activity: " " }, { placeCodes: ["TR-09"], activity: "雑談", isObject: true }], ["TR-09"]), []);
  assert.equal(motionForActivity("スケボーを見ている"), "idle");
  assert.equal(motionForActivity("不明な行動"), "idle");
  assert.equal(motionForActivity("TikTokを撮っている"), "phone");
});
test("all animation phases remain strictly inside their supplied triangle", () => {
  const triangle = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 10 }];
  for (let i = 0; i < 1000; i += 1) {
    const p = triangleMotion(triangle, i * 0.1);
    assert.ok(p.x > 0 && p.z > 0 && p.x + p.z < 10);
  }
  const start = triangleMotion(triangle, 0);
  const end = triangleMotion(triangle, Math.PI * 2);
  assert.ok(Math.hypot(start.x - end.x, start.z - end.z) < 1e-10);
  assert.deepEqual(triangleMotion(triangle, 0, false), triangleMotion(triangle, 9, false));
});
