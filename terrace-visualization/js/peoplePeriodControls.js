/**
 * ファイル概要: 10月23日の観察記録を3時間帯に分け、人型デモの表示と再生を操作する。
 */
import { createIcons, Play, Pause } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";
import { loadTerraceObservations } from "./observationData.js?v=20261123-sankey1";
import { filterTerraceObservations } from "./observationModel.js?v=20261123-ring-categories1";
import { buildPlaceCatalog } from "./placeSummaryModel.js";
import { advancePeriodPlayback, PERIOD_DURATION_MS } from "./periodPlayback.js";

const PERIODS = ["18–20", "20–22", "22–24"];

export function bindPeoplePeriodControls({ people, impressionCloud, activityMesh, sankey, inspection, onError = () => {} }) {
  const dial = document.querySelector(".people-period-control");
  const buttons = [...dial.querySelectorAll("[data-people-period]")];
  const arcs = buttons.map((button) => button.querySelector(".period-arc-progress"));
  const current = dial.querySelector("#selected-people-period");
  const pause = dial.querySelector("#people-demo-pause");
  let records = [];
  let catalog = [];
  let selectedPeriod = 0;
  let elapsed = 0;
  let lastFrame = null;
  let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let chartPaused = true;
  let mode = "3d";
  let peoplePeriod = null;
  let meshPeriod = null;
  let chartPeriod = null;
  let loaded = false;
  const isPaused = () => mode === "sankey" ? chartPaused : paused;

  function renderMode() {
    const overhead = mode === "2d";
    activityMesh.setVisible(overhead);
    if (!loaded) return;
    const selected = filterTerraceObservations(records, String(selectedPeriod));
    inspection.setContext({ mode, period: PERIODS[selectedPeriod], records: selected, catalog });
    if (mode === "sankey") {
      if (chartPeriod !== selectedPeriod) {
        sankey.update(selected, catalog);
        chartPeriod = selectedPeriod;
      }
    } else if (overhead) {
      if (meshPeriod !== selectedPeriod) {
        activityMesh.update(selected);
        meshPeriod = selectedPeriod;
      }
    } else if (peoplePeriod !== selectedPeriod) {
      people.update(selected, catalog);
      impressionCloud.update(selected);
      peoplePeriod = selectedPeriod;
    }
  }

  function renderProgress() {
    const fill = elapsed / PERIOD_DURATION_MS * 100;
    arcs[selectedPeriod].setAttribute("stroke-dasharray", `${fill.toFixed(2)} 100`);
    arcs[selectedPeriod].setAttribute("opacity", fill > 0 ? "1" : "0");
  }

  function renderPeriod() {
    current.textContent = PERIODS[selectedPeriod];
    buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === selectedPeriod)));
    renderProgress();
    renderMode();
  }

  function renderPause() {
    const label = isPaused() ? "時間帯の自動送りを再開" : "時間帯の自動送りを一時停止";
    pause.setAttribute("aria-label", label);
    pause.title = label;
    pause.innerHTML = `<i data-period-icon="${isPaused() ? "play" : "pause"}"></i>`;
    createIcons({ icons: { Play, Pause }, nameAttr: "data-period-icon", attrs: { "stroke-width": 1.7 } });
  }

  buttons.forEach((button, index) => button.addEventListener("click", () => {
    selectedPeriod = index;
    elapsed = 0;
    lastFrame = null;
    renderPeriod();
  }));
  pause.addEventListener("click", () => {
    if (mode === "sankey") chartPaused = !chartPaused;
    else paused = !paused;
    lastFrame = null;
    renderPause();
  });
  renderPause();
  dial.hidden = false;
  document.addEventListener("visibilitychange", () => { lastFrame = null; });
  const ready = loadTerraceObservations().then((data) => {
    records = data.records;
    catalog = buildPlaceCatalog(records);
    activityMesh.setRecords(records);
    loaded = true;
    pause.disabled = false;
    renderPeriod();
  }).catch((error) => {
    sankey.unavailable();
    onError(error);
  });

  return {
    animate(now) {
      if (!loaded || isPaused() || inspection.isPinned() || document.hidden) {
        lastFrame = null;
        return false;
      }
      const next = advancePeriodPlayback(selectedPeriod, elapsed, lastFrame === null ? 0 : now - lastFrame, PERIODS.length);
      lastFrame = now;
      elapsed = next.elapsed;
      if (next.period !== selectedPeriod) {
        selectedPeriod = next.period;
        renderPeriod();
      } else renderProgress();
      return false;
    },
    setMode(next) {
      mode = next;
      lastFrame = null;
      sankey.show(mode === "sankey");
      renderPause();
      people.setVisible(mode === "3d");
      impressionCloud.setVisible(mode === "3d");
      renderMode();
    },
    getSelectedPeriod() { return PERIODS[selectedPeriod]; },
    ready,
  };
}
