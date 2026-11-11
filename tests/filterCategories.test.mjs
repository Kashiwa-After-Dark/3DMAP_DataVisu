/**
 * ファイル概要: 属性・感情・行動の独立した絞り込みを自動確認する。
 */
import assert from "node:assert/strict";
import test from "node:test";

import { matchesActivityFilter } from "../space-time-cube/js/filters/activities/activity-filter.js";
import { matchesAttributeFilter } from "../space-time-cube/js/filters/attributes/attribute-filter.js";
import { matchesEmotionFilter } from "../space-time-cube/js/filters/emotions/emotion-filter.js";

const memo = {
  ageCategory: "Y",
  category: "Y",
  groupCategory: "B",
  gender: "M",
  sourceId: "route-a",
  count: 1,
  name: "休憩",
  desc: "ベンチに座っている",
  sourceLabel: "18-20",
  symbol: "Y-B-M",
  impression: "落ち着いている",
  isPeople: true,
};

test("attribute filter owns demographic, source, count and keyword conditions", () => {
  const state = {
    ageCategories: new Set(["Y"]),
    groupCategories: new Set(["B"]),
    genders: new Set(["M"]),
    sources: new Set(["route-a"]),
    minCount: 1,
    maxCount: 2,
    keyword: "ベンチ",
  };
  assert.equal(matchesAttributeFilter(memo, state), true);
  assert.equal(matchesAttributeFilter(memo, { ...state, genders: new Set(["F"]) }), false);
});

test("activity filter owns activity classification and object visibility", () => {
  assert.equal(matchesActivityFilter(memo, { activityTypes: new Set(["rest"]) }), true);
  assert.equal(matchesActivityFilter(memo, { activityTypes: new Set(["passing"]) }), false);
  assert.equal(
    matchesActivityFilter({ ...memo, category: "OBJ", isPeople: false }, { activityTypes: new Set(["object"]) }),
    true,
  );
});

test("emotion filter owns perspective classification and object visibility", () => {
  const state = { impressionTypes: new Set(["neutral"]), impressionPerspective: "subject" };
  assert.equal(matchesEmotionFilter(memo, state), true);
  assert.equal(matchesEmotionFilter(memo, { ...state, impressionTypes: new Set(["negative"]) }), false);
  assert.equal(
    matchesEmotionFilter({ ...memo, category: "OBJ", isPeople: false }, { impressionTypes: new Set(["object"]) }),
    true,
  );
});
