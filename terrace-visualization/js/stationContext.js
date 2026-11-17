/** ファイル概要: 模型の柏駅ラベルを表示し、クリックを駅前モニターへつなぐ。 */
import * as THREE from "three";

export function createStationContext({ view, date, anchorPosition, isVisible = () => true, onActivate, isActive = () => false }) {
  const canvas = document.querySelector("#map");
  const root = document.createElement("div");
  root.className = "station-context";
  const anchor = document.createElement("button");
  anchor.type = "button";
  anchor.className = "station-anchor";
  anchor.textContent = "柏駅";
  anchor.title = `${date}の情報を模型内モニターに表示`;
  anchor.setAttribute("aria-pressed", "false");
  anchor.addEventListener("click", () => onActivate?.());
  root.append(anchor);
  document.querySelector("#app").append(root);
  const world = new THREE.Vector3(anchorPosition.x, anchorPosition.y, anchorPosition.z);
  const projected = new THREE.Vector3();
  view.onRender(() => {
    projected.copy(world).project(view.getCamera());
    const rect = canvas.getBoundingClientRect();
    root.hidden = !isVisible() || projected.z <= -1 || projected.z >= 1 || Math.abs(projected.x) >= 1 || Math.abs(projected.y) >= 1;
    anchor.setAttribute("aria-pressed", String(isActive()));
    if (root.hidden) return;
    anchor.style.left = `${rect.left + (projected.x + 1) * rect.width / 2}px`;
    anchor.style.top = `${rect.top + (1 - projected.y) * rect.height / 2}px`;
  });
  view.invalidate();
}
