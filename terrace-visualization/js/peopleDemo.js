/**
 * ファイル概要: 場所範囲内の模式的人型を観察フィルターと連動させ、既存描画ループで再生する。
 */
import * as THREE from "three";
import { createIcons, Play, Pause } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";
import { benchRepresentatives, representativePeople } from "./peopleDemoModel.js?v=20261123-bench-display1";
import { findBenchSeats } from "./coupleBenchSeats.js?v=20261123-bench-left1";
import { readPeopleAreas, createPeoplePath } from "./peopleRegionGeometry.js";
import { createFigureFactory } from "./peopleFigure.js?v=20261123-crossfade1";
import { roadRepresentatives } from "./roadPeopleModel.js?v=20261113-art1";
import { PEOPLE_ILLUSTRATIONS } from "./peopleIllustrations.js?v=20261118-tagged-protest1";
import { createRoadPeoplePaths } from "./roadPeopleGeometry.js?v=20261123-stop-motion1";
import { protestDisplayPaths } from "./protestDisplayPositions.js";

export function createPeopleDemo({ view, model }) {
  const areas = readPeopleAreas(model.regionSources);
  const lampObstacles = [];
  const seatObstacles = [];
  const seatDisplayObstacles = [];
  const benchObstacles = [];
  view.scene.traverse((object) => {
    const isLamp = /^Lamp_And_Circular_Base_/i.test(object.name);
    const isBench = /^Benches_/i.test(object.name);
    const isPlanting = /^Planting_/i.test(object.name);
    if (!isLamp && !isBench && !isPlanting) return;
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;
    seatDisplayObstacles.push(bounds.clone());
    if (isLamp) {
      seatObstacles.push(bounds.clone().expandByScalar(model.peopleHeight * 0.2));
      lampObstacles.push(bounds.expandByScalar(model.peopleHeight * 0.65));
    } else if (isBench) benchObstacles.push(bounds.expandByScalar(model.peopleHeight * 0.5));
  });
  const obstacles = [...model.peopleObstacles, ...lampObstacles];
  const benchSeats = findBenchSeats(view.scene, seatObstacles, model.focusMeshes, seatDisplayObstacles);
  const protestPaths = protestDisplayPaths(model.focusMeshes);
  let roadPaths;
  const walkerPaths = new Map();
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
  let retiring = [];
  let transitionStart = null;
  let initialized = false;
  let visible = true;
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
    actor.figure.update(time * (actor.motion === "walk" ? 0.7 : 1) + actor.phase * 10, facingLeft, actor.opacity);
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
    const phase = moving ? (time * (actor.walkRate ?? 0.075) + actor.phase) % 1 : 0;
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
    if (!layer.visible) return;
    camera.updateMatrixWorld();
    for (const actor of actors) updateFigure(actor, elapsed, camera);
    for (const actor of retiring) updateFigure(actor, elapsed, camera);
  });
  function discard(list) {
    for (const actor of list) {
      layer.remove(actor.figure.root);
      actor.figure.release();
    }
  }
  view.onAnimate((time) => {
    if (!visible || !toggle.checked || document.hidden) { lastTime = null; return false; }
    const transitioning = transitionStart !== null;
    const moving = !paused && actors.concat(retiring).some((actor) => actor.figure.animated || ["skate", "walk"].includes(actor.motion));
    if (!transitioning && !moving) { lastTime = null; return false; }
    if (lastTime === null) { lastTime = time; return false; }
    if (time - lastTime < 1000 / 30) return false;
    if (moving) elapsed += Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;
    if (transitioning) {
      const t = Math.min(1, Math.max(0, (time - transitionStart) / 650));
      const fade = t * t * (3 - 2 * t);
      for (const actor of actors) actor.opacity = fade;
      for (const actor of retiring) actor.opacity = actor.fadeFrom * (1 - fade);
      if (t === 1) {
        discard(retiring);
        retiring = [];
        transitionStart = null;
        for (const actor of actors) actor.figure.release();
      }
    }
    if (moving) {
      for (const actor of actors) placeActor(actor, elapsed);
      for (const actor of retiring) placeActor(actor, elapsed);
    }
    return true;
  });
  return {
    getRoutes() { return (roadPaths ?? []).map(({ getArrowPaths }) => getArrowPaths()).filter(({ to_station }) => to_station.length > 1); },
    setVisible(next) {
      visible = Boolean(next);
      layer.visible = visible && toggle.checked;
      lastTime = null;
      view.invalidate();
    },
    setPaused(next) {
      paused = Boolean(next);
      lastTime = null;
      syncPause();
      view.invalidate();
    },
    isPaused() { return paused; },
    update(records, catalog = []) {
      const fade = initialized && visible && toggle.checked && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      initialized = true;
      if (fade) {
        retiring = retiring.concat(actors);
        for (const actor of retiring) actor.fadeFrom = actor.opacity;
      } else {
        discard(retiring);
        discard(actors);
        retiring = [];
      }
      actors = [];
      const places = new Map(catalog.map((place) => [place.code, place]));
      const flows = roadRepresentatives(records, areas.keys());
      const representatives = [...representativePeople(records, areas.keys()), ...flows];
      const seated = benchRepresentatives(records).slice(0, benchSeats.length);
      for (const [index, item] of seated.entries()) addActor(item, [benchSeats[index]], index * 0.37);
      for (const item of representatives) {
        if (!item.illustration) continue;
        if (seated.length && item.code === "TR-05" && item.illustration.startsWith("bench-")) continue;
        if (item.motion === "walk") {
          // The centered walk PNGs have transparent margins; their visible half-width is below 30% of the sprite.
          roadPaths ??= createRoadPeoplePaths(areas.get("TR-02"), model.focusMeshes, lampObstacles, benchObstacles, model.peopleHeight * 0.31);
          for (const [routeIndex, { pathFor, length, slots }] of roadPaths.entries()) {
            for (let slot = 0; slot < slots; slot++) {
              const seed = 1 + routeIndex * 32 + item.index * 8 + slot;
              if (!walkerPaths.has(seed)) walkerPaths.set(seed, pathFor(seed));
              addActor(item, walkerPaths.get(seed), (slot / slots + routeIndex * 0.12 + item.index * 0.07) % 1, (0.26 + (seed % 5) * 0.008) / length);
            }
          }
          continue;
        }
        const fixedPaths = item.illustration === "protest" ? protestPaths : [];
        const key = `${item.code}:${item.index}:${item.motion === "skate"}`;
        if (!fixedPaths.length && !pathCache.has(key)) {
          const triangles = areas.get(item.code);
          let path = null;
          for (let attempt = 0; attempt < Math.min(8, triangles.length); attempt += 1) {
            const triangle = triangles[(attempt + item.index) % triangles.length];
            path = createPeoplePath(triangle.points, model.focusMeshes, item.motion === "skate", obstacles);
            if (path) break;
          }
          pathCache.set(key, path);
        }
        const path = pathCache.get(key);
        if (!fixedPaths.length && !path) continue;
        for (const actorPath of fixedPaths.length ? fixedPaths : [path]) {
          addActor(item, actorPath, (actors.length * 0.37) % 1);
        }
      }
      function addActor(item, path, phase, walkRate) {
        const figure = factory.create(places.get(item.code)?.color || "#a9e1d1", model.peopleHeight, item.motion, item.illustration);
        figure.root.name = `${item.code}: ${item.label}`;
        const actor = { ...item, figure, path, phase, walkRate, opacity: fade ? 0 : 1 };
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
      transitionStart = fade ? performance.now() : null;
      view.invalidate();
      return flows;
    },
  };
}
