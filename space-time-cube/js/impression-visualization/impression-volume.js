/**
 * ファイル概要: 時間帯別の感情・印象件数を3Dボリュームとして表示する。
 */
import * as THREE from "three";
import { ROUTE_COORDINATES } from "../movement-visualization/specified-activity-route.js?v=20261029-01";
import { IMPRESSION_TYPES } from "../../../backend/impressionClassifier.js?v=20261029-db1";
import { createImpressionVolumeModel, collectImpressionVolumes } from "./impression-volume-model.js?v=20261029-db2";
import { createDensityDomain, buildImpressionDensity } from "./impression-density.js?v=20261029-db2";
import { createImpressionFluid } from "./impression-fluid.js?v=20261029-perf1";
import { getPerspectiveImpressionType } from "./emotion-perspective.js?v=20261029-db1";

export function createImpressionVolume({ parent, memos, project, startTime, endTime, heightForTime }) {
  const locatedMemos = memos.map((memo) => ({ ...memo, original: memo, world: memo.hasLocation ? project(memo) : null }));
  const model = createImpressionVolumeModel({ memos: locatedMemos, startTime, endTime });
  const points = ROUTE_COORDINATES.map(([lat, lon]) => project({ lat, lon }));
  const domain = createDensityDomain(points);
  const referenceMax = Math.max(1, ...model.periods.map((period) => buildImpressionDensity({ memos: period.memos, domain }).maximum));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const shape = new THREE.Shape(points.map(({ x, z }) => new THREE.Vector2(x, -z)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2);
  const edges = new THREE.EdgesGeometry(geometry);
  const group = new THREE.Group();
  group.name = "impression-route-volumes";
  group.visible = false;
  parent.add(group);
  const entries = model.periods.map((period) => {
    const layer = new THREE.Group();
    layer.position.y = heightForTime(period.start) + 2;
    group.add(layer);
    const height = Math.max(1, heightForTime(period.end) - heightForTime(period.start) - 5);
    const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x90b5c7, transparent: true, opacity: 0.3, depthWrite: false }));
    outline.scale.y = height;
    outline.renderOrder = 41;
    layer.add(outline);
    const fluid = createImpressionFluid(domain);
    fluid.mesh.position.set(domain.minX + domain.width / 2, height / 2, domain.minZ + domain.depth / 2);
    fluid.mesh.scale.set(domain.width, height, domain.depth);
    layer.add(fluid.mesh);
    return { period, layer, fluid, lastKey: null, located: 0, unplaced: 0 };
  });

  const legend = document.createElement("section");
  legend.className = "activity-flow-legend impression-volume-legend";
  const heading = document.createElement("b");
  const meaning = document.createElement("p");
  const summary = document.createElement("output");
  const counts = document.createElement("div");
  counts.className = "activity-flow-legend__directions";
  const note = document.createElement("small");
  legend.append(heading, meaning, summary, counts, note);
  let language = "ja";
  let perspective = "observer";
  const getType = (memo) => getPerspectiveImpressionType(memo, perspective);
  let lastCounts = new Map(IMPRESSION_TYPES.map(({ id }) => [id, 0]));
  let visiblePeriods = 0;
  let locatedCount = 0;
  let unplacedCount = 0;
  let legendKey = "";

  function renderLegend() {
    const nextKey = `${language}:${perspective}:${visiblePeriods}:${locatedCount}:${unplacedCount}:${[...lastCounts.values()].join(",")}`;
    if (nextKey === legendKey) return;
    legendKey = nextKey;
    const english = language === "en";
    const names = { positive: "Positive", neutral: "Neutral", negative: "Negative", unknown: "Unclassified" };
    heading.textContent = english ? (perspective === "subject" ? "SUBJECT / INFERRED EMOTION" : "OBSERVER / FEELING") : (perspective === "subject" ? "観察対象の感情のにじみ" : "観察者の感情のにじみ");
    meaning.textContent = english ? "18–20 / 20–22 / 22–24 · Color: impression / Density: local records" : "18–20 / 20–22 / 22–24 · 色：印象 ／ 濃さ：その場所の観察密度";
    const total = [...lastCounts.values()].reduce((sum, count) => sum + count, 0);
    summary.textContent = english ? `${visiblePeriods} boxes · ${locatedCount} placed / ${total} records` : `${visiblePeriods}つの箱 · 配置 ${locatedCount} / 全 ${total}件`;
    counts.replaceChildren(...IMPRESSION_TYPES.map(({ id, label, color }) => {
      const item = document.createElement("span");
      item.style.color = color;
      item.textContent = `${english ? names[id] : label} ${lastCounts.get(id)}`;
      return item;
    }));
    const caution = english ? "Saved DB classifications take priority; unanalysed records use text inference. Subject emotions remain observational estimates." : "DBの保存済み判定を優先し、未分析は文面から仮分類。対象の感情は観察からの推定です。";
    note.textContent = english ? `${unplacedCount} unplaced. ${caution} Ink motion is illustrative.` : `位置なし・範囲外 ${unplacedCount}件。${caution}にじみは演出です。`;
    legend.dataset.perspective = perspective;
    legend.dataset.recordCount = String(total);
    legend.dataset.visiblePeriods = String(visiblePeriods);
    legend.dataset.locatedCount = String(locatedCount);
    legend.dataset.unplacedCount = String(unplacedCount);
    for (const [id, count] of lastCounts) legend.dataset[id] = String(count);
  }

  function update({ mode, currentTime, rangeStart, matches }) {
    group.visible = mode === "impression";
    if (!group.visible) return;
    lastCounts = new Map(IMPRESSION_TYPES.map(({ id }) => [id, 0]));
    visiblePeriods = 0;
    locatedCount = 0;
    unplacedCount = 0;
    let visibleBoxes = 0;
    for (const entry of entries) {
      const { period, layer, fluid } = entry;
      const matchesOriginal = (memo) => matches(memo.original);
      layer.visible = period.start <= currentTime && period.end > rangeStart
        && (!period.memos.length || period.memos.some(matchesOriginal));
      if (!layer.visible) continue;
      const volumes = collectImpressionVolumes({ period, currentTime, rangeStart, matches: matchesOriginal, getType });
      visiblePeriods += 1;
      visibleBoxes += 1;
      const key = `${perspective}:` + period.memos.map((memo, index) => memo.time <= currentTime && memo.time >= rangeStart && matchesOriginal(memo) ? index : "").join(",");
      if (key !== entry.lastKey) {
        const density = buildImpressionDensity({ memos: period.memos, domain, currentTime, rangeStart, matches: matchesOriginal, referenceMax, getType });
        fluid.update(density.data);
        entry.located = density.located;
        entry.unplaced = density.unplaced;
        entry.lastKey = key;
      }
      locatedCount += entry.located;
      unplacedCount += entry.unplaced;
      volumes.forEach(({ id, count }) => {
        lastCounts.set(id, lastCounts.get(id) + count);
      });
    }
    legend.dataset.boxCount = String(visibleBoxes);
    renderLegend();
  }
  renderLegend();
  return {
    legend, update,
    animate(time) { if (group.visible) for (const { layer, fluid } of entries) if (layer.visible) fluid.animate(reducedMotion.matches ? 0 : time); },
    setLanguage(next) { language = next; renderLegend(); },
    setPerspective(next) { perspective = next === "subject" ? "subject" : "observer"; },
  };
}
