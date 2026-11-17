/** ファイル概要: 重要範囲がボタン用余白に重ならず、各画面幅へ収まることを確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { focused2dFrame } from "../js/focused2dFrame.js";

test("focus area stays within the safe map region on desktop and mobile", () => {
  const size = { x: 12.12, z: 5.71 };
  for (const [w, h, inset] of [[1280, 720, 110], [1000, 720, 110], [390, 844, 88], [844, 390, 88]]) {
    const f = focused2dFrame(size, w, h, inset);
    const xPixel = (x) => (x - f.left) / (f.right - f.left) * w;
    const yPixel = (y) => (f.top - y) / (f.top - f.bottom) * h;
    assert.ok(xPixel(-size.x / 2) > 0);
    assert.ok(xPixel(size.x / 2) < w - inset);
    assert.ok(yPixel(size.z / 2) > 0);
    assert.ok(yPixel(-size.z / 2) < h);
    assert.ok(xPixel(0) < w / 2);
  }
});
test("more button clearance zooms out without stretching the map", () => {
  const a = focused2dFrame({ x: 12, z: 5 }, 1000, 700, 0);
  const b = focused2dFrame({ x: 12, z: 5 }, 1000, 700, 120);
  assert.ok(b.right - b.left > a.right - a.left);
  assert.ok(Math.abs((b.right - b.left) / (b.top - b.bottom) - 1000 / 700) < 1e-10);
});
