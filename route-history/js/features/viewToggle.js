export function createViewToggle({ view3dButton, view2dButton, onChange }) {
  const buttons = {
    "3d": view3dButton,
    "2d": view2dButton,
  };

  for (const [mode, button] of Object.entries(buttons)) {
    button.addEventListener("click", () => onChange?.(mode));
  }

  return {
    setActive(mode) {
      for (const [buttonMode, button] of Object.entries(buttons)) {
        const isActive = buttonMode === mode;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      }
    },
  };
}
