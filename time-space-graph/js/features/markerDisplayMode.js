import { ACTIVITY_TYPES } from "../../../backend/activityClassifier.js?v=20261028-02";
import { IMPRESSION_TYPES } from "../../../backend/impressionClassifier.js?v=20261029-db1";
import { AGE_STYLES, VISUAL_MODES } from "../../../backend/visualEncoding.js?v=20261029-db2";
import { EMOTION_PERSPECTIVES } from "./emotionPerspective.js?v=20261029-db1";

const LEGENDS = {
  attribute: Object.entries(AGE_STYLES).map(([id, style]) => ({ id, ...style })),
  activity: ACTIVITY_TYPES,
  impression: IMPRESSION_TYPES,
};

const SHAPE_LEGEND = [
  { symbol: "□", label: "男性" },
  { symbol: "○", label: "女性" },
  { symbol: "◇", label: "性別混合" },
  { symbol: "♡", label: "カップル" },
  { symbol: "△", label: "不明" },
  { symbol: "⬡", label: "物" },
];

export function createMarkerDisplayMode({ root, tabs = [], onChange, onFilterChange, onPerspectiveChange, flowLegend, impressionLegend }) {
  let activeMode = "attribute";
  let perspective = "observer";
  const impressionSelections = new Map(EMOTION_PERSPECTIVES.map(({ id }) => [id, new Set(IMPRESSION_TYPES.map((type) => type.id))]));
  const selectedByMode = new Map(
    ["activity", "impression"].map((mode) => [mode, new Set(getLegendEntries(mode).map((entry) => entry.id))]),
  );
  selectedByMode.set("impression", impressionSelections.get(perspective));
  const legend = document.createElement("div");
  legend.className = "marker-display-mode__legend";
  legend.setAttribute("aria-live", "polite");
  const buttons = [...tabs];
  for (const button of buttons) {
    const mode = VISUAL_MODES.find((entry) => entry.id === button.dataset.markerMode);
    if (mode) button.title = mode.description;
    button.setAttribute("aria-pressed", String(button.dataset.markerMode === activeMode));
  }
  root?.replaceChildren(legend);
  const renderActiveLegend = () => renderLegend({
    root: legend,
    mode: activeMode,
    flowLegend,
    impressionLegend,
    perspective,
    onPerspective: (next) => {
      perspective = next;
      selectedByMode.set("impression", impressionSelections.get(next));
      onPerspectiveChange?.(next);
      syncFilteredTabs(buttons, selectedByMode);
      renderActiveLegend();
      onFilterChange?.("impression", new Set(selectedByMode.get("impression")), perspective);
    },
    selected: selectedByMode.get(activeMode),
    onToggle: (id) => {
      toggleSelection(selectedByMode.get(activeMode), getLegendEntries(activeMode), id);
      syncFilteredTabs(buttons, selectedByMode);
      renderActiveLegend();
      onFilterChange?.(activeMode, new Set(selectedByMode.get(activeMode)), perspective);
    },
  });
  renderActiveLegend();
  for (const button of buttons) button.addEventListener("click", () => {
    if (button.dataset.markerMode === activeMode) return;
    activeMode = button.dataset.markerMode;
    for (const peer of buttons) {
      const selected = peer === button;
      peer.setAttribute("aria-pressed", String(selected));
    }
    renderActiveLegend();
    onChange?.(activeMode);
  });
  return {
    getMode: () => activeMode,
    resetFilters: ({ notify = true } = {}) => {
      for (const selected of impressionSelections.values()) {
        selected.clear();
        for (const entry of IMPRESSION_TYPES) selected.add(entry.id);
      }
      for (const mode of ["activity", "impression"]) {
        selectedByMode.set(mode, new Set(getLegendEntries(mode).map((entry) => entry.id)));
        if (mode === "impression") selectedByMode.set(mode, impressionSelections.get(perspective));
        if (notify) onFilterChange?.(mode, new Set(selectedByMode.get(mode)), perspective);
      }
      syncFilteredTabs(buttons, selectedByMode);
      renderActiveLegend();
    },
  };
}

function renderLegend({ root, mode, selected, onToggle, flowLegend, impressionLegend, perspective, onPerspective }) {
  const title = document.createElement("b");
  title.textContent = mode === "activity" ? "行動の色" : mode === "impression" ? EMOTION_PERSPECTIVES.find((entry) => entry.id === perspective).label : "年齢の色";
  const list = document.createElement("div");
  list.className = "marker-color-legend";
  const entries = getLegendEntries(mode);
  list.append(...entries.map((entry) => {
    const filterable = mode === "activity" || mode === "impression";
    const item = document.createElement(filterable ? "button" : "span");
    if (filterable) {
      item.type = "button";
      item.dataset.legendId = entry.id;
      item.className = "marker-color-legend__filter";
      item.setAttribute("aria-pressed", String(selected?.has(entry.id)));
      item.title = `${entry.label}で絞り込み`;
      item.addEventListener("click", () => onToggle?.(entry.id));
    }
    const swatch = document.createElement("i");
    swatch.style.setProperty("--legend-swatch", entry.color);
    const label = document.createElement("em");
    label.textContent = entry.label;
    item.append(swatch, label);
    return item;
  }));
  if (mode === "activity" || mode === "impression") {
    const hint = document.createElement("small");
    hint.className = "marker-display-mode__hint";
    hint.textContent = "色を選択して絞り込み";
    list.append(hint);
  }
  const shapeTitle = document.createElement("b");
  shapeTitle.textContent = "形";
  const shapeList = document.createElement("div");
  shapeList.className = "marker-shape-legend";
  shapeList.append(...SHAPE_LEGEND.map((entry) => {
    const item = document.createElement("span");
    const symbol = document.createElement("i");
    symbol.textContent = entry.symbol;
    const label = document.createElement("em");
    label.textContent = entry.label;
    item.append(symbol, label);
    return item;
  }));
  root.replaceChildren(title, list);
  if (mode === "impression") {
    const switcher = document.createElement("div");
    switcher.className = "emotion-perspective";
    switcher.setAttribute("role", "radiogroup");
    switcher.setAttribute("aria-label", "感情の視点");
    for (const { id, label } of EMOTION_PERSPECTIVES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(perspective === id));
      button.addEventListener("click", () => { if (perspective !== id) onPerspective(id); });
      switcher.append(button);
    }
    root.prepend(switcher);
  }
  if (mode === "attribute") root.append(shapeTitle, shapeList);
  if (mode === "activity" && flowLegend) root.append(flowLegend);
  if (mode === "impression" && impressionLegend) root.append(impressionLegend);
}

function getLegendEntries(mode) {
  const entries = [...(LEGENDS[mode] || [])];
  return entries;
}

function toggleSelection(selected, entries, id) {
  if (!selected) return;
  if (selected.size === entries.length) {
    selected.clear();
    selected.add(id);
  } else if (selected.has(id) && selected.size === 1) {
    selected.clear();
    for (const entry of entries) selected.add(entry.id);
  } else if (selected.has(id)) {
    selected.delete(id);
  } else {
    selected.add(id);
  }
}

function syncFilteredTabs(tabs, selectedByMode) {
  for (const tab of tabs) {
    const mode = tab.dataset.markerMode;
    if (!selectedByMode.has(mode)) continue;
    tab.classList.toggle("has-filter", selectedByMode.get(mode).size < getLegendEntries(mode).length);
  }
}
