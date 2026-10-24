const PERIODS = [
  { id: "18-20", label: "18–20", start: 18, end: 20 },
  { id: "20-22", label: "20–22", start: 20, end: 22 },
  { id: "22-24", label: "22–24", start: 22, end: 24 },
];

export function createTimePeriodFilter({ root, onChange }) {
  const selected = new Set(PERIODS.map((period) => period.id));
  const buttons = PERIODS.map((period) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.periodId = period.id;
    button.textContent = period.label;
    button.title = `${period.label}時のデータ`;
    button.addEventListener("click", () => selectPeriod(period.id));
    return button;
  });
  root.replaceChildren(...buttons);

  function selectPeriod(periodId) {
    if (selected.size === PERIODS.length) {
      selected.clear();
      selected.add(periodId);
    } else if (selected.size === 1 && selected.has(periodId)) {
      PERIODS.forEach((period) => selected.add(period.id));
    } else if (selected.has(periodId)) {
      selected.delete(periodId);
    } else {
      selected.add(periodId);
    }
    if (!selected.size) selected.add(periodId);
    sync();
    onChange?.(getSelection());
  }

  function sync() {
    for (const button of buttons) {
      const active = selected.has(button.dataset.periodId);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  function getSelection() {
    return {
      periodIds: [...selected],
      segmentIndexes: PERIODS.flatMap((period, index) => selected.has(period.id) ? [index] : []),
    };
  }

  function selectAll({ notify = true } = {}) {
    selected.clear();
    PERIODS.forEach((period) => selected.add(period.id));
    sync();
    if (notify) onChange?.(getSelection());
  }

  sync();
  return {
    getSelection,
    matches: (memo) => selected.has(getPeriodId(memo.time)),
    selectAll,
  };
}

export function getPeriodId(time) {
  const date = new Date(time + 9 * 60 * 60 * 1000);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  return PERIODS.find((period) => hour >= period.start && hour < period.end)?.id || null;
}

