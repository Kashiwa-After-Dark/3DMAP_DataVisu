export function createAssigneeFilter({ root, sources, onChange }) {
  const allSourceIds = sources.map((source) => source.id);
  const defaultSourceIds = sources
    .filter((source) => source.visibleByDefault !== false)
    .map((source) => source.id);
  const addedSourceIds = sources
    .filter((source) => source.visibleByDefault === false)
    .map((source) => source.id);
  const allButtonSelections = [defaultSourceIds, allSourceIds, addedSourceIds];
  const allButton = makeButton("全員", "all");
  const sourceButtons = sources.map((source) => makeButton(source.label, source.id));
  let hasUserSelection = false;
  let allButtonClickIndex = 0;
  root.replaceChildren(allButton, ...sourceButtons);

  const getSelection = () => {
    const sourceIds = sourceButtons
      .filter((button) => button.classList.contains("is-active"))
      .map((button) => button.dataset.sourceId);
    const selectedSources = sources.filter((source) => sourceIds.includes(source.id));
    const segmentIndexes = [...new Set(selectedSources.map(getSourceSegmentIndex))].sort();
    const laneSegmentIndexes = Object.fromEntries(
      ["terrace", "reysol"].map((lane) => [
        lane,
        [...new Set(
          selectedSources
            .filter((source) => source.lane === lane)
            .map(getSourceSegmentIndex),
        )].sort(),
      ]),
    );
    return { sourceIds, segmentIndexes, laneSegmentIndexes };
  };

  const notifySelection = () => onChange?.(getSelection());

  const syncAllButton = () => {
    const allSelected = sourceButtons.every((button) => button.classList.contains("is-active"));
    allButton.classList.toggle("is-active", allSelected);
    allButton.setAttribute("aria-pressed", String(allSelected));
  };

  const setSelection = (sourceIds, { notify = true } = {}) => {
    const selectedIds = new Set(sourceIds);
    for (const button of sourceButtons) {
      const selected = selectedIds.has(button.dataset.sourceId);
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    syncAllButton();
    if (notify) notifySelection();
  };

  const selectAll = ({ notify = true } = {}) => {
    hasUserSelection = false;
    allButtonClickIndex = 0;
    setSelection(allSourceIds, { notify });
  };

  allButton.addEventListener("click", () => {
    hasUserSelection = false;
    setSelection(allButtonSelections[allButtonClickIndex]);
    allButtonClickIndex = (allButtonClickIndex + 1) % allButtonSelections.length;
  });
  for (const button of sourceButtons) {
    button.addEventListener("click", () => {
      allButtonClickIndex = 0;
      if (!hasUserSelection) {
        hasUserSelection = true;
        setSelection([button.dataset.sourceId]);
        return;
      }

      const selectedButtons = sourceButtons.filter((peer) => peer.classList.contains("is-active"));
      const selected = !button.classList.contains("is-active");
      if (!selected && selectedButtons.length === 1) return;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      syncAllButton();
      notifySelection();
    });
  }

  setSelection(defaultSourceIds, { notify: false });
  return { selectAll, getSelection };
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
