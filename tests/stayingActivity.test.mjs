/**
 * ファイル概要: 滞在地点と代表行動の判定を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { collectStayingActivities, applyStayingStyle, isInStayingZone, STAY_COLOR } from "../space-time-cube/js/movement-visualization/staying-activity-model.js";
import { buildActivityTripGeometry } from "../space-time-cube/js/movement-visualization/activity-trip-geometry.js";

const cells = [0, 1, 2].map((index) => ({ id: String(index), a: { x: index * 20, z: 0 }, b: { x: (index + 1) * 20, z: 0 }, center: { x: index * 20 + 10, z: 0 }, normal: { x: 0, z: 1 }, towardSign: 1 }));
const memo = (overrides = {}) => ({ isPeople: true, hasLocation: true, world: { x: 10, z: 0 }, count: 1, activity: "雑談", ...overrides });

test("staying dominance requires both three records and 70 percent of observed people", () => {
  const stay = [memo({ count: 3 }), memo({ count: 2 }), memo({ count: 2 })];
  const moving = memo({ direction: "to_station", motion: "walking", count: 3 });
  assert.deepEqual([...collectStayingActivities(cells, [...stay, moving]).dominant], ["0"]);
  assert.equal(collectStayingActivities(cells, [...stay, { ...moving, count: 4 }]).dominant.size, 0);
  assert.equal(collectStayingActivities(cells, stay.slice(0, 2)).dominant.size, 0);
  assert.equal(collectStayingActivities(cells, [memo({ count: 200 })]).dominant.size, 0);
});
test("staying uses local coordinates and never invents a direction or location", () => {
  const data = [memo(), memo(), memo(), memo({ hasLocation: false, count: 100 }), memo({ world: { x: 500, z: 500 }, count: 100 }), memo({ isPeople: false, count: 100 })];
  const result = collectStayingActivities(cells, data);
  assert.deepEqual([...result.dominant], ["0"]);
  assert.equal(result.counts.get("1").total, 0);
  assert.equal(result.counts.get("0").total, 3);
  assert.equal(result.points.length, 4);
  assert.ok(isInStayingZone({ x: 10, z: 2.2 }, cells, result.dominant));
  assert.equal(isInStayingZone({ x: 35, z: 0 }, cells, result.dominant), false);
});
test("green dashed styles replace both gradient endpoints without mutating movement bins", () => {
  const bins = cells.map((cell) => ({ cell, color: "#74aed4", startColor: "#74aed4", endColor: "#aeb8c2", opacity: 0.5 }));
  const styled = applyStayingStyle(bins, new Set(["0"]));
  assert.equal(styled[0].color, STAY_COLOR);
  assert.equal(styled[0].startColor, STAY_COLOR);
  assert.equal(styled[0].endColor, STAY_COLOR);
  assert.equal(styled[0].dashed, true);
  assert.equal(styled[1].dashed, false);
  assert.equal(styled[1].color, bins[1].color);
  assert.equal(bins[0].dashed, undefined);
});
test("other stationary activities retain their categories and moving observations are excluded", () => {
  const result = collectStayingActivities(cells, [memo(), memo({ activity: "飲食" }), memo({ activity: "休憩" }), memo({ activity: "スケボーで遊んでる" }), memo({ activity: "スマホ見てる" }), memo({ activity: "歩いている", motion: "walking" }), memo({ direction: "from_station" })]);
  assert.deepEqual(result.points.map((point) => point.activity.id), ["conversation", "food", "rest", "play", "phone"]);
});
test("moving trails are cut inside staying zones, including trails from adjacent cells", () => {
  const flows = [{ cell: cells[1], direction: "to_station", people: 1 }];
  const sample = (center, offset) => ({ x: center.x + offset, z: 0, tangent: { x: 1, z: 0 } });
  const full = buildActivityTripGeometry(flows, sample);
  const clipped = buildActivityTripGeometry(flows, sample, 72, (point) => point.x < 20);
  assert.ok(clipped.progress.length > 0 && clipped.progress.length < full.progress.length);
  assert.ok(clipped.positions.filter((_, index) => index % 3 === 0).every((x) => x >= 20));
  assert.equal(buildActivityTripGeometry(flows, sample, 72, () => true).positions.length, 0);
});
