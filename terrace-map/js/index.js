import { createTerraceView } from "./mapView.js?v=20261111-model1";
import { loadTerraceModel } from "./model.js?v=20261111-model1";
import { bindToolbar, syncViewButtons } from "./toolbar.js";
import { loadTerraceObservations } from "./observationData.js";
import { createObservationPanel } from "./observationPanel.js?v=20261111-model1";
import { createObservationMarkers } from "./observationMarkers.js?v=20261109-place1";
import { createStationContext } from "./stationContext.js?v=20261111-model1";
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
  view.setBounds(model.bounds);
  bindToolbar(view, model);
  loading.hidden = true;
  let markers = null;
  const panel = createObservationPanel({
    mapPlacementAvailable: model.georeferenced,
    onChange(records, code, catalog) { markers?.update(records, code, catalog); },
    onSelect(record) { markers?.select(record?.id); },
  });
  if (model.georeferenced) markers = createObservationMarkers({ view, focusMeshes: model.focusMeshes, onSelect(id) { panel.select(id); } });
  if (model.stationAnchor) createStationContext({ view, date: PUBLIC_SURVEY_DATE, anchorPosition: model.stationAnchor, isVisible: model.isStationVisible });
  document.querySelector("#survey-date").textContent = PUBLIC_SURVEY_DATE;
  const reload = document.querySelector("#reload-data");
  async function refresh() {
    reload.disabled = true;
    panel.loading();
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
