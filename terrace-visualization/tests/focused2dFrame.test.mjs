/** ファイル概要: 重要範囲がボタン用余白に重ならず、各画面幅へ収まることを確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { focused2dFrame, terrace2dDetailFrame } from "../js/focused2dFrame.js";

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

test("the overhead default frames the deck a little closer than the previous fit", () => {
  const size = { x: 12.12, z: 5.71 };
  const before = focused2dFrame(size, 1280, 720, 110, 1.14);
  const after = focused2dFrame(size, 1280, 720, 110);
  const magnification = (before.right - before.left) / (after.right - after.left);
  assert.ok(magnification > 1.05 && magnification < 1.08);
});

test("the terrace detail crops the wide view, lowers its subject, and preserves the portrait fit", () => {
  const size = { x: 12.12, z: 5.71 };
  const wide = focused2dFrame(size, 1280, 720, 110);
  const detail = terrace2dDetailFrame(size, 1280, 720, 110);
  assert.ok(Math.abs((wide.right - wide.left) / (detail.right - detail.left) - 1.32) < 1e-10);
  assert.ok(Math.abs(wide.left / wide.right - detail.left / detail.right) < 1e-10);
  assert.ok(Math.abs(detail.top / (detail.top - detail.bottom) - 0.575) < 1e-10);
  assert.deepEqual(terrace2dDetailFrame(size, 390, 844, 88), focused2dFrame(size, 390, 844, 88));
});
