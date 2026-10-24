const PERIODS = [
  { id: "18-20", label: "18–20", start: 18, end: 20 },
  { id: "20-22", label: "20–22", start: 20, end: 22 },
  { id: "22-24", label: "22–24", start: 22, end: 24 },
];

export function createStatisticsPeriodFilter({ root, allButton, onChange }) {
  const selected = new Set(PERIODS.map((period) => period.id));
  const buttons = PERIODS.map((period) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.periodId = period.id;
    button.textContent = period.label;
    button.addEventListener("click", () => toggle(period.id));
    return button;
  });
  root.replaceChildren(...buttons);
  allButton.addEventListener("click", () => selectAll());

  function toggle(periodId) {
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

  function selectAll() {
    selected.clear();
    PERIODS.forEach((period) => selected.add(period.id));
    sync();
    onChange?.(getSelection());
  }

  function sync() {
    for (const button of buttons) {
      const active = selected.has(button.dataset.periodId);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    allButton.classList.toggle("is-active", selected.size === PERIODS.length);
  }

  function matches(memo) {
    const date = new Date(memo.time + 9 * 60 * 60 * 1000);
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
    const period = PERIODS.find((item) => hour >= item.start && hour < item.end);
    return period ? selected.has(period.id) : false;
  }

  function getSelection() {
    return {
      periodIds: [...selected],
      segmentIndexes: PERIODS.flatMap((period, index) => selected.has(period.id) ? [index] : []),
    };
  }

  sync();
  return { getSelection, matches };
}

