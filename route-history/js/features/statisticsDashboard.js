import { createStatisticsWordCloud } from "./statisticsWordCloud.js?v=20260811-02";
import { createStatisticsActivityChart } from "./statisticsActivityChart.js?v=20260809-01";

const AGE_KEYS = ["H", "U", "Y", "A", "S"];
const GROUP_KEYS = ["CP", "FM", "MX", "UN"];
const GENDER_KEYS = ["M", "F", "X", "U"];
const TIME_SEGMENTS = [
  { label: "18–20", start: 18, end: 20 },
  { label: "20–22", start: 20, end: 22 },
  { label: "22–24", start: 22, end: 24 },
];
const LABELS = {
  age: { H: "高校生", U: "大学生", Y: "若い社会人", A: "中高年", S: "高齢者" },
  group: { CP: "カップル", FM: "家族", MX: "混合", UN: "不明" },
  gender: { M: "男性", F: "女性", X: "男女混合", U: "不明" },
};
const COLORS = {
  H: "#22d3ee",
  U: "#397d9f",
  Y: "#8b5cf6",
  A: "#f59e0b",
  S: "#ef4444",
  CP: "#ec4899",
  FM: "#14b8a6",
  MX: "#a78bfa",
  UN: "#94a3b8",
  M: "#38bdf8",
  F: "#f472b6",
  X: "#a78bfa",
};

