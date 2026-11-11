/**
 * ファイル概要: 観察者・観察対象の感情分類を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { getPerspectiveImpressionType } from "../space-time-cube/js/impression-visualization/emotion-perspective.js";
import { buildImpressionDensity, createDensityDomain } from "../space-time-cube/js/impression-visualization/impression-density.js";
import { createImpressionVolumeModel, collectImpressionVolumes } from "../space-time-cube/js/impression-visualization/impression-volume-model.js";

const classify = (text, perspective) => getPerspectiveImpressionType({ impression: text }, perspective).id;

test("observer judgement and observed appearance are not conflated", () => {
  assert.equal(classify("邪魔だなぁ", "observer"), "negative");
  assert.equal(classify("邪魔だなぁ", "subject"), "unknown");
  assert.equal(classify("楽しそう", "subject"), "positive");
  assert.equal(classify("楽しそう", "observer"), "unknown");
  assert.equal(classify("リラックスしている", "subject"), "neutral");
});

test("mixed descriptions can yield different emotion categories for each perspective", () => {
  const text = "楽しそうだけど うるさい Tiktokに上がってそう";
  assert.equal(classify(text, "observer"), "negative");
  assert.equal(classify(text, "subject"), "positive");
  assert.equal(classify("可愛い 泣いてるからお母さん大変そう", "observer"), "positive");
  assert.equal(classify("可愛い 泣いてるからお母さん大変そう", "subject"), "negative");
});

test("negated happiness is negative, and ambiguous descriptions remain unknown", () => {
  assert.equal(classify("楽しくなさそう", "subject"), "negative");
  assert.equal(classify("つまらなそう", "subject"), "negative");
  for (const perspective of ["subject", "observer"]) {
    assert.equal(classify("人が多い", perspective), "unknown");
    assert.equal(classify("", perspective), "unknown");
  }
});

test("counts and ink use the same selected perspective", () => {
  const memo = { impression: "楽しそうだけど うるさい", isPeople: true, time: 10, hasLocation: true, world: { x: 10, z: 10 } };
  const model = createImpressionVolumeModel({ memos: [memo], startTime: 0, endTime: 21600000 });
  const domain = createDensityDomain([{ x: 0, z: 0 }, { x: 20, z: 0 }, { x: 20, z: 20 }, { x: 0, z: 20 }], 16);
  for (const [perspective, channel] of [["observer", 2], ["subject", 0]]) {
    const getType = (entry) => getPerspectiveImpressionType(entry, perspective);
    const counts = collectImpressionVolumes({ period: model.periods[0], currentTime: 20, rangeStart: 0, getType });
    assert.equal(counts[channel].count, 1);
    const field = buildImpressionDensity({ memos: [memo], domain, getType });
    assert.ok(field.data.some((value, index) => index % 4 === channel && value > 0));
    assert.ok(field.data.every((value, index) => index % 4 === channel || value === 0));
  }
});
