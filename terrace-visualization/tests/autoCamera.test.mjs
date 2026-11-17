/** ファイル概要: 自動カメラの連続性と距離・角度の制限を確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { tourPose, createAutoCamera } from "../js/autoCamera.js";
const focus = { center: { x: 0, y: 0, z: 0 }, size: { x: 80, y: 1, z: 40 }, radius: 90 };

test("tour begins at the current view without a jump", () => {
  const seed = { theta: 0.7, phi: 0.8, radius: 100, target: { x: 4, y: 2, z: 3 } };
  assert.deepEqual(tourPose(seed, 0, focus), seed);
  assert.ok(Math.abs(tourPose(seed, 0.01, focus).theta - seed.theta) < 0.00001);
});

test("manual input stops the tour and restart resets frame timing", () => {
  const original = globalThis.document;
  const events = {};
  globalThis.document = { addEventListener() {} };
  try {
    let tick;
    const states = [];
    const camera = { position: { x: 10, y: 10, z: 10, set(x, y, z) { Object.assign(this, { x, y, z }); } }, lookAt() {} };
    const controls = { target: { x: 0, y: 0, z: 0 }, minDistance: 1, maxDistance: 100,
      enableDamping: true, update() {}, addEventListener(name, fn) { events[name] = fn; } };
    const tour = createAutoCamera({ camera, controls, canvas: { addEventListener() {} },
      onAnimate(fn) { tick = fn; }, invalidate() {}, canStart() { return true; }, getFocus() { return focus; } });
    tour.onChange((value) => states.push(value));
    tour.toggle();
    tick(1000);
    tick(1100);
    events.start();
    const stopped = { ...camera.position };
    assert.equal(tick(1200), false);
    assert.deepEqual(camera.position, stopped);
    assert.equal(controls.enableDamping, true);
    tour.toggle();
    tick(90000);
    assert.ok(Math.abs(camera.position.x - stopped.x) < 1e-10);
    tour.stop();
    assert.deepEqual(states, [false, true, false, true, false]);
  } finally { globalThis.document = original; }
});
test("tour keeps radius and polar angle within safe limits", () => {
  for (const phi of [Math.PI * 0.08, 0.8, Math.PI * 0.45]) {
    for (let t = 0; t < 500; t += 0.5) {
      const pose = tourPose({ theta: 0, phi, radius: 100, target: focus.center }, t, focus);
      assert.ok(pose.radius >= 59.4 - 1e-10 && pose.radius <= 100);
      assert.ok(pose.phi >= Math.PI * 0.08 && pose.phi <= Math.PI * 0.45);
    }
  }
});

test("deck tour pans to both sides and returns to overview continuously", () => {
  const seed = { theta: 0.7, phi: 0.8, radius: 100, target: focus.center };
  const left = tourPose(seed, 11, focus);
  const right = tourPose(seed, 19, focus);
  assert.ok(left.target.x < 0 && right.target.x > 0);
  assert.ok(left.radius < focus.radius && right.radius < focus.radius);
  assert.deepEqual(tourPose(seed, 35, focus), tourPose(seed, 3, focus));
  assert.ok(left.phi >= 0.72 && right.phi >= 0.72);
  for (const t of [3, 11, 19, 27, 35]) {
    const a = tourPose(seed, t - 0.001, focus);
    const b = tourPose(seed, t + 0.001, focus);
    assert.ok(Math.abs(a.target.x - b.target.x) < 0.0001);
    assert.ok(Math.abs(a.radius - b.radius) < 0.0001);
  }
});