export function createStatisticsDashboard({ root, getLane, onActivityFilterChange }) {
  let active = false;
  let latestState = null;
  let renderTimer = null;
  let compositionMode = "group";

  root.innerHTML = `
    <section class="statistics-kpis" aria-label="主要統計">
      ${makeKpi("DATA", "statistics-data-count", "0")}
      ${makeKpi("PEOPLE", "statistics-people-count", "0")}
      ${makeKpi("PACE / 15MIN", "statistics-pace", "0")}
      ${makeKpi("UNKNOWN", "statistics-unknown", "0")}
    </section>
    <div class="statistics-side">
      <section class="statistics-activity-panel">
        ${makeHudFrame()}
        <div class="statistics-activity-content"></div>
      </section>
      <section class="statistics-lane-panel">
        ${makeHudFrame()}
        <header><b>ROUTE COMPARISON</b><span>DATA / AGE</span></header>
        <div class="statistics-age-legend" aria-label="年齢コードの色">
          ${[...AGE_KEYS, "UN"].map((key) => `<span style="--stat-color:${COLORS[key]}"><i></i>${key}</span>`).join("")}
        </div>
        <div class="statistics-lanes"></div>
      </section>
      <section class="statistics-composition-panel">
        ${makeHudFrame()}
        <header>
          <div class="statistics-composition-heading"><b>COMPOSITION</b><span></span></div>
          <div class="statistics-composition-tabs" role="tablist" aria-label="構成項目">
            <button type="button" data-composition="age" role="tab" aria-selected="false">AGE</button>
            <button type="button" data-composition="group" class="is-active" role="tab" aria-selected="true">GROUP</button>
            <button type="button" data-composition="gender" role="tab">GEN</button>
          </div>
        </header>
        <div class="statistics-composition-stage">
          <div class="statistics-composition"></div>
          <div class="statistics-composition-history" aria-label="完了した時間帯の構成"></div>
        </div>
      </section>
      <section class="statistics-word-panel">
        ${makeHudFrame()}
        <div class="statistics-word-content"></div>
      </section>
    </div>
  `;

  const wordCloud = createStatisticsWordCloud({
    root: root.querySelector(".statistics-word-content"),
  });
  const activityChart = createStatisticsActivityChart({
    root: root.querySelector(".statistics-activity-content"),
    onSelect: onActivityFilterChange,
  });

  const elements = {
    data: root.querySelector("#statistics-data-count"),
    people: root.querySelector("#statistics-people-count"),
    pace: root.querySelector("#statistics-pace"),
    unknown: root.querySelector("#statistics-unknown"),
    lanes: root.querySelector(".statistics-lanes"),
    composition: root.querySelector(".statistics-composition"),
    compositionPeriod: root.querySelector(".statistics-composition-heading span"),
    compositionHistory: root.querySelector(".statistics-composition-history"),
  };

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-composition]");
    if (!button) return;
    compositionMode = button.dataset.composition;
    for (const tab of root.querySelectorAll("[data-composition]")) {
      const selected = tab === button;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    }
    if (latestState) {
      renderComposition(latestState.activeMemos, latestState.periodIndex);
      renderCompositionHistory(latestState);
    }
  });

  function setActive(nextActive) {
    active = nextActive;
    root.classList.toggle("is-active", active);
    if (!active) activityChart.reset();
    if (active && latestState) render(latestState);
  }

  function setLanguage(language) {
    wordCloud.setLanguage(language);
  }

  function update(state) {
    const periodIndex = getPeriodIndex(state);
    const periodStartTime = getPeriodStartTime(state, periodIndex);
    latestState = {
      ...state,
      periodIndex,
      periodStartTime,
      cumulativeMemos: state.memos.filter(
        (memo) => memo.time >= state.rangeStartTime && memo.time <= state.currentTime,
      ),
      activeMemos: state.memos.filter(
        (memo) => memo.time >= periodStartTime && memo.time <= state.currentTime,
      ),
    };
    if (!active || renderTimer) return;
    renderTimer = window.setTimeout(() => {
      renderTimer = null;
      if (latestState) render(latestState);
    }, 120);
  }

  function render(state) {
    const { activeMemos } = state;
    const people = sumPeople(activeMemos);
    const durationMinutes = Math.max((state.currentTime - state.periodStartTime) / 60_000, 1);
    const unknown = activeMemos.filter(
      (memo) => !memo.isPeople || memo.category === "UN",
    ).length;

    elements.data.textContent = String(activeMemos.length);
    elements.people.textContent = String(people);
    elements.pace.textContent = formatNumber((activeMemos.length / durationMinutes) * 15);
    elements.unknown.textContent = String(unknown);
    renderLanes(state.cumulativeMemos);
    renderComposition(activeMemos, state.periodIndex);
    renderCompositionHistory(state);
    activityChart.update(state.cumulativeMemos);
    wordCloud.update({
      periodMemos: state.cumulativeMemos,
      allMemos: state.memos.filter(
        (memo) => memo.time >= state.rangeStartTime && memo.time <= state.timelineEnd,
      ),
      periodLabel: `18–${TIME_SEGMENTS[state.periodIndex]?.end || 20} / LIVE`,
    });
  }

  function renderLanes(memos) {
    const rows = ["reysol", "terrace"].map((lane) => {
      const laneMemos = memos.filter((memo) => getLane(memo.sourceId) === lane);
      return {
        id: lane,
        label: lane === "reysol" ? "レイソル" : "テラス",
        data: laneMemos.length,
        segments: TIME_SEGMENTS.map((segment) => {
          const segmentMemos = laneMemos.filter((memo) => {
            const date = new Date(memo.time);
            const hour = date.getHours() + date.getMinutes() / 60;
            return hour >= segment.start && hour < segment.end;
          });
          const ageCounts = new Map([...AGE_KEYS, "UN"].map((key) => [key, 0]));
          for (const memo of segmentMemos) {
            const key = AGE_KEYS.includes(memo.category) ? memo.category : "UN";
            ageCounts.set(key, ageCounts.get(key) + 1);
          }
          return { ...segment, data: segmentMemos.length, ageCounts };
        }),
      };
    });
    elements.lanes.innerHTML = rows.map((row) => `
      <div class="statistics-lane">
        <div class="statistics-lane__header"><b>${row.label}</b><output>${row.data}<small> DATA</small></output></div>
        <div class="statistics-lane-time-rows">
          ${row.segments.map((segment) => `
            <div class="statistics-lane-time-row">
              <span>${segment.label}</span>
              <div class="statistics-lane-stack" aria-label="${row.label} ${segment.label}の年齢構成">
                ${[...AGE_KEYS, "UN"].map((key) => {
                  const count = segment.ageCounts.get(key);
                  const ratio = segment.data ? count / segment.data : 0;
                  return `<i style="width:${ratio * 100}%;--stat-color:${COLORS[key]}" title="${key}: ${count}"></i>`;
                }).join("")}
              </div>
              <output>${segment.data}</output>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
  }

  function renderComposition(memos, periodIndex) {
    const { entries, total } = getCompositionEntries(memos, compositionMode);
    elements.compositionPeriod.textContent = TIME_SEGMENTS[periodIndex]?.label || TIME_SEGMENTS[0].label;
    elements.composition.innerHTML = buildDonutSvg(entries, total, compositionMode);
  }

  function renderCompositionHistory(state) {
    const periodDuration = 2 * 60 * 60 * 1000;
    elements.compositionHistory.innerHTML = TIME_SEGMENTS
      .slice(0, state.periodIndex)
      .map((segment, index) => {
        const start = state.timelineStart + index * periodDuration;
        const end = start + periodDuration;
        const periodMemos = state.memos.filter(
          (memo) => memo.time >= Math.max(start, state.rangeStartTime) && memo.time < end,
        );
        const { entries, total } = getCompositionEntries(periodMemos, compositionMode);
        return `
          <div class="statistics-composition-mini" aria-label="${segment.label} ${compositionMode}構成 ${total}件">
            <span>${segment.label}</span>
            ${buildMiniDonutSvg(entries, total)}
          </div>
        `;
      }).join("");
  }

  function getCompositionEntries(memos, mode) {
    const config = {
      age: { keys: AGE_KEYS, getValue: (memo) => memo.category },
      group: { keys: GROUP_KEYS, getValue: (memo) => memo.category },
      gender: { keys: GENDER_KEYS, getValue: (memo) => memo.gender },
    }[mode];
    const counts = new Map(config.keys.map((key) => [key, 0]));
    for (const memo of memos) {
      const value = config.getValue(memo);
      if (counts.has(value)) counts.set(value, counts.get(value) + 1);
    }
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const entries = config.keys.map((key) => {
      const count = counts.get(key);
      return { key, count, ratio: total ? count / total : 0, color: COLORS[key] || "#94a3b8" };
    });
    return { entries, total };
  }

  return { setActive, setLanguage, update };
}

