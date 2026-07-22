import * as THREE from "three";

export function create2DMapController({
  canvas,
  camera,
  controls,
  timeBaseY,
  timeAxisHeight,
}) {
  const focus = new THREE.Vector3();
  let active = false;
  let viewDistance = 500;
  let azimuth = Math.PI / 2;
  let interactionMode = null;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let graphWidth = 1;
  let graphHeight = 1;
  let viewHeight = 1;
  let zoom = 1.46;

  canvas.addEventListener("pointerdown", startInteraction, true);
  canvas.addEventListener("pointermove", moveView, true);
  canvas.addEventListener("pointerup", stopInteraction, true);
  canvas.addEventListener("pointercancel", stopInteraction, true);
  canvas.addEventListener("wheel", zoomGraph, { capture: true, passive: false });
  canvas.addEventListener("contextmenu", preventContextMenu);

  function activate({ focus: mapFocus, maxSize }) {
    active = true;
    azimuth = Math.PI / 2;
    zoom = 1.46;
    graphWidth = Math.max(maxSize * 0.78, 120);
    graphHeight = Math.max(timeAxisHeight * 1.24, 120);
    focus.set(
      mapFocus.x + graphWidth * 0.22,
      timeBaseY + timeAxisHeight * 0.46,
      mapFocus.z,
    );

    viewDistance = Math.max(maxSize * 2.2, timeAxisHeight * 3, 500);
    camera.near = 0.1;
    camera.far = viewDistance * 3;
    applyOrbitView();
    controls.enabled = false;
    canvas.dataset.mapView = "2d";
    resize(window.innerWidth, window.innerHeight);
    return camera;
  }

  function deactivate() {
    active = false;
    interactionMode = null;
    delete canvas.dataset.mapView;
  }

  function resize(width, height) {
    if (!active) return;
    const aspect = Math.max(width / height, 0.01);
    viewHeight = Math.max(graphHeight, graphWidth / aspect) * zoom;
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  function startInteraction(event) {
    if (!active || (event.button !== 0 && event.button !== 1 && event.button !== 2)) return;
    interactionMode = event.button === 0 && !event.shiftKey ? "orbit" : "pan";
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function moveView(event) {
    if (!active || !interactionMode) return;
    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    if (interactionMode === "orbit") {
      azimuth -= deltaX * 0.008;
      applyOrbitView();
    } else {
      panView(deltaX, deltaY);
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function stopInteraction(event) {
    if (!active || !interactionMode) return;
    interactionMode = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function zoomGraph(event) {
    if (!active) return;
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(event.deltaY * 0.001), 0.35, 3.5);
    resize(window.innerWidth, window.innerHeight);
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function applyOrbitView() {
    camera.position.set(
      focus.x + viewDistance * Math.cos(azimuth),
      focus.y,
      focus.z + viewDistance * Math.sin(azimuth),
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(focus);
    camera.updateMatrixWorld();
  }

  function panView(deltaX, deltaY) {
    const unitsPerPixel = viewHeight / Math.max(canvas.clientHeight, 1);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const offset = right.multiplyScalar(-deltaX * unitsPerPixel)
      .add(up.multiplyScalar(deltaY * unitsPerPixel));
    focus.add(offset);
    camera.position.add(offset);
  }

  function preventContextMenu(event) {
    if (active) event.preventDefault();
  }

  return { activate, deactivate, resize };
}
