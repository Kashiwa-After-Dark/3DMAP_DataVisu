import test from "node:test";
import assert from "node:assert/strict";
import { fitDistance, orthographicSpan } from "../terrace-map/js/cameraFit.js";

test("portrait cameras back away enough to keep the focus area in view", () => {
  assert.ok(fitDistance(80, 42, 0.5) > fitDistance(80, 42, 1.6));
  assert.ok(fitDistance(80, 42, 1.6) > 80);
  assert.ok(Number.isFinite(fitDistance(0, 42, 1)));
});

test("overhead framing preserves geometry aspect in portrait and landscape", () => {
  for (const aspect of [0.5, 1, 1.6, 2.5]) {
    const span = orthographicSpan({ x: 170, z: 95 }, aspect);
    assert.ok(span.width >= 170 * 1.2 - 0.001);
    assert.ok(span.height >= 95 * 1.2 - 0.001);
    assert.ok(Math.abs(span.width / span.height - aspect) < 0.001);
  }
});
