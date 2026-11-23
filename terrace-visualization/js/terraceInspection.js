/** Connects observation details to 3D rings and 2D deck cells. */
import { createIcons, X } from "https://cdn.jsdelivr.net/npm/lucide@0.468.0/+esm";
import { selectRingObservations } from "./ringInspectionModel.js";

const SOURCE_LABELS = {
  coordinate: "座標で配置した記録",
  code: "場所コードの範囲にある記録",
  estimated: "周辺の参考記録・このマスの実測ではありません",
};
const observationTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function renderRingCard(item, record) {
  item.className = "ring-record-card";
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
  const tagBlock = panel.querySelector(".ring-inspection-tag");
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
    title.textContent = ringView ? (catalog.find(({ code }) => code === hit.code)?.label ?? hit.code) : "メッシュの観察記録";
    tagBlock.hidden = !ringView;
    if (ringView) {
      tagBlock.textContent = hit.label ?? "カテゴリなし";
      tagBlock.style.setProperty("--ring-tag-color", hit.color ?? "#c8d0d5");
    }
    caption.hidden = ringView;
    caption.textContent = detail.records.length
      ? `${period} · ${detail.records.length}件 · ${SOURCE_LABELS[detail.source]}`
      : `${period} · 表示できる観察記録なし`;
    list.replaceChildren(...detail.records.map((record) => {
      const item = document.createElement("li");
      if (ringView) return renderRingCard(item, record);
      const fields = document.createElement("dl");
      const seen = new Set();
      function addField(label, values, wide = false, chips = false) {
        const texts = values.filter((value) => typeof value === "string").map((value) => value.trim())
          .filter((value) => value && (chips || !seen.has(value)));
        if (!texts.length) return;
        const group = document.createElement("div");
        if (wide) group.className = "inspection-field-wide";
        const key = document.createElement("dt");
        key.textContent = label;
        const value = document.createElement("dd");
        if (chips) value.className = "terrace-inspection-tags";
        for (const text of new Set(texts)) {
          if (!chips) seen.add(text);
          const content = document.createElement("span");
          content.textContent = text;
          value.append(content);
        }
        group.append(key, value);
        fields.append(group);
      }
      const tags = (record.activityCategories ?? []).map(({ label }) => label);
      addField("行動タグ", tags.length ? tags : ["タグなし"], true, true);
      addField("対象", [record.subject]);
      addField("行動", [record.activity]);
      addField("場所", [record.place], true);
      addField("印象", [record.impression], true);
      addField("観察文", [record.desc, record.memo], true);
      item.append(fields);
      return item;
    }));
    list.scrollTop = 0;
    panel.dataset.pinned = String(fixed);
    close.hidden = !fixed;
    panel.hidden = false;
  }

  function clear() {
    if (pinned !== null && context?.mode === "3d") view.clearObservationFocus();
    pinned = null;
    rings.select(null);
    activityMesh.select(null);
    panel.hidden = true;
    canvas.style.cursor = "";
  }

  rings.onHover((hit) => {
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
    if (!context || !start || !event.isPrimary || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 5) return;
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