function getPeriodIndex(state) {
  const periodDuration = 2 * 60 * 60 * 1000;
  const elapsed = Math.max(0, state.currentTime - state.timelineStart);
  return Math.min(TIME_SEGMENTS.length - 1, Math.floor(elapsed / periodDuration));
}

function getPeriodStartTime(state, periodIndex = getPeriodIndex(state)) {
  const periodDuration = 2 * 60 * 60 * 1000;
  const segmentStart = state.timelineStart + periodIndex * periodDuration;
  return Math.max(state.rangeStartTime, segmentStart);
}

function makeKpi(label, id, value) {
  return `<div class="statistics-kpi">${makeHudFrame()}<b>${label}</b><output id="${id}">${value}</output></div>`;
}

function makeHudFrame() {
  return `<i class="statistics-hud-frame" aria-hidden="true"><i></i></i>`;
}

function buildDonutSvg(entries, total, mode) {
  const width = 330;
  const height = 180;
  const centerX = 215;
  const centerY = 86;
  const radius = 54;
  const circumference = Math.PI * 2 * radius;
  let cursor = 0;
  const plotted = entries.map((entry) => {
    const start = cursor;
    cursor += entry.ratio;
    const angle = -Math.PI / 2 + (start + entry.ratio / 2) * Math.PI * 2;
    return { ...entry, start, angle };
  });
  const visibleEntries = plotted.filter((entry) => entry.count > 0);
  const callouts = arrangeDonutCallouts(visibleEntries, centerX, centerY, radius);
  const rings = total
    ? plotted.map((entry) => {
      const length = Math.max(entry.ratio * circumference - 1.5, 0);
      return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${entry.color}" stroke-width="6" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-entry.start * circumference}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
    }).join("")
    : "";
  const labels = callouts.map((entry) => {
    const outerX = centerX + Math.cos(entry.angle) * (radius + 4);
    const outerY = centerY + Math.sin(entry.angle) * (radius + 4);
    const elbowX = entry.side === "right" ? 275 : 129;
    const labelX = entry.side === "right" ? 281 : 123;
    const anchor = entry.side === "right" ? "start" : "end";
    const name = LABELS[mode]?.[entry.key] || entry.key;
    return `
      <path d="M ${outerX.toFixed(1)} ${outerY.toFixed(1)} L ${elbowX} ${entry.y} L ${labelX} ${entry.y}" fill="none" stroke="${entry.color}" stroke-width="1"/>
      <circle cx="${outerX.toFixed(1)}" cy="${outerY.toFixed(1)}" r="2" fill="${entry.color}"/>
      <text x="${labelX}" y="${entry.y - 3}" text-anchor="${anchor}" class="statistics-donut-label">${entry.key} ${name}</text>
      <text x="${labelX}" y="${entry.y + 8}" text-anchor="${anchor}" class="statistics-donut-value">${entry.count} DATA · ${Math.round(entry.ratio * 100)}%</text>
    `;
  }).join("");
  return `
    <svg class="statistics-donut-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${mode}構成 ${total}件">
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" class="statistics-donut-track"/>
      ${rings}
      ${labels}
      <text x="${centerX}" y="${centerY - 1}" text-anchor="middle" class="statistics-donut-total">${total}</text>
      <text x="${centerX}" y="${centerY + 13}" text-anchor="middle" class="statistics-donut-caption">DATA</text>
    </svg>
  `;
}

