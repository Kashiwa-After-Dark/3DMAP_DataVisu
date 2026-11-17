/**
 * ファイル概要: 場所範囲内の模式的人型を観察フィルターと連動させ、既存描画ループで再生する。
 */
import * as THREE from "three";
import { createIcons, Play, Pause } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";
import { representativePeople } from "./peopleDemoModel.js?v=20261113-art1";
import { readPeopleAreas, createPeoplePath } from "./peopleRegionGeometry.js";
import { createFigureFactory } from "./peopleFigure.js?v=20261113-art1";
import { roadRepresentatives } from "./roadPeopleModel.js?v=20261113-art1";
import { PEOPLE_ILLUSTRATIONS } from "./peopleIllustrations.js";
import { createRoadPeoplePath } from "./roadPeopleGeometry.js";

export function createPeopleDemo({ view, model }) {
  const areas = readPeopleAreas(model.regionSources);
  const factory = createFigureFactory(() => view.invalidate());
  const layer = new THREE.Group();
  layer.name = "terrace-representative-people";
  view.scene.add(layer);
  const pathCache = new Map();
  const toggle = document.querySelector("#show-people");
  const pause = document.querySelector("#pause-people");
  const status = document.querySelector("#people-status");
  const flowStatus = document.querySelector("#people-flow-status");
  let actors = [];
  let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let elapsed = 0;
  let lastTime = null;
  function updateFigure(actor, time, camera) {
    let facingLeft = false;
    if (actor.headingPoint) {
      const start = actor.figure.root.position.clone().project(camera);
      const end = actor.headingPoint.clone().project(camera);
      facingLeft = end.x < start.x;
    }
    actor.figure.update(time + actor.phase * 10, facingLeft);
  }
  function syncPause() {
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute("aria-label", paused ? "人型アニメーションを再開" : "人型アニメーションを一時停止");
    pause.title = pause.getAttribute("aria-label");
    pause.innerHTML = `<i data-people-icon="${paused ? "play" : "pause"}"></i>`;
    createIcons({ icons: { Play, Pause }, nameAttr: "data-people-icon" });
  }
  syncPause();
  toggle.addEventListener("change", () => {
    layer.visible = toggle.checked;
    pause.disabled = !toggle.checked;
    lastTime = null;
    view.invalidate();
  });
  pause.addEventListener("click", () => { paused = !paused; lastTime = null; syncPause(); view.invalidate(); });

  function placeActor(actor, time) {
    const moving = actor.motion === "skate" || actor.motion === "walk";
    const phase = moving ? (time * (actor.motion === "walk" ? 0.04 : 0.075) + actor.phase) % 1 : 0;
    const progress = actor.direction === "to_station" ? 1 - phase : phase;
    const offset = actor.motion === "walk" ? progress * (actor.path.length - 1) : phase * actor.path.length;
    const index = Math.floor(offset);
    const next = actor.motion === "walk" ? Math.min(index + 1, actor.path.length - 1) : (index + 1) % actor.path.length;
    actor.figure.root.visible = actor.motion !== "walk" || (phase > 0.015 && phase < 0.985);
    actor.figure.root.position.lerpVectors(actor.path[index], actor.path[next], offset - index);
    if (actor.motion === "skate") {
      actor.headingPoint = actor.path[(next + 1) % actor.path.length];
    } else if (actor.motion === "walk") actor.headingPoint = actor.path[actor.direction === "to_station" ? Math.max(index - 1, 0) : Math.min(next + 1, actor.path.length - 1)];
    updateFigure(actor, time, view.getCamera());
  }
  view.onBeforeRender((camera) => {
    camera.updateMatrixWorld();
    for (const actor of actors) updateFigure(actor, elapsed, camera);
  });
  view.onAnimate((time) => {
    if (paused || !toggle.checked || !actors.some((actor) => actor.figure.animated || ["skate", "walk"].includes(actor.motion)) || document.hidden) { lastTime = null; return false; }
    if (lastTime === null) { lastTime = time; return false; }
    if (time - lastTime < 1000 / 30) return false;
    elapsed += Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;
    for (const actor of actors) placeActor(actor, elapsed);
    return true;
  });
  return {
    update(records, catalog = []) {
      layer.clear();
      actors = [];
      const places = new Map(catalog.map((place) => [place.code, place]));
      const flows = roadRepresentatives(records, areas.keys());
      const representatives = [...representativePeople(records, areas.keys()), ...flows];
      for (const item of representatives) {
        const key = item.motion === "walk" ? "TR-02:road" : `${item.code}:${item.index}:${item.motion === "skate"}`;
        if (!pathCache.has(key)) {
          const triangles = areas.get(item.code);
          let path = null;
          if (item.motion === "walk") path = createRoadPeoplePath(triangles, model.stationAnchor, model.focusMeshes, model.peopleObstacles);
          else for (let attempt = 0; attempt < Math.min(8, triangles.length); attempt += 1) {
            const triangle = triangles[(attempt + item.index) % triangles.length];
            path = createPeoplePath(triangle.points, model.focusMeshes, item.motion === "skate", model.peopleObstacles);
            if (path) break;
          }
          pathCache.set(key, path);
        }
        const path = pathCache.get(key);
        if (!path) continue;
        const place = places.get(item.code);
        const figure = factory.create(place?.color || "#a9e1d1", model.peopleHeight, item.motion, item.illustration);
        figure.root.name = `${item.code}: ${item.label}`;
        const actor = { ...item, figure, path, phase: (actors.length * 0.37) % 1 };
        actors.push(actor);
        layer.add(figure.root);
        placeActor(actor, elapsed);
      }
      const count = new Set(actors.map((actor) => actor.code)).size;
      status.textContent = actors.length ? `${count}エリア · ${actors.length}代表動作` : "表示できる行動記録なし";
      status.title = actors.map((actor) => `${actor.code} ${places.get(actor.code)?.label || ""}: ${actor.label}（観察${actor.count}件）${actor.illustration ? ` / 絵: ${PEOPLE_ILLUSTRATIONS[actor.illustration].label}` : ""}`).join("\n");
      flowStatus.textContent = flows.length ? `TR-02 · 駅へ${flows.find((f) => f.direction === "to_station")?.count || 0}件 / 駅から${flows.find((f) => f.direction === "from_station")?.count || 0}件` : "TR-02 · 方向が分かる移動記録なし";
      if (flows.length && !actors.some((actor) => actor.motion === "walk")) flowStatus.textContent += "（安全な表示経路なし）";
      flowStatus.title = "選択中のテラス観察記録の保存済み方向を、TR-02の道で模式表示。元の場所コードは変更していません。";
      view.invalidate();
    },
  };
}
