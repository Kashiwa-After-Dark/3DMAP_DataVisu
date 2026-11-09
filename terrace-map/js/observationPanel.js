import { filterTerraceObservations } from "./observationModel.js";
import { buildPlaceCatalog, formatPlaceNames } from "./placeSummaryModel.js";
import { createPlaceSummary } from "./placeSummary.js";

const AGE_NAMES = { child: "中学生以下", high_school: "高校生", university: "大学生", young: "若い社会人", adult: "中高年", senior: "高齢者", mixed: "年齢混合", unknown: "不明" };
const GENDER_NAMES = { male: "男性", female: "女性", mixed: "混合", unknown: "不明" };

export function createObservationPanel({ onChange, onSelect }) {
  const app = document.querySelector("#app");
  const root = document.querySelector("#observations");
  const list = root.querySelector("#observation-list");
  const detail = root.querySelector("#observation-detail");
  const status = root.querySelector("#observation-status");
  const codes = root.querySelector("#place-code");
  const toggle = document.querySelector("#data-toggle");
  const badge = document.querySelector("#data-count");
  const count = root.querySelector("#observation-count");
  const state = { period: "all", code: "all", selected: null, data: null, visible: [], catalog: [], tab: "places" };
  const summary = createPlaceSummary(root.querySelector("#place-summary"), (code) => {
    state.code = code;
    codes.value = code;
    render();
  });
  function setTab(tab) {
    state.tab = tab;
    root.querySelector("#place-summary").hidden = tab !== "places";
    root.querySelector("#record-content").hidden = tab !== "records";
    for (const button of root.querySelectorAll("[data-observation-tab]")) {
      const active = button.dataset.observationTab === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
  }
  for (const button of root.querySelectorAll("[data-observation-tab]")) {
    button.addEventListener("click", () => setTab(button.dataset.observationTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const tab = event.key === "Home" ? "places" : event.key === "End" ? "records" : state.tab === "places" ? "records" : "places";
      setTab(tab);
      root.querySelector(`[data-observation-tab="${tab}"]`).focus();
    });
  }
  const formatTime = (time) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(time);
  function setOpen(open) {
    app.classList.toggle("data-panel-open", open);
    root.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }
  setOpen(window.innerWidth > 760);
  toggle.addEventListener("click", () => setOpen(!app.classList.contains("data-panel-open")));
  root.querySelectorAll("[data-period]").forEach((button) => button.addEventListener("click", () => {
    state.period = button.dataset.period;
    root.querySelectorAll("[data-period]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
  codes.addEventListener("change", () => { state.code = codes.value; render(); });

  function select(id) {
    const record = state.visible.find((item) => item.id === id) || null;
    state.selected = record?.id || null;
    for (const button of list.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.id === state.selected));
    detail.replaceChildren();
    detail.hidden = !record;
    if (record) {
      setTab("records");
      const title = document.createElement("h3");
      title.textContent = record.subject;
      const fields = document.createElement("dl");
      for (const [label, value] of [
        ["時刻", formatTime(record.time)], ["場所コード", record.placeCodes.join(" / ")], ["場所の定義", record.placeMeanings.map((item) => `${item.code} ${item.meaning}`).join(" / ")], ["場所", record.place],
        ["年齢", record.isObject ? "" : AGE_NAMES[record.age] || record.age], ["性別", record.isObject ? "" : GENDER_NAMES[record.gender] || record.gender],
        ["グループ", record.isObject ? "" : record.groupType],
        [record.isObject ? "数量" : "人数", record.count], ["行動・状態", record.activity],
        ["感情・印象", record.impression], ["観察文", record.desc], ["メモ", record.memo],
        ["座標", record.hasLocation ? `${record.lat.toFixed(6)}, ${record.lon.toFixed(6)}` : "記録なし"],
      ]) {
        if (value === "" || value == null) continue;
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = String(value);
        fields.append(term, description);
      }
      detail.append(title, fields);
      setOpen(true);
      detail.scrollIntoView({ block: "nearest" });
    }
    onSelect(record);
  }
  function render() {
    if (!state.data) return;
    state.visible = filterTerraceObservations(state.data.records, state.period, state.code);
    count.textContent = `${state.visible.length}件`;
    badge.textContent = String(state.data.records.length);
    list.replaceChildren(...state.visible.map((record) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = record.id;
      button.setAttribute("aria-pressed", "false");
      const metadata = document.createElement("span");
      metadata.className = "observation-meta";
      metadata.textContent = `${formatTime(record.time)} · ${formatPlaceNames(record, state.catalog)} · ${record.isObject ? "物" : "人"}${record.hasLocation ? "" : " · 座標なし"}`;
      const subject = document.createElement("strong");
      subject.textContent = record.subject;
      const action = document.createElement("span");
      action.className = "observation-action";
      action.textContent = record.activity;
      button.append(metadata, subject, action);
      button.addEventListener("click", () => select(record.id === state.selected ? null : record.id));
      item.append(button);
      return item;
    }));
    const located = state.visible.filter((record) => record.hasLocation).length;
    status.textContent = !state.data.records.length
      ? (!state.data.eligible ? "対象日の公開データはありません。" : state.data.coded ? "TRで始まる場所コードの記録はありません。" : `場所コードがAPIに未公開です（取得 ${state.data.eligible}件）。`)
      : state.visible.length ? `地図 ${located}件 / 座標なし ${state.visible.length - located}件` : "該当する記録はありません。";
    summary.render(state.data.records, state.catalog, state.period, state.code);
    onChange(state.visible, state.code, state.catalog);
    select(null);
  }
  return {
    select,
    loading() { status.textContent = "観察データを読み込み中"; },
    error() { status.textContent = "観察データを取得できませんでした。"; },
    setData(data) {
      state.data = data;
      root.querySelector("#survey-date").textContent = data.date;
      state.catalog = buildPlaceCatalog(data.records);
      codes.replaceChildren(new Option("場所：すべて", "all"), ...state.catalog.map((place) => new Option(place.label, place.code)));
      state.code = "all";
      codes.disabled = data.records.length === 0;
      render();
    },
  };
}
