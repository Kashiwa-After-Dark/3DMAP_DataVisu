/** Checks the fixed five-frame loops and the model-aligned activity grid. */
import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMesh, createMeshGrid, createActivityMosaic, isTerraceActivityArea } from "../js/activityMeshModel.js";
import { meshActivityCategories } from "../js/meshActivityCategories.js";
import { buildMeshInspectionGroups } from "../js/meshInspectionGroups.js";
import { localArrowPoses } from "../js/terrace2dRoutes.js";

test("five poses stay near their anchor in separate directional lanes", () => {
  const [out] = localArrowPoses([0, 0], [3, 0], "from_station");
  const [inbound] = localArrowPoses([0, 0], [3, 0], "to_station");
  assert.equal(out.length, 5);
  assert.equal(inbound.length, 5);
  assert.ok(out.every(({ z, dx }, i) => z > 0 && dx > 0 && (!i || out[i - 1].x < out[i].x)));
  assert.ok(inbound.every(({ z, dx }, i) => z < 0 && dx < 0 && (!i || inbound[i - 1].x > inbound[i].x)));
  assert.ok(out[4].x - out[0].x < 0.4);
});

const triangle = { points: [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 3 }] };
const areas = new Map(["TR-00", "TR-02", "TR-03"].map((code) => [code, [triangle]]));
const grid = createMeshGrid({ min: { x: 0, z: 0 }, max: { x: 8, z: 8 } }, areas, 1);
const floor = (x, z) => x < 1 && z < 1 ? null : 0;
const record = (point, placeCodes = ["TR-02"]) => ({
  point, hasLocation: Boolean(point), placeCodes, activityCategories: [{ id: "walk", label: "Walk" }],
});

test("grid covers the full deck bounds, including uncoded cells and walkway codes", () => {
  assert.equal(grid.cellAt(7.5, 7.5), 63);
  assert.equal(grid.cellAt(8, 7.5), null);
  assert.ok(grid.cellsByCode.has("TR-02"));
  assert.ok(!grid.cellsByCode.has("TR-00"));
});

test("coordinates win on the deck within one cell of a code; outliers and holes fall back", () => {
  const { exact, approximate, counts } = aggregateMesh([
    record({ x: 1.5, z: 1.5 }), record({ x: 3.5, z: 0.1 }),
    record({ x: 6, z: 6 }), record({ x: 0.5, z: 0.5 }), record(null, ["TR-02", "TR-03"]),
    record({ x: 7, z: 7 }, ["TR-00"]), record(null, ["TR-00"]),
  ], grid, areas, floor, (item) => item.point);
  assert.deepEqual(counts, { coordinate: 3, code: 3, unplaced: 1 });
  assert.ok(exact.has(grid.cellAt(3.5, 0.1)) && exact.has(grid.cellAt(7, 7)));
  assert.equal(approximate.get(grid.cellAt(1.5, 1.5)).get("walk").count, 3);
});

test("an uncalibrated model does not attempt to use GPS", () => {
  const { counts, exact } = aggregateMesh([record({ x: 1.5, z: 1.5 })], grid, areas,
    () => assert.fail("uncalibrated GPS reached the deck"), null);
  assert.deepEqual(counts, { coordinate: 0, code: 1, unplaced: 0 });
  assert.equal(exact.size, 0);
});

test("record lookup keeps coordinate hits separate from place-code evidence", () => {
  const precise = record({ x: 1.5, z: 1.5 });
  const coded = record(null, ["TR-02", "TR-03"]);
  const { exactRecords, approximateRecords } = aggregateMesh([precise, coded], grid, areas, floor,
    (item) => item.point);
  const index = grid.cellAt(1.5, 1.5);
  assert.deepEqual(exactRecords.get(index), [precise]);
  assert.deepEqual(approximateRecords.get(index), [coded]);
});

