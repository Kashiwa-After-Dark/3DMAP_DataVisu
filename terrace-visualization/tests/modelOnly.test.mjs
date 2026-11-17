/** ファイル概要: 模型専用起動、表示切替、50%遮蔽の境界を確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hideStationForCoverage } from "../js/occlusionRule.js";

test("station remains visible below half and hides at half or more", () => {
  assert.equal(hideStationForCoverage(49, 100), false);
  assert.equal(hideStationForCoverage(50, 100), true);
  assert.equal(hideStationForCoverage(100, 100), true);
  assert.equal(hideStationForCoverage(0, 0), false);
  assert.equal(hideStationForCoverage(NaN, 100), false);
});
test("model-only startup leaves APIs and functional containers dormant", async () => {
  const js = await readFile(new URL("../js/modelOnly.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(js, /loadTerraceObservations|createPeopleDemo|createStationContext|createStationMonitor|bindToolbar/);
  assert.match(js, /stationOcclusion: true/);
  assert.match(html, /class="model-only"/);
  assert.match(html, /data-map-view="3d"/);
  assert.match(html, /data-map-view="2d"/);
  assert.match(html, /aria-label="サンキー図（準備中）"[^>]*disabled/);
  assert.match(html, /src="\.\/js\/modelOnly.js/);
});

test("independent route-history and statistics links precede the view switch", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="model-mode-tools"/);
  assert.ok(html.indexOf('class="model-screen-navigation"') < html.indexOf('class="model-view-switch"'));
  assert.match(html, /href="\.\.\/space-time-cube\/" aria-label="ルートヒストリー"/);
  assert.doesNotMatch(html, /aria-current="page"/);
  assert.match(html, /href="\.\.\/statistics\/" aria-label="統計"/);
  await readFile(new URL("../../statistics/index.html", import.meta.url));
});
