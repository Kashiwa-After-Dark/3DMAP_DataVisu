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
test("focused model startup adds the period-filtered people demo without opening legacy panels", async () => {
  const js = await readFile(new URL("../js/modelOnly.js", import.meta.url), "utf8");
  const controls = await readFile(new URL("../js/peoplePeriodControls.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(js, /createPeopleDemo/);
  assert.match(js, /createPlaceRegionRings/);
  assert.match(js, /bindPeoplePeriodControls/);
  assert.match(controls, /loadTerraceObservations/);
  assert.match(controls, /filterTerraceObservations/);
  assert.doesNotMatch(js, /createStationContext|createStationMonitor|bindToolbar/);
  assert.match(js, /stationOcclusion: true/);
  assert.match(html, /class="model-only"/);
  assert.match(html, /data-map-view="3d"/);
  assert.match(html, /data-map-view="2d"/);
  for (const period of ["0", "1", "2"]) assert.match(html, new RegExp(`data-people-period="${period}"`));
  assert.match(html, /aria-label="サンキー図（準備中）"[^>]*disabled/);
  assert.match(html, /src="\.\/js\/modelOnly.js/);
});

test("icon-only time-cube and statistics navigation precedes the view switch", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const switchStart = html.indexOf('<nav class="model-view-switch"');
  const switchEnd = html.indexOf("</nav>", switchStart) + "</nav>".length;
  const iconSwitch = html.slice(html.indexOf('<nav class="model-screen-navigation"'), switchEnd);
  assert.match(html, /class="model-mode-tools"/);
  assert.ok(html.indexOf('class="model-screen-navigation"') < html.indexOf('class="model-view-switch"'));
  assert.match(html, /href="\.\.\/space-time-cube\/" aria-label="タイムキューブ" data-tooltip="タイムキューブ"><i/);
  assert.match(html, /data-map-view="3d" aria-label="3D地図"[^>]*data-tooltip="3D地図"><i/);
  assert.match(html, /data-map-view="2d" aria-label="上からの2D地図"[^>]*data-tooltip="上からの2D地図"><i/);
  assert.doesNotMatch(iconSwitch, /<span>[^<]+<\/span>/);
  assert.doesNotMatch(html, /aria-current="page"/);
  assert.match(html, /href="\.\.\/statistics\/" aria-label="統計" data-tooltip="統計"><i/);
  await readFile(new URL("../../statistics/index.html", import.meta.url));
});
