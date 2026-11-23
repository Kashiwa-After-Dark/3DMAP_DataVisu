/** ファイル概要: テラス模型、時間帯別の人型、2D行動メッシュとサンキー図を起動する。 */
import { createTerraceView } from "./mapView.js?v=20261123-detail2d1";
import { loadTerraceModel } from "./model.js?v=20261123-soft-chroma2";
import { bindModelViewSwitch } from "./modelViewSwitch.js?v=20261123-sankey1";
import { createPeopleDemo } from "./peopleDemo.js?v=20261123-crossfade1";
import { bindPeoplePeriodControls } from "./peoplePeriodControls.js?v=20261123-sankey-vertical1";
import { createActivityMeshLayer } from "./activityMeshLayer.js?v=20261123-deck-legend1";
import { createImpressionCloud } from "./impressionCloud.js?v=20261123-dotgothic1";
import { createTerraceTopAppearance } from "./terraceTopAppearance.js?v=20261123-tag-dial1";
import { TERRACE_MESH_PROJECT } from "./config.js?v=20261123-deck-grid1";
import { bindTerraceInspection } from "./terraceInspection.js?v=20261123-mesh-cards1";
import { createTerraceSankey } from "./terraceSankey.js?v=20261123-deck-legend1";

const loading = document.querySelector("#load-state");
const message = document.querySelector("#load-message");
const retry = document.querySelector("#retry");
retry.addEventListener("click", () => location.reload());
try {
  const canvas = document.querySelector("#map");
  const toolbar = document.querySelector(".model-mode-tools");
  const app = document.querySelector(".model-only");
  let periodControls = null;
  let topAppearance = null;
  const view = createTerraceView(canvas, (mode) => {
    topAppearance?.setVisible(mode === "2d");
    app.dataset.mapView = mode;
    periodControls?.setMode(mode);
  }, { zoomLocked: true, returnAngle: true });
  const model = await loadTerraceModel(view.scene, (event) => {
    message.textContent = event.lengthComputable ? `モデルを読み込み中 ${Math.round(event.loaded / event.total * 100)}%` : "モデルを読み込み中";
  }, { stationOcclusion: true });
  view.setBounds(model.bounds, model.tourBounds, model.deckBounds, model.topDownBounds);
  const legend = document.querySelector(".terrace-activity-legend");
  const activityMesh = createActivityMeshLayer(view, model, TERRACE_MESH_PROJECT, (entries) => {
    legend.replaceChildren(...entries.map(({ label, color }) => {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.style.setProperty("--swatch", color);
      item.append(swatch, label);
      return item;
    }));
    legend.hidden = !entries.length;
  });
  view.onAnimate(activityMesh.animate);
  topAppearance = createTerraceTopAppearance(view, model, activityMesh);
  view.onBeforeRender(model.updateForCamera);
  const people = createPeopleDemo({ view, model });
  const impressionCloud = createImpressionCloud(view, model, canvas, [toolbar, document.querySelector(".people-period-control")]);
  const sankey = createTerraceSankey(document.querySelector("#terrace-sankey"));
  bindModelViewSwitch((mode) => {
    if (mode === "sankey") {
      app.dataset.mapView = mode;
      periodControls.setMode(mode);
    } else view.setMode(mode);
  });
  periodControls = bindPeoplePeriodControls({
    people,
    impressionCloud,
    activityMesh,
    sankey,
    inspection: bindTerraceInspection({ canvas, activityMesh }),
    onError(error) { console.warn("Terrace people demo data unavailable", error); },
  });
  view.onAnimate(periodControls.animate);
  const startIn3d = document.querySelector('[data-map-view="3d"]').getAttribute("aria-pressed") === "true";
  periodControls.setMode(startIn3d ? "3d" : "2d");
  loading.hidden = true;
  toolbar.hidden = false;
} catch (error) {
  console.error("Terrace model initialization failed", error);
  loading.classList.add("is-error");
  message.textContent = "モデルを読み込めませんでした。もう一度お試しください。";
  retry.hidden = false;
}
