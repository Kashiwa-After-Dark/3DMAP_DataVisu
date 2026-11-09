import { createIcons, ZoomIn, ZoomOut, LocateFixed, Maximize, List, RefreshCw } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";

export function bindToolbar(view, model) {
  createIcons({ icons: { ZoomIn, ZoomOut, LocateFixed, Maximize, List, RefreshCw } });
  document.querySelector("#view-3d").addEventListener("click", () => view.setMode("3d"));
  document.querySelector("#view-2d").addEventListener("click", () => view.setMode("2d"));
  document.querySelector("#zoom-in").addEventListener("click", () => view.zoom(1.2));
  document.querySelector("#zoom-out").addEventListener("click", () => view.zoom(1 / 1.2));
  document.querySelector("#reset-view").addEventListener("click", view.reset);
  document.querySelector("#show-context").addEventListener("change", (event) => {
    model.setContextVisible(event.target.checked);
    view.invalidate();
  });
  const fullscreen = document.querySelector("#fullscreen");
  if (!document.fullscreenEnabled) fullscreen.hidden = true;
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector("#app").requestFullscreen();
    } catch {
      fullscreen.title = "このブラウザでは全画面表示を利用できません";
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const active = Boolean(document.fullscreenElement);
    fullscreen.setAttribute("aria-pressed", String(active));
    fullscreen.setAttribute("aria-label", active ? "全画面表示を終了" : "全画面表示");
    fullscreen.title = active ? "全画面表示を終了" : "全画面表示";
  });
}

export function syncViewButtons(mode) {
  document.querySelector("#view-3d").setAttribute("aria-pressed", String(mode === "3d"));
  document.querySelector("#view-2d").setAttribute("aria-pressed", String(mode === "2d"));
  document.querySelector("#view-status").textContent = mode === "3d" ? "斜め視点" : "真上視点";
}
