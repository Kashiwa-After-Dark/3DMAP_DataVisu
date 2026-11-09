import test from "node:test";
import assert from "node:assert/strict";
import { getPlaceCode, getPlaceCodes, selectTerraceObservations, filterTerraceObservations, observationPeriod } from "../terrace-map/js/observationModel.js";

const date = "2026-10-23";
const record = { observationId: "a", time: "2026-10-23T18:10:00+09:00", sourceFilename: "people.csv", placeCode: "TR-01", lat: 35.862, lon: 139.972, subject: "会話する人", activity: "会話", recordType: "people", countMin: 2 };

test("TR codes normalize case, whitespace and full-width characters", () => {
  assert.equal(getPlaceCode({ placeCode: " ｔｒ－０１ " }), "TR-01");
  assert.equal(getPlaceCode({ location_code: " tr02 " }), "TR02");
  assert.equal(getPlaceCode({ original: { place_code: "TR_03" } }), "TR_03");
  assert.equal(getPlaceCode({ place: { code: "TR04" } }), "TR04");
  assert.equal(getPlaceCode({ place: "TR05 ベンチ" }), "TR05");
});

test("Japanese place names and codes mentioned in unrelated prose never count as terrace codes", () => {
  const data = selectTerraceObservations([
    { ...record, placeCode: "RS-01", place: "テラス" },
    { ...record, placeCode: "", place: "テラスベンチ付近", desc: "TR01の説明" },
    { ...record, placeCode: "", place: "" },
  ], date);
  assert.equal(data.records.length, 0);
  assert.equal(data.eligible, 3);
  assert.equal(data.coded, 1);
  assert.equal(getPlaceCode({ placeCode: "RS01", place: "TR01" }), "RS01");
});

test("only the configured survey date and approved sources are included", () => {
  const data = selectTerraceObservations([
    record,
    { ...record, time: "2026-07-07T18:00:00+09:00" },
    { ...record, time: "2026-10-24T00:00:00+09:00" },
    { ...record, time: "invalid" },
    { ...record, sourceFilename: "other.csv" },
  ], date, (item) => item.sourceFilename === "people.csv");
  assert.equal(data.records.length, 1);
  assert.equal(data.eligible, 1);
});

test("missing and invalid coordinates stay in the list without fabricated positions", () => {
  const data = selectTerraceObservations([
    { ...record, observationId: "missing", lat: null, lon: null },
    { ...record, observationId: "empty", lat: "", lon: "" },
    { ...record, observationId: "invalid", lat: 91, lon: 0 },
    { ...record, observationId: "valid", lat: "35.862", lon: "139.972" },
  ], date);
  assert.equal(data.records.length, 4);
  assert.equal(data.withLocation, 1);
  assert.ok(data.records.filter((item) => !item.hasLocation).every((item) => item.lat === null && item.lon === null));
});

test("people and objects are both retained with time-period and code filters", () => {
  const data = selectTerraceObservations([
    { ...record, observationId: "later", time: "2026-10-23T22:30:00+09:00", placeCode: "TR02", recordType: "objects", objectName: "ベンチ", subject: "", qty: 1 },
    record,
    { ...record, observationId: "middle", time: "2026-10-23T20:00:00+09:00", placeCode: "TR02" },
  ], date);
  assert.equal(data.records[0].id, "a");
  assert.equal(filterTerraceObservations(data.records).length, 3);
  assert.equal(filterTerraceObservations(data.records, "1", "TR02")[0].id, "middle");
  assert.equal(filterTerraceObservations(data.records, "all", "TR02").length, 2);
  assert.equal(filterTerraceObservations(data.records, "2")[0].isObject, true);
  assert.equal(filterTerraceObservations(data.records, "2")[0].count, 1);
  assert.equal(observationPeriod(Date.parse("2026-10-23T19:59:59+09:00")), 0);
  assert.equal(observationPeriod(Date.parse("2026-10-23T22:00:00+09:00")), 2);
  assert.equal(observationPeriod(Date.parse("2026-10-23T17:59:59+09:00")), -1);
  assert.deepEqual(selectTerraceObservations([], date).records, []);
});

test("published placeCodes arrays are authoritative and multi-code observations are not duplicated", () => {
  const data = selectTerraceObservations([
    { ...record, placeCodes: ["RS01", "tr-04", "TR-05", "TR-04"], placeMeanings: [{ code: "TR-04", meaning: "モニター前" }, { code: "RS01", meaning: "対象外" }] },
    { ...record, observationId: "uncoded", placeCodes: [], place: "TR-01", placeCode: "TR-01" },
    { ...record, observationId: "non-terrace", placeCodes: ["RS01"], placeCode: "TR-01" },
  ], date);
  assert.equal(data.records.length, 1);
  assert.deepEqual(data.records[0].placeCodes, ["TR-04", "TR-05"]);
  assert.equal(filterTerraceObservations(data.records, "all", "TR-05").length, 1);
  assert.equal(data.records[0].placeMeanings.length, 1);
  assert.deepEqual(getPlaceCodes({ placeCodes: ["ＴＲ－０４", "TR-04", null] }), ["TR-04"]);
});
