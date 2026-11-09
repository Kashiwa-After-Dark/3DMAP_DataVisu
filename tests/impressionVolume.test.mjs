import test from "node:test";
import assert from "node:assert/strict";
import { createImpressionVolumeModel, collectImpressionVolumes } from "../time-space-graph/js/features/impressionVolumeModel.js";
import { IMPRESSION_PERIOD_MS } from "../time-space-graph/js/features/impressionVolumeModel.js";

const startTime = Date.parse("2026-10-23T18:00:00+09:00");
const memo = (impression, offset = 10, rest = {}) => ({ isPeople: true, time: startTime + offset, impression, ...rest });
const makeModel = (memos) => createImpressionVolumeModel({ memos, startTime, endTime: startTime + 3 * IMPRESSION_PERIOD_MS });
const collect = (model, options = {}) => collectImpressionVolumes({ period: model.periods[0], currentTime: startTime + IMPRESSION_PERIOD_MS, rangeStart: startTime, ...options });

test("three two-hour boxes exclude objects and out-of-survey records", () => {
  const model = makeModel([memo("楽しい"), memo("楽しい", IMPRESSION_PERIOD_MS), memo("楽しい", -1), memo("楽しい", 3 * IMPRESSION_PERIOD_MS), memo("楽しい", 20, { isPeople: false })]);
  assert.equal(model.periods.length, 3);
  assert.equal(model.periods[0].memos.length, 1);
  assert.equal(model.periods[1].memos.length, 1);
});

test("impression totals count records, not people count or emotion intensity", () => {
  const model = makeModel([memo("楽しい", 10, { count: 20 }), memo("楽しい", 20), memo("静か", 30), memo("怖い", 40), memo("", 50)]);
  const volumes = collect(model);
  assert.deepEqual(volumes.map(({ count }) => count), [2, 1, 1, 1]);
});

test("playback, range and filters remove records", () => {
  const model = makeModel([memo("楽しい", 10), memo("楽しい", 20), memo("怖い", 30)]);
  assert.equal(collect(model, { currentTime: startTime }).reduce((sum, layer) => sum + layer.count, 0), 0);
  const filtered = collect(model, { matches: (entry) => entry.impression === "楽しい", rangeStart: startTime + 15 });
  assert.deepEqual(filtered.map(({ count }) => count), [1, 0, 0, 0]);
});

test("empty datasets keep the three time boxes with no dye records", () => {
  const model = makeModel([]);
  assert.equal(model.periods.length, 3);
  assert.ok(collect(model).every(({ count }) => count === 0));
});
