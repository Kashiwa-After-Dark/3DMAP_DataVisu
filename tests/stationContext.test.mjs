/**
 * ファイル概要: 調査日固有の駅周辺補足情報を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { getStationContext } from "../terrace-visualization/js/stationContextData.js";
import { projectLocation } from "../terrace-visualization/js/geoProjection.js";

test("station context is date-specific with no historical fallback", () => {
  assert.equal(getStationContext("2026-07-07"), null);
  assert.equal(getStationContext("2026-10-24"), null);
  assert.equal(getStationContext("2026-10-23").date, "2026-10-23");
});
test("weather contains the entire observation period and railway delay caveat", () => {
  const data = getStationContext("2026-10-23");
  assert.deepEqual(data.weather.hours.map(({ hour }) => hour), [18, 19, 20, 21, 22, 23, 24]);
  assert.equal(Math.min(...data.weather.hours.map(({ temperature }) => temperature)), 15.8);
  assert.equal(Math.max(...data.weather.hours.map(({ temperature }) => temperature)), 16.4);
  assert.ok(data.weather.hours.every(({ precipitation }) => precipitation === 0));
  assert.match(data.operation[0].text, /5〜10分/);
  assert.match(data.operationNote, /完全な定時運行を保証しません/);
});
test("map projection retains the observation calibration", () => {
  assert.deepEqual(projectLocation({ lat: 35.86183529140233, lon: 139.97190479462844 }), { x: 0, z: -0 });
  const point = projectLocation(getStationContext("2026-10-23").station);
  assert.ok(point.x < -70 && point.x > -80);
  assert.ok(point.z < -50 && point.z > -60);
});
