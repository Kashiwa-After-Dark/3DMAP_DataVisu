/**
 * ファイル概要: 旧スタイルの切替UIと参照を残さず、ゲーム風を初期適用することを確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("appearance selector and obsolete toolbar dependency are removed", () => {
  assert.doesNotMatch(read("../index.html"), /data-appearance|appearance-switch|立体＋輪郭|元の模型/u);
  assert.doesNotMatch(read("../js/toolbar.js"), /data-appearance|setAppearance/u);
  assert.doesNotMatch(read("../style.css"), /appearance-switch/u);
});
test("game grading is initialized directly, without alternate mode state", () => {
  const view = read("../js/mapView.js");
  assert.match(view, /canvas\.style\.filter = GAME_STYLE\.filter/u);
  assert.match(view, /renderer\.toneMappingExposure = GAME_STYLE\.exposure/u);
  assert.doesNotMatch(view, /hybrid|setAppearance/u);
  assert.doesNotMatch(read("../js/modelAppearance.js"), /setMode|setAppearance|hybrid/u);
});
