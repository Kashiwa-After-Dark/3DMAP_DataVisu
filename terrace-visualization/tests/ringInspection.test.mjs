/** Checks that a selected ring shows only its records and keeps a readable camera offset. */
import test from "node:test";
import assert from "node:assert/strict";
import { selectRingObservations } from "../js/ringInspectionModel.js";
import { observationFocusView } from "../js/observationFocusView.js";

test("rings distinguish tags within one place and tagless records", () => {
  const row = (code, ids) => ({ placeCodes: [code], activityCategories: ids.map((id) => ({ id })) });
  const selected = row("TR-09", ["talk", "rest"]);
  const untagged = row("TR-09", []);
  const records = [selected, row("TR-09", ["skate"]), row("TR-05", ["rest"]), untagged];
  assert.deepEqual(selectRingObservations(records, { code: "TR-09", tag: "rest" }), [selected]);
  assert.deepEqual(selectRingObservations(records, { code: "TR-09", tag: null }), [untagged]);
});

test("focus gets closer, stays on the same side of the deck, and looks farther down", () => {
  const anchor = { x: 3, y: 0.2, z: -2 };
  const { target, offset } = observationFocusView(anchor, 10, 0.1);
  assert.ok(Math.abs(Math.hypot(offset.x, offset.y, offset.z) - 7.6) < 1e-10);
  assert.ok(offset.z > 0 && offset.y > offset.z);
  assert.equal(target.z, anchor.z);
  assert.ok(Math.abs(target.x - anchor.x) < 0.3);
});