function buildMiniDonutSvg(entries, total) {
  const width = 112;
  const height = 86;
  const centerX = 56;
  const centerY = 45;
  const radius = 28;
  const circumference = Math.PI * 2 * radius;
  let cursor = 0;
  const rings = total
    ? entries.map((entry) => {
      const start = cursor;
      cursor += entry.ratio;
      const length = Math.max(entry.ratio * circumference - 1, 0);
      return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${entry.color}" stroke-width="4" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-start * circumference}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
    }).join("")
    : "";
  return `
    <svg class="statistics-mini-donut" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" class="statistics-donut-track statistics-mini-donut__track"/>
      ${rings}
      <text x="${centerX}" y="${centerY + 3}" text-anchor="middle" class="statistics-mini-donut__total">${total}</text>
    </svg>
  `;
}

function arrangeDonutCallouts(entries, centerX, centerY, radius) {
  const sides = { left: [], right: [] };
  for (const entry of entries) {
    const side = Math.cos(entry.angle) >= 0 ? "right" : "left";
    sides[side].push({
      ...entry,
      side,
      targetY: centerY + Math.sin(entry.angle) * (radius + 18),
    });
  }
  return [...spreadCallouts(sides.left), ...spreadCallouts(sides.right)];
}

function spreadCallouts(entries) {
  const minY = 20;
  const maxY = 158;
  const gap = 25;
  const arranged = [...entries].sort((a, b) => a.targetY - b.targetY);
  for (let index = 0; index < arranged.length; index += 1) {
    const previousY = index ? arranged[index - 1].y : minY - gap;
    arranged[index].y = Math.max(minY, arranged[index].targetY, previousY + gap);
  }
  if (arranged.length && arranged.at(-1).y > maxY) {
    const shift = arranged.at(-1).y - maxY;
    for (const entry of arranged) entry.y -= shift;
  }
  return arranged;
}

function sumPeople(memos) {
  return memos.reduce(
    (total, memo) => total + (memo.isPeople ? memo.count || 0 : 0),
    0,
  );
}

function formatNumber(value) {
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}
