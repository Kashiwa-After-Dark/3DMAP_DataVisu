/** ファイル概要: ガラス風の縦型スイッチで3Dと真上2Dを切り替える。 */
import { createIcons, Box, Map, GitFork, Route, ChartNoAxesCombined } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";

export function bindModelViewSwitch(view) {
  createIcons({ icons: { Box, Map, GitFork, Route, ChartNoAxesCombined }, nameAttr: "data-view-icon", attrs: { "stroke-width": 1.5 } });
  const root = document.querySelector(".model-view-switch");
  const buttons = [...root.querySelectorAll("[data-map-view]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      view.setMode(button.dataset.mapView);
      for (const item of buttons) item.setAttribute("aria-pressed", String(item === button));
      root.style.setProperty("--selected-row", button.dataset.mapView === "3d" ? "0" : "1");
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? buttons[0] : event.key === "End" ? buttons[1] : buttons.find((item) => item !== button);
      next.click();
      next.focus();
    });
  }
}
