export function createTaskbarVisibility({ bars }) {
  for (const bar of bars.filter(Boolean)) {
    bar.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (document.body.classList.contains("is-hint-mode")) return;
      bar.classList.toggle("is-auto-hidden");
    });
  }
}
