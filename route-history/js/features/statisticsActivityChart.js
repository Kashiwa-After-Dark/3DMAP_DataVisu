import { ACTIVITY_TYPES, classifyActivity } from "./activityClassifier.js?v=20260809-01";

const TIME_SEGMENTS = [
  { label: "18–20", start: 18, end: 20 },
  { label: "20–22", start: 20, end: 22 },
  { label: "22–24", start: 22, end: 24 },
];

export function createStatisticsActivityChart({ root, onSelect }) {
  let selected = "all";

  root.innerHTML = `
    <header><b>ACTIVITY / TIME</b><span>LIVE COMPOSITION</span></header>
    <div class="statistics-activity-bars"></div>
    <div class="statistics-activity-filters" aria-label="行動別マップ表示">
      ${ACTIVITY_TYPES.map((activity) => `
        <button type="button" data-activity="${activity.id}" style="--activity-color:${activity.color}" aria-pressed="false">
          <i></i><span>${activity.code}</span>
        </button>
      `).join("")}
    </div>
  `;

  const bars = root.querySelector(".statistics-activity-bars");

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-activity]");
    if (!button) return;
    setSelection(selected === button.dataset.activity ? "all" : button.dataset.activity);
  });

  function update(memos) {
    bars.innerHTML = TIME_SEGMENTS.map((segment) => {
      const segmentMemos = memos.filter((memo) => {
        const date = new Date(memo.time);
        const hour = date.getHours() + date.getMinutes() / 60;
        return hour >= segment.start && hour < segment.end;
      });
      const counts = new Map(ACTIVITY_TYPES.map((activity) => [activity.id, 0]));
      for (const memo of segmentMemos) {
        const activity = classifyActivity(memo);
        counts.set(activity, counts.get(activity) + 1);
      }
      return `
        <div class="statistics-activity-row">
          <span>${segment.label}</span>
          <div class="statistics-activity-stack" aria-label="${segment.label}の行動構成">
            ${ACTIVITY_TYPES.map((activity) => {
              const count = counts.get(activity.id);
              const width = segmentMemos.length ? count / segmentMemos.length * 100 : 0;
              return `<i style="width:${width}%;--activity-color:${activity.color}" title="${activity.label}: ${count}"></i>`;
            }).join("")}
          </div>
          <output>${segmentMemos.length}</output>
        </div>
      `;
    }).join("");
  }

  function setSelection(nextSelection, { notify = true } = {}) {
    selected = nextSelection;
    for (const button of root.querySelectorAll("[data-activity]")) {
      const active = button.dataset.activity === selected;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    if (notify) onSelect?.(selected);
  }

  function reset() {
    if (selected === "all") return;
    setSelection("all");
  }

  return { update, reset };
}
