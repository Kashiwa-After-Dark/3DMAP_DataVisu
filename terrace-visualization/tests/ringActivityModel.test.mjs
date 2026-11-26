/** Terrace ring counts, layer spacing and saved tag normalization. */
import test from "node:test";
import assert from "node:assert/strict";
import { activityLegend, activityRingLayers, activityRingRadius, RING_DECK_OFFSET, RING_LAYER_GAP, summarizeRingActivities } from "../js/ringActivityModel.js";
import { selectTerraceObservations } from "../js/observationModel.js";

test("each ring counts records for its own published category without duplicates", () => {
  const conversation = { id: "conversation", label: "会話" };
  const rest = { id: "rest_phone_wait", label: "休憩/スマホ/待機" };
  const records = [
    { placeCodes: ["TR-05", "TR-05", "TR-06", "TR-02"], activityCategories: [conversation, rest, conversation] },
    { placeCodes: ["TR-05"], activityCategories: [conversation] },
    { placeCodes: ["TR-05"], activityCategories: [] },
  ];
  const summaries = summarizeRingActivities(records, new Set(["TR-05", "TR-06", "TR-09"]));
  assert.deepEqual([...summaries.keys()], ["TR-05", "TR-06"]);
  const summary = summaries.get("TR-05");
  assert.deepEqual(activityRingLayers(summary), [
    { tag: "conversation", count: 2, offset: 0 },
    { tag: "rest_phone_wait", count: 1, offset: RING_LAYER_GAP },
    { tag: null, count: 1, offset: 2 * RING_LAYER_GAP },
  ]);
  assert.ok(RING_LAYER_GAP > 0 && RING_LAYER_GAP < RING_DECK_OFFSET);
  assert.ok(activityLegend(summaries).some(({ tag, label }) => tag === null && label === "カテゴリなし"));
});

test("ring size is stable on the same scale and zero records have no ring", () => {
  assert.equal(activityRingRadius(0, 30), 0);
  assert.equal(activityRingRadius(30, 30), 0.58);
  assert.equal(activityRingRadius(4, 16) * 2, activityRingRadius(16, 16));
  assert.ok(activityRingRadius(1, 30) < activityRingRadius(2, 30));
});

test("stacks and legend use the same fixed order regardless of counts or missing categories", () => {
  const conversation = { tag: "conversation", label: "会話", count: 1 };
  const movement = { tag: "movement", label: "移動", count: 8 };
  const rest = { tag: "rest_phone_wait", label: "休憩/スマホ/待機", count: 6 };
  const full = new Map([[rest.tag, rest], [movement.tag, movement], [conversation.tag, conversation]]);
  const partial = new Map([[rest.tag, { ...rest, count: 1 }], [movement.tag, movement]]);
  assert.deepEqual(activityRingLayers(full).map(({ tag }) => tag), [conversation.tag, movement.tag, rest.tag]);
  assert.deepEqual(activityRingLayers(partial).map(({ tag, offset }) => [tag, offset]), [
    [movement.tag, 0], [rest.tag, RING_LAYER_GAP],
  ]);
  assert.deepEqual(activityLegend(new Map([["TR-05", full], ["TR-06", partial]])).map(({ tag }) => tag), [conversation.tag, movement.tag, rest.tag]);
});

test("only published activity categories feed the ring, not raw tags or activity text", () => {
  const shared = { time: "2026-10-23T18:09:00+09:00", placeCodes: ["TR-05"], personTags: ["学生"], activity: "雑談", activityTags: ["滞在"] };
  const category = { id: "custom-example", label: "ナンパ" };
  const { records } = selectTerraceObservations([
    { ...shared, activityClassification: { categories: [category, null, { id: "missing-label" }] } },
    shared,
  ], "2026-10-23");
  assert.deepEqual(records.map(({ activityCategories }) => activityCategories), [[category], []]);
});
