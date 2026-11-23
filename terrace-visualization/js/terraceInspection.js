/** Connects observation details to 3D rings and 2D deck cells. */
import { createIcons, X } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";
import { selectRingObservations } from "./ringInspectionModel.js";

const SOURCE_LABELS = {
  coordinate: "座標で配置した記録",
  code: "場所コードの範囲にある記録",
  estimated: "周辺の参考記録・このマスの実測ではありません",
};
const observationTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function renderObservationCard(record) {
  const item = document.createElement("li");
  item.className = "inspection-record-card";
  if (Number.isFinite(record.time)) {
    const time = document.createElement("time");
    time.dateTime = new Date(record.time).toISOString();
    time.textContent = observationTime.format(record.time);
    item.append(time);
  }
  const fields = document.createElement("dl");
  for (const [label, value] of [["人", record.subject], ["場所", record.place],
    ["行動", record.activity], ["感情", record.impression]]) {
    const field = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const content = document.createElement("dd");
    content.textContent = (typeof value === "string" && value.trim()) || "—";
    field.append(term, content);
    fields.append(field);
  }
  item.append(fields);
  return item;
}

export function bindTerraceInspection({ canvas, rings, activityMesh, view }) {
  const panel = document.querySelector("#terrace-inspection");
  const title = panel.querySelector("h2");
  const caption = panel.querySelector(".inspection-caption");
  const tagList = panel.querySelector(".inspection-tag-list");
  const list = panel.querySelector("ul");
  const close = panel.querySelector("button");
  createIcons({ icons: { X }, nameAttr: "data-inspection-icon" });
  let context = null;
  let pinned = null;
  let press = null;

  function show(hit, fixed = false) {
    if (!context || hit === null) { panel.hidden = true; return; }
    const { mode, period, records, catalog } = context;
    const ringView = mode === "3d";
    const detail = ringView
      ? { source: "code", records: selectRingObservations(records, hit) }
      : activityMesh.detail(hit);
    panel.dataset.mode = mode;
    const places = new Set(detail.records.map(({ place }) => typeof place === "string" ? place.trim() : "").filter(Boolean));
    title.textContent = ringView ? (catalog.find(({ code }) => code === hit.code)?.label ?? hit.code)
      : places.size === 1 ? places.values().next().value : "メッシュの観察記録";
    const tags = ringView ? [{ label: hit.label ?? "カテゴリなし", color: hit.color }]
      : [...new Map(detail.records.flatMap(({ activityCategories = [] }) => activityCategories)
        .map(({ id, label }) => [id, activityMesh.tagEntry(id) ?? { label }])).values()];
    tagList.replaceChildren(...tags.map(({ label, color }) => {
      const chip = document.createElement("strong");
      chip.className = "inspection-tag-chip";
      chip.textContent = label;
      chip.style.setProperty("--inspection-tag-color", color ?? "#c8d0d5");
      return chip;
    }));
    tagList.hidden = tags.length === 0;
    caption.hidden = ringView;
    caption.textContent = detail.records.length
      ? `${period} · ${detail.records.length}件 · ${SOURCE_LABELS[detail.source]}`
      : `${period} · 表示できる観察記録なし`;
    list.replaceChildren(...detail.records.map(renderObservationCard));
    list.scrollTop = 0;
    panel.dataset.pinned = String(fixed);
    close.hidden = !fixed;
    panel.hidden = false;
  }

  function clear() {
    if (pinned !== null && context?.mode === "3d") view.clearObservationFocus();
    pinned = null;
    rings?.select(null);
    activityMesh.select(null);
    panel.hidden = true;
    canvas.style.cursor = "";
  }

  rings?.onHover((hit) => {
    if (context?.mode !== "3d") return;
    canvas.style.cursor = hit ? "pointer" : "";
    if (pinned === null) show(hit);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (context?.mode !== "2d") return;
    const hit = event.buttons || event.pointerType === "touch" ? null
      : activityMesh.hitAt(event.clientX, event.clientY, canvas.getBoundingClientRect());
    activityMesh.hover(hit);
    canvas.style.cursor = hit !== null ? "pointer" : "";
  });
  canvas.addEventListener("pointerleave", () => { activityMesh.hover(null); canvas.style.cursor = ""; });
  canvas.addEventListener("pointercancel", () => { press = null; activityMesh.hover(null); });
  canvas.addEventListener("pointerdown", (event) => {
    press = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  });
  canvas.addEventListener("pointerup", (event) => {
    const start = press;
    press = null;
    if (!context || (context.mode === "3d" && !rings) || !start || !event.isPrimary ||
        Math.hypot(start.x - event.clientX, start.y - event.clientY) > 5) return;
    const { clientX, clientY } = event;
    const hit = context.mode === "3d" ? rings.hitAt(clientX, clientY)
      : activityMesh.hitAt(clientX, clientY, canvas.getBoundingClientRect());
    const same = context.mode === "3d" ? hit?.code === pinned?.code && hit?.tag === pinned?.tag : hit === pinned;
    if (hit === null || same) { clear(); return; }
    pinned = hit;
    if (context.mode === "3d") {
      rings.select(hit.code);
      view.focusObservation(hit.anchor);
    }
    else activityMesh.select(hit);
    show(hit, true);
  });
  close.addEventListener("click", clear);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) clear();
  });
  return {
    setContext(next) {
      if (!context || context.mode !== next.mode || context.period !== next.period) {
        clear();
        activityMesh.hover(null);
      }
      context = next;
    },
    isPinned: () => pinned !== null,
  };
}
