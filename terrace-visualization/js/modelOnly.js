/** ファイル概要: 機能コンテナを起動せず、模型と3D/2Dスイッチだけを表示する。 */
import { createTerraceView } from "./mapView.js?v=20261117-focus2d1";
import { loadTerraceModel } from "./model.js?v=20261117-focus2d1";
import { bindModelViewSwitch } from "./modelViewSwitch.js?v=20261117-focus2d1";

const loading = document.querySelector("#load-state");
const message = document.querySelector("#load-message");
const retry = document.querySelector("#retry");
retry.addEventListener("click", () => location.reload());
try {
  const view = createTerraceView(document.querySelector("#map"), () => {});
  const model = await loadTerraceModel(view.scene, (event) => {
    message.textContent = event.lengthComputable ? `モデルを読み込み中 ${Math.round(event.loaded / event.total * 100)}%` : "モデルを読み込み中";
  }, { stationOcclusion: true });
  view.setBounds(model.bounds, model.tourBounds, model.topDownBounds);
  view.onBeforeRender(model.updateForCamera);
  bindModelViewSwitch(view);
  loading.hidden = true;
} catch (error) {
  console.error("Terrace model initialization failed", error);
  loading.classList.add("is-error");
  message.textContent = "モデルを読み込めませんでした。もう一度お試しください。";
  retry.hidden = false;
}
