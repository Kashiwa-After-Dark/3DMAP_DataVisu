/**
 * ファイル概要: 感情・印象の密度計算を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createDensityDomain, buildImpressionDensity, pointInRoute } from "../space-time-cube/js/impression-visualization/impression-density.js";

const route = [{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }, { x: 0, z: 100 }];
const domain = createDensityDomain(route, 32);
const memo = { isPeople: true, hasLocation: true, world: { x: 50, z: 50 }, time: 10, impression: "楽しい" };
const peak = (data, channel = 0) => Math.max(...data.filter((_, index) => index % 4 === channel));

test("route masks bound density to the actual route footprint", () => {
  assert.ok(pointInRoute({ x: 50, z: 50 }, route));
  assert.ok(!pointInRoute({ x: 120, z: 50 }, route));
  const triangular = createDensityDomain([{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 0, z: 100 }], 32);
  assert.ok(triangular.mask.includes(255));
  assert.ok(triangular.mask.includes(0));
  const result = buildImpressionDensity({ memos: [memo], domain: triangular });
  for (let i = 0; i < triangular.mask.length; i++) if (!triangular.mask[i]) assert.deepEqual([...result.data.slice(i * 4, i * 4 + 4)], [0, 0, 0, 0]);
});

test("more records at the same coordinate produce denser ink with a fixed scale", () => {
  const full = buildImpressionDensity({ memos: [memo, memo, memo], domain });
  const sparse = buildImpressionDensity({ memos: [memo], domain, referenceMax: full.maximum });
  assert.ok(peak(full.data) > peak(sparse.data));
  const center = (16 * 32 + 16) * 4;
  assert.ok(full.data[center] > full.data[0]);
  assert.equal(full.located, 3);
});

test("emotion channels stay separate and missing coordinates are never invented", () => {
  const result = buildImpressionDensity({ memos: [memo, { ...memo, impression: "怖い" }, { ...memo, hasLocation: false }, { ...memo, world: { x: 200, z: 200 } }], domain });
  assert.ok(peak(result.data, 0) > 0);
  assert.ok(peak(result.data, 2) > 0);
  assert.equal(peak(result.data, 1), 0);
  assert.equal(result.located, 2);
  assert.equal(result.unplaced, 2);
});

test("playback and filters remove ink and objects are never counted", () => {
  for (const options of [{ currentTime: 0 }, { rangeStart: 20 }, { matches: () => false }]) {
    const result = buildImpressionDensity({ memos: [memo], domain, ...options });
    assert.equal(peak(result.data), 0);
  }
  const result = buildImpressionDensity({ memos: [{ ...memo, isPeople: false }], domain });
  assert.equal(result.located, 0);
  assert.equal(result.unplaced, 0);
});
