/** ファイル概要: 抗議デモの観察だけを表示対象にし、使用するコマ画像の寸法を確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTerraceProtest } from "../js/protestObservation.js";
import { representativePeople } from "../js/peopleDemoModel.js";
import { selectTerraceObservations, filterTerraceObservations } from "../js/observationModel.js";

test("only TR-03 people with the exact tag produce the protest figure in their time period", () => {
  const record = { time: "2026-10-23T18:09:00+09:00", placeCodes: ["TR-03"], recordType: "people", personTags: ["抗議活動"] };
  assert.equal(isTerraceProtest(record, "TR-03"), true);
  assert.equal(isTerraceProtest(record, "TR-00"), false);
  assert.equal(isTerraceProtest({ ...record, isObject: true }, "TR-03"), false);
  const { records } = selectTerraceObservations([record, { ...record, activity: "演説", personTags: ["集団"] }], "2026-10-23");
  const people = (period) => representativePeople(filterTerraceObservations(records, period), ["TR-03"]);
  assert.deepEqual(people("0").map(({ illustration, count }) => [illustration, count]), [["protest", 1], [null, 1]]);
  assert.deepEqual(representativePeople(records.filter((row) => row.personTags.includes("抗議活動")), ["TR-03"]).map(({ illustration }) => illustration), ["protest"]);
  assert.deepEqual(people("1"), []);
});

test("the provided sprite sheet has two columns and two rows of 768 by 512 poses", () => {
  const png = readFileSync(new URL("../assets/people/protest/v4-sprite-sheet.png", import.meta.url));
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.equal(png.readUInt32BE(16), 1536);
  assert.equal(png.readUInt32BE(20), 1024);
});
