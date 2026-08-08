const AGE_KEYS = ["H", "U", "Y", "A", "S"];
const GROUP_KEYS = ["CP", "FM", "MX", "UN"];
const GENDER_KEYS = ["M", "F", "X", "U"];
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

export function createStatisticsDashboard({ root, getLane }) {
  let active = false;
  let latestState = null;
  let renderTimer = null;
  let compositionMode = "age";

  root.innerHTML = `
    <section class="statistics-kpis" aria-label="主要統計">
      ${makeKpi("DATA", "statistics-data-count", "0")}
      ${makeKpi("PEOPLE", "statistics-people-count", "0")}
      ${makeKpi("PACE / 15MIN", "statistics-pace", "0")}
      ${makeKpi("UNKNOWN", "statistics-unknown", "0")}
    </section>
    <section class="statistics-time-panel">
      <header><b>TIME PROFILE</b><span>10 MIN BINS</span></header>
      <svg class="statistics-time-chart" viewBox="0 0 900 180" role="img" aria-label="時間別のデータ件数と延べ観測人数"></svg>
    </section>
    <div class="statistics-side">
      <section class="statistics-lane-panel">
        <header><b>ROUTE COMPARISON</b><span>DATA / PEOPLE</span></header>
        <div class="statistics-lanes"></div>
      </section>
      <section class="statistics-composition-panel">
        <header>
          <b>COMPOSITION</b>
          <div class="statistics-composition-tabs" role="tablist" aria-label="構成項目">
            <button type="button" data-composition="age" class="is-active" role="tab">AGE</button>
            <button type="button" data-composition="group" role="tab">GROUP</button>
            <button type="button" data-composition="gender" role="tab">GEN</button>
          </div>
        </header>
        <div class="statistics-composition"></div>
      </section>
    </div>
  `;

  const elements = {
    data: root.querySelector("#statistics-data-count"),
    people: root.querySelector("#statistics-people-count"),
    pace: root.querySelector("#statistics-pace"),
    unknown: root.querySelector("#statistics-unknown"),
    chart: root.querySelector(".statistics-time-chart"),
    lanes: root.querySelector(".statistics-lanes"),
    composition: root.querySelector(".statistics-composition"),
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
    if (latestState) renderComposition(latestState.activeMemos);
  });

  function setActive(nextActive) {
    active = nextActive;
    root.classList.toggle("is-active", active);
    if (active && latestState) render(latestState);
  }

  function update(state) {
    latestState = {
      ...state,
      activeMemos: state.memos.filter(
        (memo) => memo.time >= state.rangeStartTime && memo.time <= state.currentTime,
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
    const durationMinutes = Math.max((state.currentTime - state.rangeStartTime) / 60_000, 1);
    const unknown = activeMemos.filter(
      (memo) => !memo.isPeople || memo.category === "UN",
    ).length;

    elements.data.textContent = String(activeMemos.length);
    elements.people.textContent = String(people);
    elements.pace.textContent = formatNumber((activeMemos.length / durationMinutes) * 15);
    elements.unknown.textContent = String(unknown);
    renderTimeChart(state);
    renderLanes(activeMemos);
    renderComposition(activeMemos);
  }

  function renderTimeChart(state) {
    const binCount = 36;
    const duration = state.timelineEnd - state.timelineStart;
    const bins = Array.from({ length: binCount }, () => ({ data: 0, people: 0 }));
    for (const memo of state.memos) {
      const ratio = (memo.time - state.timelineStart) / duration;
      const index = Math.max(0, Math.min(binCount - 1, Math.floor(ratio * binCount)));
      bins[index].data += 1;
      bins[index].people += memo.isPeople ? memo.count || 0 : 0;
    }

    const left = 46;
    const right = 12;
    const chartWidth = 900 - left - right;
    const binWidth = chartWidth / binCount;
    const dataBase = 76;
    const peopleBase = 148;
    const bandHeight = 48;
    const maxData = Math.max(1, ...bins.map((bin) => bin.data));
    const maxPeople = Math.max(1, ...bins.map((bin) => bin.people));
    const rangeStartRatio = clampRatio(
      (state.rangeStartTime - state.timelineStart) / duration,
    );
    const currentRatio = clampRatio(
      (state.currentTime - state.timelineStart) / duration,
    );
    const parts = [
      `<rect x="${left + chartWidth * rangeStartRatio}" y="14" width="${chartWidth * Math.max(0, currentRatio - rangeStartRatio)}" height="140" fill="#00a7ff" opacity="0.055"/>`,
      `<text x="2" y="49" class="statistics-svg-label">DATA</text>`,
      `<text x="2" y="121" class="statistics-svg-label">PEOPLE</text>`,
    ];

    for (let hour = 18; hour <= 24; hour += 1) {
      const x = left + chartWidth * ((hour - 18) / 6);
      parts.push(`<line x1="${x}" y1="14" x2="${x}" y2="154" class="statistics-grid-line"/>`);
      parts.push(`<text x="${x}" y="174" text-anchor="${hour === 18 ? "start" : hour === 24 ? "end" : "middle"}" class="statistics-hour-label">${hour === 24 ? "24" : hour}</text>`);
    }

    bins.forEach((bin, index) => {
      const centerRatio = (index + 0.5) / binCount;
      const isActive = centerRatio >= rangeStartRatio && centerRatio <= currentRatio;
      const x = left + index * binWidth + 1;
      const width = Math.max(binWidth - 2, 1);
      const dataHeight = (bin.data / maxData) * bandHeight;
      const peopleHeight = (bin.people / maxPeople) * bandHeight;
      parts.push(`<rect x="${x}" y="${dataBase - dataHeight}" width="${width}" height="${dataHeight}" fill="#00a7ff" opacity="${isActive ? 0.9 : 0.16}"/>`);
      parts.push(`<rect x="${x}" y="${peopleBase - peopleHeight}" width="${width}" height="${peopleHeight}" fill="#f59e0b" opacity="${isActive ? 0.84 : 0.13}"/>`);
    });

    const cursorX = left + chartWidth * currentRatio;
    parts.push(`<line x1="${cursorX}" y1="12" x2="${cursorX}" y2="156" class="statistics-playhead"/>`);
    elements.chart.innerHTML = parts.join("");
  }

  function renderLanes(memos) {
    const rows = ["reysol", "terrace"].map((lane) => {
      const laneMemos = memos.filter((memo) => getLane(memo.sourceId) === lane);
      return {
        id: lane,
        label: lane === "reysol" ? "レイソル" : "テラス",
        data: laneMemos.length,
        people: sumPeople(laneMemos),
      };
    });
    const maxData = Math.max(1, ...rows.map((row) => row.data));
    const maxPeople = Math.max(1, ...rows.map((row) => row.people));
    elements.lanes.innerHTML = rows.map((row) => `
      <div class="statistics-lane">
        <b>${row.label}</b>
        ${makeLaneMetric("DATA", row.data, row.data / maxData, "data")}
        ${makeLaneMetric("PEOPLE", row.people, row.people / maxPeople, "people")}
      </div>
    `).join("");
  }

  function renderComposition(memos) {
    const config = {
      age: { keys: AGE_KEYS, getValue: (memo) => memo.category },
      group: { keys: GROUP_KEYS, getValue: (memo) => memo.category },
      gender: { keys: GENDER_KEYS, getValue: (memo) => memo.gender },
    }[compositionMode];
    const counts = new Map(config.keys.map((key) => [key, 0]));
    for (const memo of memos) {
      const value = config.getValue(memo);
      if (counts.has(value)) counts.set(value, counts.get(value) + 1);
    }
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    elements.composition.innerHTML = config.keys.map((key) => {
      const count = counts.get(key);
      const ratio = total ? count / total : 0;
      return `
        <div class="statistics-composition-row">
          <b style="--stat-color:${COLORS[key] || "#94a3b8"}">${key}</b>
          <i><span style="width:${ratio * 100}%;--stat-color:${COLORS[key] || "#94a3b8"}"></span></i>
          <output>${count}</output>
          <small>${Math.round(ratio * 100)}%</small>
        </div>
      `;
    }).join("");
  }

  return { setActive, update };
}

function makeKpi(label, id, value) {
  return `<div class="statistics-kpi"><b>${label}</b><output id="${id}">${value}</output></div>`;
}

function makeLaneMetric(label, value, ratio, kind) {
  return `
    <div class="statistics-lane-metric" data-kind="${kind}">
      <span>${label}</span>
      <i><b style="width:${clampRatio(ratio) * 100}%"></b></i>
      <output>${value}</output>
    </div>
  `;
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

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}
