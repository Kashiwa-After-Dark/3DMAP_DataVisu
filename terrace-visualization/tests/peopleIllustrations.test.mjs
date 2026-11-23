/**
 * ファイル概要: 提供イラストの存在・コマ数と、元データを変更しない表示用の対応を確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PEOPLE_ILLUSTRATIONS, illustrationForRecord } from "../js/peopleIllustrations.js";
import { benchRepresentatives, representativePeople } from "../js/peopleDemoModel.js";

test("bench seat demos use saved bench meanings and are limited to matching observations", () => {
  const couple = { placeCodes: ["TR-05"], placeMeanings: [{ code: "TR-05", meaning: "ベンチ" }], groupType: "couple", motion: "sitting" };
  const other = { ...couple, placeMeanings: [{ code: "TR-05", meaning: "テラス" }] };
  const student = { ...couple, groupType: "GG", age: "high_school", gender: "female", activity: "会話" };
  assert.deepEqual(benchRepresentatives([couple, other, student, couple]).map(({ illustration }) => illustration),
    ["bench-couple", "bench-jk", "bench-couple"]);
  assert.deepEqual(benchRepresentatives([other]), []);
});

test("all seven supplied illustrations have valid local PNG frames", () => {
  assert.equal(Object.keys(PEOPLE_ILLUSTRATIONS).length, 7);
  let files = 0;
  for (const [key, asset] of Object.entries(PEOPLE_ILLUSTRATIONS)) {
    const animated = ["skate", "walk", "jk-dance"].includes(key);
    assert.equal(asset.frames.length, animated ? 8 : 1);
    assert.equal(asset.fps > 0, animated || Boolean(asset.tiles));
    assert.ok(asset.aspect > 0);
    for (const path of asset.frames) {
      const bytes = readFileSync(new URL(path, new URL("../js/peopleIllustrations.js", import.meta.url)));
      assert.equal(bytes.toString("ascii", 1, 4), "PNG");
      assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
      files += 1;
    }
  }
  assert.equal(files, 28);
});

test("seated school groups require matching age, gender, group and bench", () => {
  const girl = { age: "high_school", gender: "female", groupType: "GG", motion: "sitting", activity: "雑談", count: 2 };
  assert.equal(illustrationForRecord(girl, "TR-05"), "bench-jk");
  assert.equal(illustrationForRecord({ ...girl, gender: "male", groupType: "BG" }, "TR-05"), "bench-dk");
  assert.equal(illustrationForRecord({ ...girl, age: "university" }, "TR-05"), null);
  assert.equal(illustrationForRecord({ ...girl, motion: "standing" }, "TR-05"), null);
  assert.equal(illustrationForRecord(girl, "TR-09"), null);
  assert.equal(illustrationForRecord({ ...girl, groupType: "G", count: 1 }, "TR-05"), null);
});

test("couple, filming and skateboard artworks use explicit corresponding records", () => {
  assert.equal(illustrationForRecord({ groupType: "couple", motion: "sitting" }, "TR-05"), "bench-couple");
  assert.equal(illustrationForRecord({ groupType: "XG", motion: "sitting" }, "TR-05"), null);
  const filming = { activity: "TikTokとってる", age: "high_school", gender: "female", groupType: "GG" };
  assert.equal(illustrationForRecord(filming, "TR-06"), "jk-dance");
  assert.equal(illustrationForRecord({ ...filming, age: "unknown" }, "TR-06"), null);
  assert.equal(illustrationForRecord({ activity: "スケボーしてる" }, "TR-09"), "skate");
  assert.equal(illustrationForRecord({ activity: "スケボーを見ている" }, "TR-09"), null);
});

test("bench artwork families do not disappear into a shared action label", () => {
  const common = { placeCodes: ["TR-05"], activity: "雑談", motion: "sitting", age: "high_school", count: 2 };
  const records = [
    { ...common, gender: "female", groupType: "GG" },
    { ...common, gender: "male", groupType: "BG" },
    { ...common, age: "university", groupType: "couple" },
  ];
  const before = JSON.stringify(records);
  const people = representativePeople(records, ["TR-05"]);
  assert.equal(people.length, 3);
  assert.deepEqual(new Set(people.map((p) => p.illustration)), new Set(["bench-jk", "bench-dk", "bench-couple"]));
  assert.equal(JSON.stringify(records), before);
});

test("staying couples get a representative outside the bench area, but moving couples do not", () => {
  const couple = { placeCodes: ["TR-07"], groupType: "CP", motion: "standing", activity: "" };
  assert.equal(illustrationForRecord(couple, "TR-07"), "bench-couple");
  assert.equal(illustrationForRecord({ ...couple, motion: "standing|walking" }, "TR-07"), null);
  assert.equal(illustrationForRecord({ ...couple, direction: "to_station" }, "TR-07"), null);
  const people = representativePeople([couple, { ...couple, activity: "雑談" }], ["TR-07"]);
  assert.equal(people.length, 1);
  assert.equal(people[0].count, 2);
  assert.equal(people[0].motion, "idle");
});
