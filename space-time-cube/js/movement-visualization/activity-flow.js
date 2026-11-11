/**
 * ファイル概要: 移動ルート、滞在、再生位置、駅方向表示をまとめて制御する。
 */
import * as THREE from "three";
import { getFlowPeriod } from "./average-route-model.js?v=20261029-03";
import { buildSpecifiedRouteModel } from "./specified-activity-route.js?v=20261029-01";
import { KASHIWA_STATION } from "./kashiwa-road-reference.js?v=20261029-01";
import { createRouteMotion } from "./flow-arrow-motion.js?v=20261029-01";
import { createActivityTrips } from "./activity-trips.js?v=20261109-staying1";
import { createActivityPlaybackHead } from "./activity-playback-head.js?v=20261029-01";
import { createRouteActivityLine } from "./route-activity-line.js?v=20261109-dots1";
import { collectStationDirections, directionSymbols } from "./station-direction-model.js?v=20261101-02";
import { routeDirectionBins } from "./route-direction-color.js?v=20261102-local-gradient1";
import { collectStayingActivities, applyStayingStyle, isInStayingZone } from "./staying-activity-model.js";
import { createStayingActivityPoints } from "./staying-activity-points.js";
import { createActivityLayerFilter } from "./activity-layer-filter.js";

const COLORS = { to_station: 0x88cfed, from_station: 0xefba9b };

