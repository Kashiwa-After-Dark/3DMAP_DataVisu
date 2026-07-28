export function createTimelineKeyboard({
  getCurrentSeconds,
  getMaxSeconds,
  onTogglePlayback,
  onSeek,
}) {
  document.addEventListener("keydown", handleKeyDown, true);

  function handleKeyDown(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (isEditableTarget(event.target)) return;

    if (event.code === "Space") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      releaseButtonFocus();
      onTogglePlayback();
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;

    const maxSeconds = Number(getMaxSeconds());
    if (!(maxSeconds > 0)) return;
    const currentSeconds = Number(getCurrentSeconds());
    const segmentSeconds = maxSeconds / 3;
    const currentSegment = currentSeconds / segmentSeconds;
    const boundaryIndex = event.key === "ArrowRight"
      ? Math.floor(currentSegment + 1e-6) + 1
      : Math.ceil(currentSegment - 1e-6) - 1;
    const targetSeconds = Math.max(
      0,
      Math.min(maxSeconds, Math.round(boundaryIndex * segmentSeconds)),
    );

    releaseButtonFocus();
    onSeek(targetSeconds, { ended: targetSeconds >= maxSeconds });
  }
}

function isEditableTarget(target) {
  return target instanceof Element
    && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function releaseButtonFocus() {
  if (document.activeElement instanceof HTMLButtonElement) {
    document.activeElement.blur();
  }
}
