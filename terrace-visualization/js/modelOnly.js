/** ファイル概要: 模型専用画面を起動し、時間帯別の人型と場所コードリングを3D表示する。 */
import { createTerraceView } from "./mapView.js?v=20261123-ring-focus1";
import { loadTerraceModel } from "./model.js?v=20261123-top-pink1";
import { bindModelViewSwitch } from "./modelViewSwitch.js?v=20261117-focus2d1";
import { createPeopleDemo } from "./peopleDemo.js?v=20261123-crossfade1";
import { createPlaceRegionRings } from "./placeRegionRings.js?v=20261123-ring-fields1";
import { bindPeoplePeriodControls } from "./peoplePeriodControls.js?v=20261123-crossfade1";
import { createActivityMeshLayer } from "./activityMeshLayer.js?v=20261123-crossfade1";
import { createTerraceTopAppearance } from "./terraceTopAppearance.js?v=20261123-tag-dial1";
import { TERRACE_MESH_PROJECT } from "./config.js?v=20261123-deck-grid1";
import { bindTerraceInspection } from "./terraceInspection.js?v=20261123-ring-fields1";

const loading = document.querySelector("#load-state");
const message = document.querySelector("#load-message");
const retry = document.querySelector("#retry");
retry.addEventListener("click", () => location.reload());
try {
  const canvas = document.querySelector("#map");
  let periodControls = null;
  let topAppearance = null;
  const view = createTerraceView(canvas, (mode) => {
    topAppearance?.setVisible(mode === "2d");
    document.querySelector(".model-only").dataset.mapView = mode;
    periodControls?.setMode(mode);
  }, { zoomLocked: true, returnAngle: true });
  const model = await loadTerraceModel(view.scene, (event) => {
    message.textContent = event.lengthComputable ? `モデルを読み込み中 ${Math.round(event.loaded / event.total * 100)}%` : "モデルを読み込み中";
  }, { stationOcclusion: true });
  view.setBounds(model.bounds, model.tourBounds, model.deckBounds, model.topDownBounds);
  const activityMesh = createActivityMeshLayer(view, model, TERRACE_MESH_PROJECT);
  view.onAnimate(activityMesh.animate);
  topAppearance = createTerraceTopAppearance(view, model, activityMesh);
  view.onBeforeRender(model.updateForCamera);
  const rings = createPlaceRegionRings(view.scene, model.regionSources, model.focusMeshes, canvas, view.getCamera);
  view.onAnimate(rings.animate);
  const people = createPeopleDemo({ view, model });
  bindModelViewSwitch(view);
  periodControls = bindPeoplePeriodControls({
    people,
    rings,
    activityMesh,
    inspection: bindTerraceInspection({ canvas, rings, activityMesh, view }),
    onError(error) { console.warn("Terrace people demo data unavailable", error); },
  });
  view.onAnimate(periodControls.animate);
  const startIn3d = document.querySelector('[data-map-view="3d"]').getAttribute("aria-pressed") === "true";
  periodControls.setMode(startIn3d ? "3d" : "2d");
  loading.hidden = true;
  document.querySelector(".model-mode-tools").hidden = false;
} catch (error) {
  console.error("Terrace model initialization failed", error);
  loading.classList.add("is-error");
  message.textContent = "モデルを読み込めませんでした。もう一度お試しください。";
  retry.hidden = false;
}
