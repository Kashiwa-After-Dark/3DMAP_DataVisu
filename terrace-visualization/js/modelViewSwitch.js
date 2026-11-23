/** ファイル概要: ガラス風の縦型スイッチで3Dと真上2Dを切り替える。 */
import { createIcons, Box, Map, GitFork, Route, ChartNoAxesCombined } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";

export function bindModelViewSwitch(setMode) {
  createIcons({ icons: { Box, Map, GitFork, Route, ChartNoAxesCombined }, nameAttr: "data-view-icon", attrs: { "stroke-width": 1.5 } });
  const root = document.querySelector(".model-view-switch");
  const buttons = [...root.querySelectorAll("[data-map-view]")];
  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => {
      setMode(button.dataset.mapView);
      for (const item of buttons) item.setAttribute("aria-pressed", String(item === button));
      root.style.setProperty("--selected-row", index);
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === "ArrowUp" ? -1 : 1;
      const next = event.key === "Home" ? buttons[0] : event.key === "End" ? buttons.at(-1) :
        buttons[(index + step + buttons.length) % buttons.length];
      next.click();
      next.focus();
    });
  }
}
