/**
 * ファイル概要: 駅・プラザの各側で独立して隠し、境界や縮退位置で誤判定しないことを確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { shouldHideBuilding } from "../js/contextVisibility.js";

const deck = { x: 10, z: 20 };
const plaza = { x: 10, z: 30 };
test("plaza is hidden from its side and restored from the opposite side", () => {
  assert.equal(shouldHideBuilding({ x: 10, z: 40 }, deck, plaza), true);
  assert.equal(shouldHideBuilding({ x: 10, z: 0 }, deck, plaza, true), false);
  assert.equal(shouldHideBuilding({ x: 30, z: 20 }, deck, plaza), false);
});
test("side boundary has hysteresis rather than flickering", () => {
  const camera = { x: 20, z: 21 };
  assert.equal(shouldHideBuilding(camera, deck, plaza, false), false);
  assert.equal(shouldHideBuilding(camera, deck, plaza, true), true);
});
test("degenerate positions never hide the plaza", () => {
  assert.equal(shouldHideBuilding(deck, deck, plaza), false);
  assert.equal(shouldHideBuilding(plaza, deck, deck), false);
  assert.equal(shouldHideBuilding({ x: NaN, z: 0 }, deck, plaza), false);
});
test("station and plaza hide independently on opposite sides", () => {
  const station = { x: 10, z: 10 };
  const camera = { x: 10, z: 0 };
  assert.equal(shouldHideBuilding(camera, deck, station), true);
  assert.equal(shouldHideBuilding(camera, deck, plaza), false);
  assert.equal(shouldHideBuilding({ x: 10, z: 40 }, deck, station, true), false);
});
