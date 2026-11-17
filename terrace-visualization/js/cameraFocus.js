/** ファイル概要: モニターなどの注視対象へ、既存の描画ループでカメラを滑らかに移す。 */
export function createCameraFocus({ camera, controls, onAnimate }) {
  let flight = null;
  function stop() {
    if (!flight) return;
    flight = null;
    controls.enableDamping = true;
  }
  controls.addEventListener("start", stop);
  onAnimate((time) => {
    if (!flight) return false;
    flight.start ??= time;
    const t = Math.min(1, Math.max(0, (time - flight.start) / 1600));
    const w = t * t * (3 - 2 * t);
    camera.position.lerpVectors(flight.fromPosition, flight.position, w);
    controls.target.lerpVectors(flight.fromTarget, flight.target, w);
    camera.lookAt(controls.target);
    controls.update();
    if (t === 1) stop();
    return true;
  });
  return {
    stop,
    start(target, position) {
      stop();
      controls.enableDamping = false;
      controls.update();
      flight = { target: target.clone(), position: position.clone(),
        fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), start: null };
    },
  };
}
