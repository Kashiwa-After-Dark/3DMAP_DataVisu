import test from "node:test";
import assert from "node:assert/strict";
import { ARROW_FRAME_MS, arrowFrameAt, createRouteMotion } from "../time-space-graph/js/features/flowArrowMotion.js";
import { buildFlowArrowPositions } from "../time-space-graph/js/features/flowArrows.js";

const path = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }, { x: 0, z: 0 }];

test("flipbook repeats exactly three discrete frames at 240ms intervals", () => {
  assert.deepEqual([0, 239, 240, 479, 480, 719, 720].map(arrowFrameAt), [0, 0, 1, 1, 2, 2, 0]);
  assert.equal(arrowFrameAt(ARROW_FRAME_MS * 300 + 1), 0);
});

test("route motion follows corners and wraps the closed route in both directions", () => {
  const sample = createRouteMotion(path);
  const anchor = { x: 8, z: 0 };
  assert.deepEqual(sample(anchor, 1), { x: 9, z: 0, tangent: { x: 1, z: 0 } });
  assert.deepEqual(sample(anchor, 4), { x: 10, z: 2, tangent: { x: 0, z: 1 } });
  assert.deepEqual(sample(anchor, -10), { x: 0, z: 2, tangent: { x: 0, z: -1 } });
  assert.deepEqual(sample(anchor, 44), sample(anchor, 4));
});

test("all three arrow frames preserve people count and move in the indicated direction", () => {
  const cell = { center: { x: 4, z: 0 }, tangent: { x: 1, z: 0 }, towardSign: 1 };
  const flow = { cell, direction: "to_station", motion: "walking", people: 5 };
  const sampleRoute = createRouteMotion(path);
  const frames = [0, 1, 2].map((phase) => buildFlowArrowPositions([flow], 0.6, { phase, sampleRoute }));
  assert.equal(new Set(frames.map(JSON.stringify)).size, 3);
  for (const frame of frames) {
    assert.equal(frame.length, 5 * 36);
    assert.ok(frame.every(Number.isFinite));
  }
  const base = buildFlowArrowPositions([{ ...flow, people: 1 }]);
  const forward = buildFlowArrowPositions([{ ...flow, people: 1 }], 0.6, { phase: 1 });
  const reverseBase = buildFlowArrowPositions([{ ...flow, people: 1, direction: "from_station" }]);
  const reverse = buildFlowArrowPositions([{ ...flow, people: 1, direction: "from_station" }], 0.6, { phase: 1 });
  assert.ok(Math.abs(forward[0] - base[0] - 3) < 1e-9);
  assert.ok(Math.abs(reverse[0] - reverseBase[0] + 3) < 1e-9);
});
