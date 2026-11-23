/**
 * ファイル概要: 10月23日の観察記録を3時間帯に分け、人型デモの表示と再生を操作する。
 */
import { createIcons, Play, Pause } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";
import { loadTerraceObservations } from "./observationData.js?v=20261123-ring-categories1";
import { filterTerraceObservations } from "./observationModel.js?v=20261123-ring-categories1";
import { buildPlaceCatalog } from "./placeSummaryModel.js";
import { advancePeriodPlayback, PERIOD_DURATION_MS } from "./periodPlayback.js";

const PERIODS = ["18–20", "20–22", "22–24"];

export function bindPeoplePeriodControls({ people, rings, activityMesh, inspection, onError = () => {} }) {
  const root = document.querySelector(".people-period-control");
  const buttons = [...root.querySelectorAll("[data-people-period]")];
  const progressArcs = buttons.map((button) => button.querySelector(".period-arc-progress"));
  const currentPeriod = root.querySelector("#selected-people-period");
  const pause = root.querySelector("#people-demo-pause");
  let records = [];
  let catalog = [];
  let selectedPeriod = 0;
  let elapsed = 0;
  let lastFrame = null;
  let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mode = "3d";
  let peoplePeriod = null;
  let meshPeriod = null;
  let loaded = false;

  function renderMode() {
    const overhead = mode === "2d";
    root.dataset.view = mode;
    activityMesh.setVisible(overhead);
    if (!loaded) return;
    const selected = filterTerraceObservations(records, String(selectedPeriod));
    inspection.setContext({ mode, period: PERIODS[selectedPeriod], records: selected, catalog });
    if (overhead) {
      if (meshPeriod !== selectedPeriod) {
        activityMesh.update(selected);
        meshPeriod = selectedPeriod;
      }
    } else if (peoplePeriod !== selectedPeriod) {
      rings.update(selected);
      people.update(selected, catalog);
      peoplePeriod = selectedPeriod;
    }
  }

  function renderPeriod() {
    renderMode();
    currentPeriod.textContent = PERIODS[selectedPeriod];
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.peoplePeriod) === selectedPeriod)));
  }

  function renderProgress() {
    const fill = elapsed / PERIOD_DURATION_MS * 100;
    const arc = progressArcs[selectedPeriod];
    arc.setAttribute("stroke-dasharray", `${fill.toFixed(2)} 100`);
    arc.setAttribute("opacity", fill > 0 ? "1" : "0");
  }

  function syncPause() {
    const label = "時間帯の自動送り" + (paused ? "を再開" : "を一時停止");
    pause.setAttribute("aria-label", label);
    pause.title = label;
    pause.innerHTML = `<i data-period-icon="${paused ? "play" : "pause"}"></i>`;
    createIcons({ icons: { Play, Pause }, nameAttr: "data-period-icon", attrs: { "stroke-width": 1.7 } });
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    selectedPeriod = Number(button.dataset.peoplePeriod);
    elapsed = 0;
    lastFrame = null;
    renderProgress();
    renderPeriod();
  }));
  pause.addEventListener("click", () => {
    paused = !paused;
    lastFrame = null;
    syncPause();
  });
  document.addEventListener("visibilitychange", () => { lastFrame = null; });
  root.hidden = false;
  syncPause();
  rings.setVisible(true);
  const ready = loadTerraceObservations().then((data) => {
    records = data.records;
    catalog = buildPlaceCatalog(records);
    rings.setRecords(records);
    activityMesh.setRecords(records);
    loaded = true;
    pause.disabled = false;
    renderPeriod();
  }).catch((error) => {
    onError(error);
  });

  return {
    animate(now) {
      if (!loaded || paused || inspection.isPinned() || document.hidden) {
        lastFrame = null;
        return false;
      }
      const next = advancePeriodPlayback(selectedPeriod, elapsed, lastFrame === null ? 0 : now - lastFrame, PERIODS.length);
      lastFrame = now;
      elapsed = next.elapsed;
      if (next.period !== selectedPeriod) {
        selectedPeriod = next.period;
        renderProgress();
        renderPeriod();
      } else {
        renderProgress();
      }
      return false;
    },
    setMode(next) {
      mode = next;
      people.setVisible(mode === "3d");
      rings.setVisible(mode === "3d");
      renderMode();
    },
    getSelectedPeriod() { return PERIODS[selectedPeriod]; },
    ready,
  };
}
