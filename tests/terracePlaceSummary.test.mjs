/**
 * ファイル概要: テラス場所コード別集計を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildPlaceCatalog, summarizePlaces, formatPlaceNames } from "../terrace-visualization/js/placeSummaryModel.js";

const records = [
  { id: "a", placeCodes: ["TR-05"], placeMeanings: [{ code: "TR-05", meaning: "ベンチ" }], period: 0, hasLocation: true, count: 20 },
  { id: "b", placeCodes: ["TR-04", "TR-05", "TR-05"], placeMeanings: [{ code: "TR-04", meaning: "モニター前" }], period: 1, hasLocation: false },
  { id: "c", placeCodes: ["TR-04"], placeMeanings: [], period: 2, hasLocation: true },
];
test("catalog is keyed by code, uses API meanings and has stable colors", () => {
  const catalog = buildPlaceCatalog(records);
  assert.deepEqual(catalog.map((place) => place.code), ["TR-04", "TR-05"]);
  assert.deepEqual(catalog.map((place) => place.label), ["モニター前", "ベンチ"]);
  assert.deepEqual(buildPlaceCatalog([...records].reverse()), catalog);
  assert.equal(formatPlaceNames(records[1], catalog), "モニター前 / ベンチ");
});
test("summary counts observations, not people, and includes missing coordinates", () => {
  const catalog = buildPlaceCatalog(records);
  const rows = summarizePlaces(records, catalog);
  assert.deepEqual(rows.map((row) => row.total), [2, 2]);
  assert.deepEqual(rows.map((row) => row.periods), [[0, 1, 1], [1, 1, 0]]);
  assert.deepEqual(rows.map((row) => row.unplaced), [1, 1]);
});
test("time filters retain every place with explicit zero counts", () => {
  const rows = summarizePlaces(records, buildPlaceCatalog(records), "0");
  assert.deepEqual(rows.map((row) => [row.code, row.total]), [["TR-05", 1], ["TR-04", 0]]);
  assert.deepEqual(rows[0].periods, [1, 0, 0]);
});
test("identical meanings never merge different place codes", () => {
  const catalog = buildPlaceCatalog([{ placeCodes: ["TR-A", "TR-B", "TR-C"], placeMeanings: [{ code: "TR-A", meaning: "ベンチ" }, { code: "TR-B", meaning: "ベンチ" }] }]);
  assert.equal(catalog.length, 3);
  assert.deepEqual(catalog.map((place) => place.label), ["ベンチ（TR-A）", "ベンチ（TR-B）", "意味名未登録（TR-C）"]);
  assert.deepEqual(summarizePlaces([], catalog).map((row) => row.total), [0, 0, 0]);
});
test("activity summaries preserve source wording and do not multiply multi-code duplicates", () => {
  const records = [
    { placeCodes: ["TR-01", "TR-01"], period: 0, hasLocation: true, activity: " 雑談 " },
    { placeCodes: ["TR-01"], period: 1, hasLocation: true, activity: "雑談" },
    { placeCodes: ["TR-01"], period: 2, hasLocation: true, activity: "スマホ見てる" },
  ];
  const [row] = summarizePlaces(records, buildPlaceCatalog(records));
  assert.deepEqual(row.activities, [{ label: "雑談", count: 2 }, { label: "スマホ見てる", count: 1 }]);
  assert.deepEqual(summarizePlaces(records, buildPlaceCatalog(records), "2")[0].activities, [{ label: "スマホ見てる", count: 1 }]);
});
