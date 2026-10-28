import { ACTIVITY_TYPES } from "../../../backend/activityClassifier.js?v=20261028-02";
import { IMPRESSION_TYPES } from "../../../backend/impressionClassifier.js?v=20261028-02";
import { AGE_STYLES, VISUAL_MODES } from "../../../backend/visualEncoding.js?v=20261028-02";

const LEGENDS = {
  attribute: Object.entries(AGE_STYLES).map(([id, style]) => ({ id, ...style })),
  activity: ACTIVITY_TYPES,
  impression: IMPRESSION_TYPES,
};

export function createMarkerDisplayMode({ root, onChange }) {
  let activeMode = "attribute";
  const controls = document.createElement("div");
  controls.className = "marker-display-mode__controls";
  const legend = document.createElement("div");
  legend.className = "marker-display-mode__legend";
  legend.setAttribute("aria-live", "polite");
  const buttons = VISUAL_MODES.map((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.markerMode = mode.id;
    button.textContent = mode.label;
    button.title = mode.description;
    button.setAttribute("aria-pressed", String(mode.id === activeMode));
    if (mode.id === activeMode) button.classList.add("is-active");
    return button;
  });
  controls.append(...buttons);
  root?.replaceChildren(controls, legend);
  renderLegend(legend, activeMode);
  root?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-marker-mode]");
    if (!button || button.dataset.markerMode === activeMode) return;
    activeMode = button.dataset.markerMode;
    for (const peer of buttons) {
      const selected = peer === button;
      peer.classList.toggle("is-active", selected);
      peer.setAttribute("aria-pressed", String(selected));
    }
    renderLegend(legend, activeMode);
    onChange?.(activeMode);
  });
  return { getMode: () => activeMode };
}

function renderLegend(root, mode) {
  const title = document.createElement("b");
  title.textContent = mode === "activity" ? "行動の色" : mode === "impression" ? "観察者印象の色" : "年齢の色";
  const list = document.createElement("div");
  list.className = "marker-color-legend";
  const entries = [...(LEGENDS[mode] || [])];
  if (mode !== "attribute") entries.push({ id: "object", label: "物", color: AGE_STYLES.OBJ.color });
  list.append(...entries.map((entry) => {
    const item = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.style.setProperty("--legend-swatch", entry.color);
    const label = document.createElement("em");
    label.textContent = entry.label;
    item.append(swatch, label);
    return item;
  }));
  root.replaceChildren(title, list);
}
