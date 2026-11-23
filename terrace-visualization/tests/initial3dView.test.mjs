/** ファイル概要: 3D開始視点の角度・拡大・画面比率への対応を確認する。 */
import test from "node:test";
import assert from "node:assert/strict";
import { initial3dView } from "../js/initial3dView.js";

const center = { x: 2, y: 0.17, z: -0.35 };
const size = { x: 14.51, y: 0.6, z: 6.75 };
test("start looks down at the foreground deck from close to straight on", () => {
  const pose = initial3dView(center, size, 16 / 9);
  const elevation = Math.atan2(pose.offset.y, Math.hypot(pose.offset.x, pose.offset.z)) * 180 / Math.PI;
  assert.ok(elevation > 39 && elevation < 45);
  assert.ok(pose.offset.x > 0);
  assert.ok(pose.target.x > center.x);
  assert.ok(Math.abs(pose.offset.x / pose.offset.z) < 0.06);
  assert.ok(Math.hypot(...Object.values(pose.offset)) <= size.x * 0.601);
  assert.ok(pose.target.y > center.y);
});
test("portrait framing pulls back without changing viewing direction", () => {
  const wide = initial3dView(center, size, 16 / 9);
  const portrait = initial3dView(center, size, 390 / 844);
  assert.deepEqual(wide.target, portrait.target);
  assert.ok(portrait.offset.z > wide.offset.z);
  assert.ok(Math.abs(portrait.offset.y / portrait.offset.z - wide.offset.y / wide.offset.z) < 1e-10);
});
