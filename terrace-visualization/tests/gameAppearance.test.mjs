/**
 * ファイル概要: ゲーム風表示の色調と霞が極端な暗さや固定スケールにならないことを確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { GAME_STYLE, gameFogRange } from "../js/gameAppearance.js";

test("game grading retains color and readable exposure without blur", () => {
  assert.ok(GAME_STYLE.exposure >= 1);
  assert.match(GAME_STYLE.filter, /saturate\(0\.[7-9]/u);
  assert.doesNotMatch(GAME_STYLE.filter, /blur|brightness|grayscale/u);
  assert.ok(GAME_STYLE.fillIntensity > 1);
});

test("atmospheric depth scales with the model and handles invalid bounds", () => {
  assert.deepEqual(gameFogRange(10), { near: 30, far: 100 });
  for (const radius of [0, -1, NaN, Infinity]) {
    const range = gameFogRange(radius);
    assert.ok(Number.isFinite(range.near) && range.near > 0);
    assert.ok(range.far > range.near);
  }
});
