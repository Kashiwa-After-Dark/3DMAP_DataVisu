/** ファイル概要: モニターの資料日付・表示件数と模型内モニター面の存在を確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getStationContext } from "../js/stationContextData.js";
import { monitorContent } from "../js/stationMonitorContent.js";

test("screen content uses the stored survey context, not live status or invented weather", () => {
  const data = getStationContext("2026-10-23");
  const original = JSON.stringify(data);
  const content = monitorContent(data, [{}, {}], "1");
  assert.equal(content.date, "2026-10-23");
  assert.equal(content.period, "20–22時");
  assert.equal(content.count, 2);
  assert.match(content.weather, /15.8–16.4/);
  assert.equal(JSON.stringify(data), original);
  assert.equal(monitorContent(null).weather, "天候資料なし");
});
test("station GLB contains exactly one black display material primitive", async () => {
  const bytes = await readFile(new URL("../../3Dmodel/teras.glb", import.meta.url));
  const model = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const station = model.nodes.find((node) => node.name === "Kashiwa_Station");
  const matches = model.meshes[station.mesh].primitives.filter((p) => /Display black/i.test(model.materials[p.material].name));
  assert.equal(matches.length, 1);
  const pos = model.accessors[matches[0].attributes.POSITION];
  assert.ok(pos.max[0] - pos.min[0] > pos.max[1] - pos.min[1]);
  assert.ok(pos.max[2] - pos.min[2] < 0.02);
});

test("station activation draws on the model without a popup or camera close-up", async () => {
  const source = await readFile(new URL("../js/stationMonitor.js", import.meta.url), "utf8");
  assert.match(source, /surface\.add\(screen\)/);
  assert.doesNotMatch(source, /scene\.attach\(screen\)|view\.focusAt|monitor-detail/);
  assert.match(source, /intersectObject\(model\.stationObject, true\)/);
  assert.match(source, /model\.setStationInfoActive\(active\)/);
  const label = await readFile(new URL("../js/stationContext.js", import.meta.url), "utf8");
  assert.match(label, /addEventListener\("click", \(\) => onActivate\?\.\(\)\)/);
  assert.doesNotMatch(label, /pointerenter|station-context-panel/);
});
