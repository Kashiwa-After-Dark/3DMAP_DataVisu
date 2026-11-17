/**
 * ファイル概要: テラス可視化画面を起動し、地図、観察データ、パネルを連携する。
 */
import { createTerraceView } from "./mapView.js?v=20261116-monitor1";
import { loadTerraceModel } from "./model.js?v=20261117-station1";
import { createStationMonitor } from "./stationMonitor.js?v=20261117-station1";
import { createPeopleDemo } from "./peopleDemo.js?v=20261113-art1";
import { bindToolbar, syncViewButtons } from "./toolbar.js?v=20261116-monitor1";
import { loadTerraceObservations } from "./observationData.js?v=20261113-people2";
import { createObservationPanel } from "./observationPanel.js?v=20261111-model1";
import { createObservationMarkers } from "./observationMarkers.js?v=20261109-place1";
import { createStationContext } from "./stationContext.js?v=20261117-station1";
import { PUBLIC_SURVEY_DATE } from "../../backend/surveyConfig.js?v=20261025-01";

const loading = document.querySelector("#load-state");
const message = document.querySelector("#load-message");
const retry = document.querySelector("#retry");
retry.addEventListener("click", () => location.reload());

try {
  const view = createTerraceView(document.querySelector("#map"), syncViewButtons);
  const model = await loadTerraceModel(view.scene, (event) => {
    message.textContent = event.lengthComputable
      ? `テラスモデルを読み込み中 ${Math.round(event.loaded / event.total * 100)}%`
      : "テラスモデルを読み込み中";
  });
  view.setBounds(model.bounds, model.tourBounds);
  view.onBeforeRender(model.updateForCamera);
  bindToolbar(view, model);
  const monitor = createStationMonitor({ view, model, date: PUBLIC_SURVEY_DATE });
  const people = createPeopleDemo({ view, model });
  loading.hidden = true;
  let markers = null;
  let activePlace = "all";
  let placeCatalog = [];
  function highlightPlace(code) {
    model.selectPlace(code, placeCatalog.find((place) => place.code === code)?.color);
    view.invalidate();
  }
  const panel = createObservationPanel({
    mapPlacementAvailable: model.georeferenced,
    onChange(records, code, catalog) {
      activePlace = code;
      placeCatalog = catalog;
      highlightPlace(code);
      markers?.update(records, code, catalog);
      people.update(records, catalog);
      const period = document.querySelector("[data-period][aria-pressed='true']")?.dataset.period || "all";
      monitor.update(records, period);
    },
    onSelect(record) {
      highlightPlace(record?.placeCodes[0] || activePlace);
      markers?.select(record?.id);
    },
  });
  if (model.georeferenced) markers = createObservationMarkers({ view, focusMeshes: model.focusMeshes, onSelect(id) { panel.select(id); } });
  if (model.stationAnchor) createStationContext({ view, date: PUBLIC_SURVEY_DATE, anchorPosition: model.stationAnchor, isVisible: () => document.querySelector("#show-context").checked, onActivate: monitor.open, isActive: monitor.isActive });
  document.querySelector("#survey-date").textContent = PUBLIC_SURVEY_DATE;
  const reload = document.querySelector("#reload-data");
  async function refresh() {
    reload.disabled = true;
    panel.loading();
    people.update([]);
    monitor.update([]);
    try { panel.setData(await loadTerraceObservations()); }
    catch (error) { console.warn("Terrace observations unavailable", error); panel.error(); }
    finally { reload.disabled = false; }
  }
  reload.addEventListener("click", refresh);
  refresh();
} catch (error) {
  console.error("Terrace map initialization failed", error);
  loading.classList.add("is-error");
  message.textContent = "地図を読み込めませんでした。通信環境を確認して、もう一度お試しください。";
  retry.hidden = false;
}
