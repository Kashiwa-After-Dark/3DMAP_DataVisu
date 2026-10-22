export function createToolbarMenus({ root }) {
  if (!root) return null;

  const menus = [...root.querySelectorAll("[data-toolbar-menu]")];

  const closeAll = (except = null) => {
    for (const menu of menus) {
      if (menu === except) continue;
      menu.classList.remove("is-open");
      menu.querySelector("[data-toolbar-menu-toggle]")?.setAttribute("aria-expanded", "false");
    }
  };

  for (const menu of menus) {
    const toggle = menu.querySelector("[data-toolbar-menu-toggle]");
    const panel = menu.querySelector("[data-toolbar-menu-panel]");
    if (!toggle || !panel) continue;

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const shouldOpen = !menu.classList.contains("is-open");
      closeAll(menu);
      menu.classList.toggle("is-open", shouldOpen);
      toggle.setAttribute("aria-expanded", String(shouldOpen));
    });

    panel.addEventListener("click", (event) => {
      if (!event.target.closest("button, a")) return;
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("[data-toolbar-menu]")) closeAll();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.body.classList.contains("is-hint-mode")) closeAll();
  });

  return { closeAll };
}
