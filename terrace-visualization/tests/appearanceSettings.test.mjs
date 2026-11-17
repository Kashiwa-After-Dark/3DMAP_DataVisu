/**
 * ファイル概要: テラスの表示専用スタイルが建物と設備を正しく区別することを確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CONTEXT_STYLE, appearanceRole } from "../js/appearanceSettings.js";

test("architecture is recognized through primitive ancestors, not material color", () => {
  assert.equal(appearanceRole(["primitive_1", "プラザ", "Scene"]), "context");
  assert.equal(appearanceRole(["primitive_2", "駅"]), "context");
  assert.equal(appearanceRole(["デッキ床"]), "floor");
  for (const name of ["ベンチ｜西側", "植栽｜小開口側", "点字ブロック", "階段｜中央開口・バス6", "デッキ手すり"]) assert.equal(appearanceRole([name]), "detail");
});
test("context faces are subtle and architectural edges exclude small facets", () => {
  assert.ok(CONTEXT_STYLE.faceOpacity >= 0.15 && CONTEXT_STYLE.faceOpacity <= 0.25);
  assert.ok(CONTEXT_STYLE.edgeOpacity > CONTEXT_STYLE.faceOpacity);
  assert.ok(CONTEXT_STYLE.edgeAngle >= 30);
  assert.ok(Object.isFrozen(CONTEXT_STYLE));
});
