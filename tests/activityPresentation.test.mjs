import test from "node:test";
import assert from "node:assert/strict";
import { routeBinsForView, summarizeStationaryActivities } from "../time-space-graph/js/features/activityPresentation.js";

const bins = [{ color: "#00e5ff", density: 4, opacity: 0.8 }, { color: "#b1c8d2", density: 0, opacity: 0.06 }];

test("movement routes are neutral and never inherit activity colors or density", () => {
  const result = routeBinsForView(bins, "movement");
  assert.deepEqual(result.map(({ color, opacity }) => ({ color, opacity })), [
    { color: "#aeb8c2", opacity: 0.3 }, { color: "#aeb8c2", opacity: 0.3 },
  ]);
  assert.equal(bins[0].color, "#00e5ff");
});

test("activity routes retain density and hide locations without staying observations", () => {
  const result = routeBinsForView(bins, "activity");
  assert.equal(result[0].color, bins[0].color);
  assert.equal(result[0].opacity, 0.8);
  assert.equal(result[1].opacity, 0);
  assert.equal(bins[1].opacity, 0.06);
});

test("activity legend excludes movement and objects, and separates records from people", () => {
  const records = [
    { isPeople: true, activity: "会話", count: 3 },
    { isPeople: true, activity: "会話", count: 2 },
    { isPeople: true, activity: "休憩", count: 1 },
    { isPeople: true, activity: "会話", motion: "walking", count: 5 },
    { isPeople: true, activity: "移動", count: 10 },
    { isPeople: false, activity: "会話", count: 10 },
  ];
  const result = summarizeStationaryActivities(records);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "conversation");
  assert.equal(result[0].records, 2);
  assert.equal(result[0].people, 5);
  assert.equal(result[1].id, "rest");
  assert.deepEqual(summarizeStationaryActivities([]), []);
});
