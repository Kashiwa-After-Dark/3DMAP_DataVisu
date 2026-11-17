/**
 * ファイル概要: 明示された場所範囲名と工事エリアの表示分類を確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { placeRegionCode } from "../js/placeRegionNames.js";
import { appearanceRole, CONSTRUCTION_STYLE } from "../js/appearanceSettings.js";

test("range names use exact codes, never inferred meanings or arbitrary object names", () => {
  assert.equal(placeRegionCode("TR-01"), "TR-01");
  assert.equal(placeRegionCode(" tr-05 "), "TR-05");
  assert.equal(placeRegionCode("TR-01.001"), "TR-01");
  for (const value of ["0-tr-00", "Construction_Area", "Benches_TR-05", "TR-01-test", "TR-1", null]) assert.equal(placeRegionCode(value), null);
});
test("English names distinguish hidden range planes, buildings, floors and construction", () => {
  assert.equal(appearanceRole(["primitive", "TR-01"]), "region");
  assert.equal(appearanceRole(["", "place-region-overlay-TR-01"]), "region");
  assert.equal(appearanceRole(["primitive", "Construction_Area"]), "construction");
  assert.equal(appearanceRole(["primitive", "Kashiwa_Station"]), "context");
  assert.equal(appearanceRole(["primitive", "Sky_Plaza"]), "context");
  assert.equal(appearanceRole(["Deck_Floor"]), "floor");
  assert.equal(appearanceRole(["Benches_Area_A"]), "detail");
  assert.ok(CONSTRUCTION_STYLE.faceOpacity > 0 && CONSTRUCTION_STYLE.faceOpacity < 0.3);
  assert.ok(CONSTRUCTION_STYLE.edgeOpacity > CONSTRUCTION_STYLE.faceOpacity);
});