export function createActivityFlow({ parent, tracks, memos, project, startTime, endTime, groundHeight, heightForTime }) {
  const model = buildSpecifiedRouteModel({ project, station: KASHIWA_STATION, startTime, endTime });
  const sampleRoute = createRouteMotion(model.periods[0].path);
  const located = memos.filter((memo) => memo.isPeople).map((memo, index) => ({ ...memo, flowIndex: index, world: memo.hasLocation ? project(memo) : null, original: memo }));
  const group = new THREE.Group();
  group.name = "station-direction-map";
  group.visible = false;
  parent.add(group);
  const layers = model.periods.map((period) => {
    const layer = new THREE.Group();
    layer.name = `activity-period-${period.index}`;
    layer.position.y = heightForTime((period.start + period.end) / 2);
    layer.visible = false;
    group.add(layer);
    const corridor = createRouteActivityLine([...period.cells.values()], 6);
    corridor.update(routeDirectionBins([...period.cells.values()], []));
    layer.add(corridor.line);
    const stayingPoints = createStayingActivityPoints(located.length);
    layer.add(stayingPoints.mesh);
    const trips = Object.fromEntries(Object.entries(COLORS).map(([direction, color]) => {
      const trail = createActivityTrips(color, sampleRoute);
      layer.add(trail.mesh);
      return [direction, trail];
    }));
    return { period, layer, corridor, trips, stayingPoints, lastKey: null, memos: located.filter((memo) => memo.time >= period.start && memo.time < period.end) };
  });
  const playbackHead = createActivityPlaybackHead({ parent: group, tracks, project, model, sampleRoute });
  const stationPoint = project(KASHIWA_STATION);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(stationPoint.x, groundHeight + 0.8, stationPoint.z);
  ring.renderOrder = 46;
  group.add(ring);
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const context = labelCanvas.getContext("2d");
  const texture = new THREE.CanvasTexture(labelCanvas);
  const stationLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
  stationLabel.position.set(stationPoint.x, groundHeight + 9, stationPoint.z - 10);
  stationLabel.scale.set(44, 11, 1);
  stationLabel.renderOrder = 47;
  group.add(stationLabel);
  let lastKey = null;
  let language = "ja";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const legend = document.createElement("section");
  legend.className = "station-flow-legend";
  let lastInput = null;
  const layerFilter = createActivityLayerFilter(() => { if (lastInput) update(lastInput); });
  const legendText = document.createElement("p");
  legendText.className = "station-flow-legend__description";
  legend.append(layerFilter.root, legendText);
  function syncLegend() {
    legend.dataset.presentation = "movement";
    const text = language === "en"
      ? "Blue: toward station / orange: away. Green dashed line: staying dominates (3+ records, at least 70% of observed people nearby); no direction. Colored rings: staying activities, using the activity colors above. Pink cap: observer GPS, not people's movement."
      : "青寄り：駅へ／オレンジ寄り：駅から。緑の点線：滞在優勢（近傍3件以上・延べ人数70％以上）、方向表示なし。色付きの輪：観察地点での滞在行動（上の行動色に対応）。ピンクの先端：観察者GPSで、人の移動方向ではありません。";
    if (legendText.textContent !== text) legendText.textContent = text;
  }
  function syncLanguage() {
    layerFilter.setLanguage(language);
    syncLegend();
    context.clearRect(0, 0, 256, 64);
    context.fillStyle = "#0b141d";
    context.fillRect(0, 0, 256, 64);
    context.fillStyle = "#f0f6fa";
    context.textAlign = "center";
    context.font = '24px Ubuntu, sans-serif';
    context.fillText(language === "en" ? "KASHIWA STATION" : "柏駅 / KASHIWA", 128, 42);
    texture.needsUpdate = true;
  }
  function update(input) {
    lastInput = input;
    const { mode, currentTime, rangeStart, matches } = input;
    group.visible = mode === "activity";
    if (!group.visible) return;
    const visibility = layerFilter.getVisibility();
    const period = getFlowPeriod(model, currentTime);
    const headCount = playbackHead.update({ currentTime, rangeStart, period, height: heightForTime((period.start + period.end) / 2), visible: visibility.directions, isTrackVisible: input.isTrackVisible });
    legend.dataset.headCount = String(headCount);
    const start = rangeStart;
    const end = endTime;
    const selected = located.filter((memo) => memo.time >= start && memo.time < end && memo.time <= currentTime && matches(memo.original));
    let visibleLayers = 0;
    for (const entry of layers) {
      const { period: layerPeriod, layer, corridor, trips, stayingPoints } = entry;
      const layerMemos = entry.memos.filter((memo) => memo.time >= rangeStart && memo.time <= currentTime && matches(memo.original));
      layer.visible = layerPeriod.start <= currentTime && layerPeriod.end > rangeStart && layerMemos.length > 0;
      if (!layer.visible) continue;
      const layerKey = layerMemos.map((memo) => memo.flowIndex).join(",");
      if (layerKey !== entry.lastKey) {
        entry.lastKey = layerKey;
        const layerResult = collectStationDirections({ period: layerPeriod, memos: layerMemos, currentTime, rangeStart });
        const cells = [...layerPeriod.cells.values()];
        const staying = collectStayingActivities(cells, layerMemos);
        corridor.update(applyStayingStyle(routeDirectionBins(cells, layerResult.flows), staying.dominant));
        stayingPoints.update(staying.points);
        const symbols = directionSymbols(layerResult.flows.filter((flow) => !staying.dominant.has(flow.cell.id)));
        const isBlocked = (point) => isInStayingZone(point, cells, staying.dominant);
        for (const [direction, trail] of Object.entries(trips)) trail.update(symbols.filter((flow) => flow.direction === direction), isBlocked);
      }
      corridor.line.visible = visibility.directions;
      stayingPoints.mesh.visible = visibility.activities;
      for (const trail of Object.values(trips)) {
        trail.mesh.visible = visibility.directions && trail.mesh.geometry.getAttribute("tripProgress")?.count > 0;
      }
      if (layer.visible) visibleLayers += 1;
    }
    legend.dataset.routeCount = String(visibleLayers);
    const key = `${start}:${selected.map((memo) => memo.flowIndex).join(",")}`;
    if (key === lastKey) return;
    lastKey = key;
    const result = collectStationDirections({ period: { ...period, start, end }, memos: selected, currentTime, rangeStart: start });
    legend.dataset.toStation = String(result.totals.to_station);
    legend.dataset.fromStation = String(result.totals.from_station);
  }
  syncLanguage();
  return {
    legend, update,
    getBounds() { return new THREE.Box3().setFromPoints([...model.periods[0].path, stationPoint].map((point) => new THREE.Vector3(point.x, groundHeight, point.z))); },
    animate(time) {
      if (!group.visible) return;
      for (const { layer, trips } of layers) {
        if (!layer.visible) continue;
        if (!layerFilter.getVisibility().directions) continue;
        for (const trail of Object.values(trips)) trail.animate(reducedMotion.matches ? 0 : time);
      }
    },
    setLanguage(value) { language = value; syncLanguage(); },
  };
}
