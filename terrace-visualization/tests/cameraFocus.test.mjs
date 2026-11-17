/** ファイル概要: モニター接近の補間・到達・手動停止を確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { createCameraFocus } from "../js/cameraFocus.js";

class Point {
  constructor(x, y, z) { Object.assign(this, { x, y, z }); }
  clone() { return new Point(this.x, this.y, this.z); }
  lerpVectors(a, b, t) { for (const key of ["x", "y", "z"]) this[key] = a[key] + (b[key] - a[key]) * t; }
}
test("focus interpolates to the exact goal and yields to manual interaction", () => {
  let tick;
  let manual;
  const camera = { position: new Point(10, 20, 30), lookAt() {} };
  const controls = { target: new Point(0, 0, 0), enableDamping: true, update() {}, addEventListener(name, fn) { manual = fn; } };
  const focus = createCameraFocus({ camera, controls, onAnimate(fn) { tick = fn; } });
  const goal = new Point(2, 3, 4);
  focus.start(new Point(1, 1, 1), goal);
  tick(100);
  assert.equal(camera.position.x, 10);
  tick(900);
  assert.equal(camera.position.x, 6);
  tick(1700);
  assert.deepEqual(camera.position, goal);
  assert.equal(tick(1800), false);
  focus.start(new Point(0, 0, 0), new Point(20, 30, 40));
  tick(2000);
  manual();
  assert.equal(tick(3000), false);
  assert.deepEqual(camera.position, goal);
  assert.equal(controls.enableDamping, true);
});
