/** ファイル概要: 柏駅の選択に応じ、模型内のモニターだけへ調査日情報を表示する。 */
import * as THREE from "three";
import { getStationContext } from "./stationContextData.js";
import { monitorContent } from "./stationMonitorContent.js";

export function createStationMonitor({ view, model, date }) {
  const surface = model.monitorSurface;
  const button = document.querySelector("#station-monitor");
  if (!surface) { button.hidden = true; return { update() {}, open() {}, isActive() { return false; } }; }
  const data = getStationContext(date);
  surface.geometry.computeBoundingBox();
  const box = surface.geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  center.z = box.min.z - 0.003;
  const image = document.createElement("canvas");
  image.width = 1536;
  image.height = 614;
  const ctx = image.getContext("2d");
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.98, size.y * 0.96),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.name = "terrace-station-information-screen";
  screen.position.copy(center);
  screen.rotation.y = Math.PI;
  surface.add(screen);
  const status = document.createElement("p");
  status.className = "monitor-announcement";
  status.setAttribute("role", "status");
  document.querySelector("#app").append(status);
  let active = false;
  let records = [];
  let period = "all";
  function draw() {
    const content = monitorContent(data, records, period);
    ctx.fillStyle = "#091a22";
    ctx.fillRect(0, 0, image.width, image.height);
    function line(text, y, font = 32, color = "#f3f7f6") {
      ctx.font = `${font}px sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(text, 56, y, 1424);
    }
    line("KASHIWA STATION / 柏駅", 70, 46, "#82d5cb");
    if (!active) {
      line("TERRACE OBSERVATIONS", 286, 44);
      line(date, 370, 36, "#b7c5ca");
    } else {
      line(`${content.date}   ${content.period} / 観察記録 ${content.count}件`, 128, 35);
      line(`18–24時 ${content.weather}`, 203, 43);
      line(`${content.rain} / 近隣：我孫子`, 252, 31);
      content.operations.forEach((text, i) => line(text, 322 + i * 54, 28));
      line("保存済み参考資料・未検証 / ライブ情報ではありません", 515, 29, "#e5c7a3");
      line("資料：気象庁・JR・東武 / 路線全体の記録、柏駅個別ではありません", 564, 26, "#b7c5ca");
    }
    texture.needsUpdate = true;
    view.invalidate();
  }
  function setActive(next) {
    active = next;
    model.setStationInfoActive(active);
    button.setAttribute("aria-pressed", String(active));
    status.textContent = active ? `${date}の駅情報を模型内モニターに表示しました。ライブ情報ではありません。` : "モニターの駅情報を閉じました。";
    draw();
  }
  function open() {
    // Keep the composition and the station model instead of isolating the screen.
    view.autoCamera.stop();
    setActive(true);
  }
  button.addEventListener("click", open);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && active) setActive(false); });
  const canvas = document.querySelector("#map");
  const ray = new THREE.Raycaster();
  let down = null;
  canvas.addEventListener("pointerdown", (event) => { down = event.button === 0 ? { x: event.clientX, y: event.clientY } : null; });
  canvas.addEventListener("pointercancel", () => { down = null; });
  canvas.addEventListener("pointerup", (event) => {
    const start = down;
    down = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5 || !model.isStationVisible()) return;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), view.getCamera());
    if (ray.intersectObject(model.stationObject, true).some((hit) => hit.object.isMesh)) open();
  });
  draw();
  return { open, isActive() { return active; },
    update(nextRecords = [], nextPeriod = "all") { records = nextRecords; period = nextPeriod; draw(); } };
}
