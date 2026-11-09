import test from "node:test";
import assert from "node:assert/strict";
import { createMemoFilterCache } from "../time-space-graph/js/features/memoFilterCache.js";
import { createPlaybackCadence } from "../time-space-graph/js/features/playbackCadence.js";
import { getMapPixelRatio, getDensityBounds } from "../time-space-graph/js/features/renderQuality.js";

test("filter results and membership are reused until conditions or input data change", () => {
  let calls = 0;
  let source = [{ value: 1 }, { value: 2 }, { value: 3 }];
  let minimum = 2;
  const cache = createMemoFilterCache(() => source, (memo) => { calls++; return memo.value >= minimum; });
  const first = cache.get();
  const matches = cache.has;
  for (let i = 0; i < 1000; i++) {
    assert.equal(cache.get(), first);
    assert.equal(matches(source[0]), false);
    assert.equal(matches(source[2]), true);
  }
  assert.equal(calls, 3);
  minimum = 3;
  cache.invalidate();
  assert.deepEqual(cache.get(), [source[2]]);
  assert.equal(calls, 6);
  source = [...source, { value: 4 }];
  assert.equal(cache.get().length, 2);
  assert.equal(calls, 10);
});

test("playback limits expensive updates but always applies the final frame and new runs", () => {
  const gate = createPlaybackCadence();
  assert.equal(gate.shouldUpdate({ seconds: 0, run: 1, now: 0 }), true);
  assert.equal(gate.shouldUpdate({ seconds: 1, run: 1, now: 16 }), false);
  assert.equal(gate.shouldUpdate({ seconds: 2, run: 1, now: 40 }), true);
  assert.equal(gate.shouldUpdate({ seconds: 2, run: 1, now: 100 }), false);
  assert.equal(gate.shouldUpdate({ seconds: 3, run: 1, now: 41, ended: true }), true);
  assert.equal(gate.shouldUpdate({ seconds: 3, run: 2, now: 42 }), true);
});

test("60Hz playback performs fewer UI updates without skipping the end time", () => {
  const gate = createPlaybackCadence();
  let updates = 0;
  let last = null;
  for (let frame = 0; frame <= 1800; frame++) {
    const seconds = frame * 12;
    if (gate.shouldUpdate({ seconds, run: 1, now: frame * 1000 / 60, ended: frame === 1800 })) {
      updates++;
      last = seconds;
    }
  }
  assert.ok(updates <= 752);
  assert.ok(updates >= 590);
  assert.equal(last, 21600);
});

test("canvas resolution has a budget, while normal-density screens remain unchanged", () => {
  assert.equal(getMapPixelRatio({ width: 989, height: 720 }), 1);
  assert.equal(getMapPixelRatio({ width: 760, height: 640, devicePixelRatio: 2, mode: "impression" }), 1);
  assert.equal(getMapPixelRatio({ width: 760, height: 640, devicePixelRatio: 2 }), 1.5);
  const ratio = getMapPixelRatio({ width: 1920, height: 1080, devicePixelRatio: 2, mode: "impression" });
  assert.ok(1920 * 1080 * ratio ** 2 <= 1400001);
  assert.ok(Number.isFinite(getMapPixelRatio({ width: 0, height: 0 })));
});

test("empty fluid skips drawing; occupied bounds cover every channel with padding", () => {
  const data = new Uint8Array(16 * 16 * 4);
  assert.equal(getDensityBounds(data, 16), null);
  data[(8 * 16 + 8) * 4 + 2] = 100;
  const bounds = getDensityBounds(data, 16, 2);
  assert.ok(bounds.minX < 0 && bounds.maxX > 0);
  assert.ok(bounds.minZ < 0 && bounds.maxZ > 0);
  assert.ok(bounds.maxX - bounds.minX < 1);
  data[0] = 1;
  data[data.length - 1] = 1;
  assert.deepEqual(getDensityBounds(data, 16), { minX: -0.5, minZ: -0.5, maxX: 0.5, maxZ: 0.5 });
});
