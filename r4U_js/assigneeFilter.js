export function createAssigneeFilter({ root, sources, onChange }) {
  const allSourceIds = sources.map((source) => source.id);
  const allButton = makeButton("全員", "all");
  const sourceButtons = sources.map((source) => makeButton(source.label, source.id));
  root.replaceChildren(allButton, ...sourceButtons);

  const selectAll = ({ notify = true } = {}) => {
    allButton.classList.add("is-active");
    allButton.setAttribute("aria-pressed", "true");
    for (const button of sourceButtons) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    }
    if (notify) onChange?.({ sourceIds: allSourceIds, segmentIndexes: [0, 1, 2] });
  };

  allButton.addEventListener("click", () => selectAll());
  for (const [index, button] of sourceButtons.entries()) {
    button.addEventListener("click", () => {
      allButton.classList.remove("is-active");
      allButton.setAttribute("aria-pressed", "false");
      for (const peer of sourceButtons) {
        const selected = peer === button;
        peer.classList.toggle("is-active", selected);
        peer.setAttribute("aria-pressed", String(selected));
      }
      onChange?.({
        sourceIds: [sources[index].id],
        segmentIndexes: [getSourceSegmentIndex(sources[index])],
      });
    });
  }

  selectAll({ notify: false });
  return { selectAll };
}

function makeButton(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.sourceId = value;
  button.textContent = label;
  button.setAttribute("aria-pressed", "false");
  return button;
}

function getSourceSegmentIndex(source) {
  const startHour = Number(source.file.match(/_(\d{2})\d{2}_/)?.[1]);
  if (startHour < 20) return 0;
  if (startHour < 22) return 1;
  return 2;
}
