/** ファイル概要: デッキ内を巡る注視点・寄り引きと手動操作による停止を管理する。 */
const SHOTS = [
  { x: 0, z: 0, distance: 1, phi: 0.72, turn: 0 },
  { x: -0.23, z: -0.12, distance: 0.66, phi: 0.86, turn: -0.12 },
  { x: 0.23, z: 0.12, distance: 0.66, phi: 0.86, turn: 0.12 },
  { x: 0, z: 0.18, distance: 0.8, phi: 0.76, turn: 0.05 },
  { x: 0, z: 0, distance: 1, phi: 0.72, turn: 0 },
];
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export function tourPose(seed, elapsed, focus) {
  const time = Math.max(0, elapsed);
  const phase = Math.max(0, time - 3) % 32 / 8;
  const index = Math.floor(phase);
  const weight = ease(phase - index);
  const shot = Object.fromEntries(Object.keys(SHOTS[0]).map((key) => [key, mix(SHOTS[index][key], SHOTS[index + 1][key], weight)]));
  const enter = ease(Math.min(1, time / 3));
  return {
    theta: seed.theta + shot.turn * enter,
    phi: mix(seed.phi, shot.phi, enter),
    radius: mix(seed.radius, focus.radius * shot.distance, enter),
    target: {
      x: mix(seed.target.x, focus.center.x + shot.x * focus.size.x, enter),
      y: mix(seed.target.y, focus.center.y, enter),
      z: mix(seed.target.z, focus.center.z + shot.z * focus.size.z, enter),
    },
  };
}

export function createAutoCamera({ camera, controls, canvas, onAnimate, invalidate, canStart, getFocus }) {
  let active = false;
  let elapsed = 0;
  let previous = null;
  let seed;
  let focus;
  let notify = () => {};
  function stop() {
    if (!active) return;
    active = false;
    previous = null;
    controls.enableDamping = true;
    notify(false);
  }
  controls.addEventListener("start", stop);
  canvas.addEventListener("keydown", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  onAnimate((time) => {
    if (!active) return false;
    if (previous !== null) elapsed += Math.max(0, Math.min(0.1, (time - previous) / 1000));
    previous = time;
    const pose = tourPose(seed, elapsed, focus);
    pose.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, pose.radius));
    Object.assign(controls.target, pose.target);
    const horizontal = pose.radius * Math.sin(pose.phi);
    camera.position.set(
      controls.target.x + horizontal * Math.sin(pose.theta),
      controls.target.y + pose.radius * Math.cos(pose.phi),
      controls.target.z + horizontal * Math.cos(pose.theta),
    );
    camera.lookAt(controls.target);
    controls.update();
    return true;
  });
  return {
    stop,
    onChange(listener) { notify = listener; listener(active); },
    toggle() {
      if (active) { stop(); return; }
      if (!canStart()) return;
      controls.enableDamping = false;
      controls.update();
      const x = camera.position.x - controls.target.x;
      const y = camera.position.y - controls.target.y;
      const z = camera.position.z - controls.target.z;
      const radius = Math.hypot(x, y, z);
      if (!radius) { controls.enableDamping = true; return; }
      seed = { theta: Math.atan2(x, z), phi: Math.acos(Math.max(-1, Math.min(1, y / radius))), radius,
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z } };
      focus = getFocus();
      elapsed = 0;
      previous = null;
      active = true;
      notify(true);
      invalidate();
    },
  };
}
