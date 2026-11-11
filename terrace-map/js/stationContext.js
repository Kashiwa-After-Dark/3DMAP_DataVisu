import * as THREE from "three";
import { projectLocation } from "./geoProjection.js";
import { getStationContext } from "./stationContextData.js";

export function createStationContext({ view, date, anchorPosition, isVisible = () => true }) {
  const data = getStationContext(date);
  if (!data) return;
  const canvas = document.querySelector("#map");
  const root = document.createElement("div");
  root.className = "station-context";
  root.innerHTML = `<button type="button" class="station-anchor" aria-expanded="false" aria-controls="station-context-panel">柏駅</button>
    <section id="station-context-panel" class="station-context-panel" aria-label="柏駅の調査日情報" hidden>
      <header><div><h2>柏駅</h2><p>${data.date} · 調査日の周辺状況</p></div><button type="button" class="station-close" aria-label="駅情報を閉じる">×</button></header>
      <h3>電車の運行</h3><ul class="station-operation"></ul><p class="station-note"></p>
      <h3>天気・気温 <a class="weather-source" target="_blank" rel="noopener noreferrer">気象庁</a></h3>
      <p class="station-weather-summary">18–24時：降水の記録なし<br>気温 15.8–16.4℃ ／ 風速 0.3–1.4m/s</p>
      <p class="station-weather-location"></p>
      <div class="station-weather-hours"></div>
      <p class="station-note">柏駅そのものの観測値ではありません。夜間の晴れ・曇りはこの値から判定していません。</p>
    </section>`;
  document.querySelector("#app").append(root);
  const anchor = root.querySelector(".station-anchor");
  const panel = root.querySelector("section");
  for (const operation of data.operation) {
    const item = document.createElement("li");
    const name = document.createElement("b");
    name.textContent = operation.name;
    const text = document.createElement("span");
    text.textContent = operation.text;
    const source = document.createElement("a");
    source.href = operation.source;
    source.textContent = operation.label;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    item.append(name, text, source);
    root.querySelector("ul").append(item);
  }
  root.querySelector(".station-note").textContent = data.operationNote;
  root.querySelector(".weather-source").href = data.weather.source;
  root.querySelector(".station-weather-location").textContent = data.weather.station;
  for (const hour of data.weather.hours) {
    const item = document.createElement("span");
    item.textContent = `${hour.hour}時 ${hour.temperature.toFixed(1)}℃`;
    root.querySelector(".station-weather-hours").append(item);
  }
  const location = anchorPosition || projectLocation(data.station);
  const world = new THREE.Vector3(location.x, anchorPosition ? location.y : 25, location.z);
  const projected = new THREE.Vector3();
  let pinned = false;
  let closeTimer;
  function show(open) {
    clearTimeout(closeTimer);
    panel.hidden = !open;
    anchor.setAttribute("aria-expanded", String(open));
  }
  function dismiss() { pinned = false; show(false); }
  anchor.addEventListener("pointerenter", () => show(true));
  anchor.addEventListener("focus", () => show(true));
  anchor.addEventListener("click", () => { pinned = !pinned; show(pinned); });
  root.addEventListener("pointerenter", () => clearTimeout(closeTimer));
  root.addEventListener("pointerleave", () => { if (!pinned) closeTimer = setTimeout(() => show(false), 180); });
  root.addEventListener("focusout", (event) => { if (!pinned && !root.contains(event.relatedTarget)) show(false); });
  root.querySelector(".station-close").addEventListener("click", dismiss);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !panel.hidden) dismiss(); });
  canvas.addEventListener("pointerdown", dismiss);
  view.onRender(() => {
    projected.copy(world).project(view.getCamera());
    const rect = canvas.getBoundingClientRect();
    const inView = isVisible() && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
    root.hidden = !inView;
    if (!inView) { dismiss(); return; }
    const x = rect.left + (projected.x + 1) * rect.width / 2;
    const y = rect.top + (1 - projected.y) * rect.height / 2;
    anchor.style.left = `${x}px`;
    anchor.style.top = `${y}px`;
    // Keep the historical information within the map's visible area, not over the data list.
    const width = Math.min(350, rect.width - 24);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(12, Math.min(x + 20, rect.right - width - 12))}px`;
    panel.style.top = `${Math.max(innerWidth <= 600 ? 68 : 76, Math.min(y + 20, rect.bottom - Math.min(510, rect.height - 100) - 16))}px`;
    panel.style.maxHeight = `${Math.max(160, Math.min(510, rect.bottom - Number.parseFloat(panel.style.top) - (innerWidth <= 760 ? 16 : 58)))}px`;
  });
  view.invalidate();
}
