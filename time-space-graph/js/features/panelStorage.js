export function createPanelStorage({ panel, button, content, storedClass = "is-stored" }) {
  if (!panel || !button) return null;
  let disengageTimer = 0;

  const cancelDisengage = () => window.clearTimeout(disengageTimer);
  const scheduleDisengage = () => {
    cancelDisengage();
    disengageTimer = window.setTimeout(() => {
      if (!button.matches(":hover")) panel.classList.remove("is-storage-engaged");
    }, 180);
  };

  content?.addEventListener("pointerenter", () => {
    cancelDisengage();
    panel.classList.add("is-storage-engaged");
  });
  content?.addEventListener("pointerleave", scheduleDisengage);
  button.addEventListener("pointerenter", cancelDisengage);
  button.addEventListener("pointerleave", scheduleDisengage);

  const setStored = (stored) => {
    cancelDisengage();
    if (stored) panel.classList.remove("is-storage-engaged");
    panel.classList.toggle(storedClass, stored);
    button.setAttribute("aria-expanded", String(!stored));
    button.setAttribute("aria-label", stored ? "カードデックを表示" : "カードデックを収納");
    button.title = stored ? "カードデックを表示" : "カードデックを収納";
    content?.toggleAttribute("inert", stored);

    if (stored && content?.contains(document.activeElement)) {
      button.focus({ preventScroll: true });
    }
  };

  button.addEventListener("click", () => {
    setStored(!panel.classList.contains(storedClass));
  });

  setStored(false);
  return { setStored };
}
