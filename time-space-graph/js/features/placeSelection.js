export function createPlaceSelection({ lanes, onChange }) {
  const buttons = new Map(
    [...lanes].map((lane) => [lane.dataset.timeLane, lane.querySelector("[data-place-select]")]),
  );
  const selected = new Set(buttons.keys());

  for (const [lane, button] of buttons) {
    button.addEventListener("click", () => {
      if (selected.size === buttons.size) {
        selected.clear();
        selected.add(lane);
      } else if (selected.has(lane)) {
        selectAll();
        return;
      } else {
        selected.add(lane);
      }
      sync();
      notify();
    });
  }

  function setSelection(lanesToSelect, { notify: shouldNotify = true } = {}) {
    selected.clear();
    for (const lane of lanesToSelect) {
      if (buttons.has(lane)) selected.add(lane);
    }
    if (!selected.size) {
      for (const lane of buttons.keys()) selected.add(lane);
    }
    sync();
    if (shouldNotify) notify();
  }

  function selectAll({ notify: shouldNotify = true } = {}) {
    setSelection(buttons.keys(), { notify: shouldNotify });
  }

  function sync() {
    for (const [lane, button] of buttons) {
      const isSelected = selected.has(lane);
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      button.closest("[data-time-lane]")?.classList.toggle("is-place-muted", !isSelected);
    }
  }

  function notify() {
    onChange?.(new Set(selected));
  }

  sync();
  return {
    getSelection: () => new Set(selected),
    selectAll,
    setSelection,
  };
}
