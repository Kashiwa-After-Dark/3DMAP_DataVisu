export function createStatisticsMode({
  button,
  timeline,
  minimizeTimeline,
  setFilterCollapsed,
  onEnter,
  onChange,
}) {
  let active = false;

  button.addEventListener("click", toggle);
  syncButton();

  async function toggle() {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const nextActive = !active;

      if (nextActive) {
        if (!timeline.classList.contains("is-minimized")) {
          await minimizeTimeline();
        }
        active = true;
        setFilterCollapsed?.(true);
        onEnter?.();
        document.body.classList.add("is-statistics-mode");
        onChange?.(true);
      } else {
        active = false;
        document.body.classList.remove("is-statistics-mode");
        onChange?.(false);
        setFilterCollapsed?.(false);
        if (timeline.classList.contains("is-minimized")) {
          await minimizeTimeline();
        }
      }
      syncButton();
    } finally {
      button.disabled = false;
    }
  }

  function syncButton() {
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "統計モードを終了" : "統計モード");
    button.title = active ? "統計モードを終了" : "統計モード";
  }

  return { isActive: () => active };
}