test("adjacent matching records group regardless of order, but holes and different sources split them", () => {
  const detail = (source, ...ids) => ({ source, records: ids.map((id) => ({ id })) });
  const details = new Map([
    [0, detail("code", "a", "b")], [1, detail("code", "b", "a")],
    [2, detail("code", "a", "b")], [3, detail("code", "a", "b")],
    [4, detail("estimated", "a", "b")], [5, detail("code", "c")],
  ]);
  const { ids, groups } = buildMeshInspectionGroups(6, 1, details, [1, 1, 0, 1, 1, 1]);
  assert.equal(ids[0], ids[1]);
  assert.equal(ids[2], 0);
  assert.equal(new Set([ids[0], ids[3], ids[4], ids[5]]).size, 4);
  assert.deepEqual(groups[ids[0]], details.get(0));
});

const tags = (...entries) => new Map(entries.map(([tag, count]) => [tag, { tag, count }]));

test("an eight-cell-square area shows both categories in their actual proportions", () => {
  const approximate = new Map(Array.from({ length: 64 }, (_, index) => [index, tags(["talk", 3], ["rest", 1])]));
  const cells = createActivityMosaic(grid, new Map(), approximate);
  assert.equal([...cells.values()].filter(({ tag }) => tag === "talk").length, 48);
  assert.equal([...cells.values()].filter(({ tag }) => tag === "rest").length, 16);
  for (let row = 1; row < 8; row++) {
    assert.deepEqual(Array.from({ length: 8 }, (_, col) => cells.get(row * 8 + col).tag),
      Array.from({ length: 8 }, (_, col) => cells.get(col).tag));
  }
});

test("exact coordinates win, empty interior borrows context, and the outer arms stay gray", () => {
  const exact = new Map([[1, tags(["walk", 1])]]);
  const approx = new Map([[1, tags(["talk", 1])]]);
  const mosaic = createActivityMosaic(grid, exact, approx, (x) => x > 1 && x < 7);
  assert.deepEqual(mosaic.get(1), { tag: "walk", source: "coordinate", sourceCell: 1 });
  assert.deepEqual(mosaic.get(2), { tag: "walk", source: "estimated", sourceCell: 1 });
  assert.equal(mosaic.has(0), false);
  assert.equal(mosaic.has(7), false);
  assert.equal(createActivityMosaic(grid, new Map(), new Map()).size, 0);
  assert.equal(isTerraceActivityArea(-6), false);
  assert.equal(isTerraceActivityArea(11), false);
});

test("uneven mixes preserve rare colors and can use adjacent cells without claiming precise data there", () => {
  const mixed = tags(["talk", 40], ["rest", 1], ["photo", 1]);
  const cells = createActivityMosaic(grid, new Map([[1, mixed]]), new Map(), () => true, undefined,
    Uint8Array.from({ length: 64 }, (_, index) => [1, 2, 3].includes(index)));
  assert.deepEqual([...cells.values()].map(({ tag }) => tag), ["talk", "photo", "rest"]);
  assert.equal(cells.get(1).source, "coordinate");
  assert.equal(cells.get(3).source, "estimated");
  assert.equal(cells.get(3).sourceCell, 1);
  assert.equal(cells.has(0), false);
  const area = createActivityMosaic(grid, new Map(), new Map(Array.from({ length: 8 }, (_, index) => [index, mixed])));
  assert.equal(new Set([...area.values()].map(({ tag }) => tag)).size, 3);
});

test("selecting an API tag does not count unrelated or untagged records", () => {
  const result = aggregateMesh([record(null), { ...record(null), activityCategories: [] },
    { ...record(null), activityCategories: [{ id: "talk", label: "Talk" }] }],
  grid, areas, floor, null, (item) => item.activityCategories.filter(({ id }) => id === "walk"));
  assert.equal(result.counts.code, 1);
  assert.equal(result.approximate.values().next().value.has("talk"), false);
});

test("the mesh refines saved categories and finds explicit untagged actions without changing input", () => {
  const original = { id: "rest_phone_wait", label: "rest" };
  const typed = { activityCategories: [original], activity: "\u30b9\u30de\u30db\u898b\u3066\u308b" };
  assert.equal(meshActivityCategories(typed)[0].id, "phone");
  assert.deepEqual(typed.activityCategories, [original]);
  assert.equal(meshActivityCategories({ activity: "\u6f14\u594f\u3092\u8074\u3044\u3066\u3044\u308b" })[0].id, "audience");
  assert.deepEqual(meshActivityCategories({ activity: "unknown" }), []);
});
