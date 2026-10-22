export function createTimelineRange({
  endSlider,
  startSlider,
  selection,
  onChange,
}) {
  const shell = endSlider.closest(".time-track-shell");
  let active = false;
  let dragState = null;
  let playbackPlan = null;
  let replayPlan = null;
  const selectedHandles = new Set();

  endSlider.addEventListener("pointerdown", (event) => toggleHandleSelection(event, "end"));
  startSlider.addEventListener("pointerdown", (event) => toggleHandleSelection(event, "start"));
  endSlider.addEventListener("dblclick", toggleRange);
  startSlider.addEventListener("dblclick", toggleRange);
  selection.addEventListener("dblclick", disableRange);
  selection.addEventListener("pointerdown", startSelectionDrag);
  selection.addEventListener("pointermove", moveSelectionDrag);
  selection.addEventListener("pointerup", endSelectionDrag);
  selection.addEventListener("pointercancel", endSelectionDrag);
  window.addEventListener("resize", sync);
  endSlider.addEventListener("input", () => {
    if (active && Number(endSlider.value) < Number(startSlider.value)) {
      startSlider.value = endSlider.value;
    }
    sync();
    notify();
  });
  startSlider.addEventListener("input", () => {
    if (Number(startSlider.value) > Number(endSlider.value)) {
      startSlider.value = endSlider.value;
    }
    sync();
    notify();
  });

  function toggleRange(event) {
    event.preventDefault();
    if (active) {
      disableRange(event);
      return;
    }
    active = true;
    startSlider.hidden = false;
    const min = Number(endSlider.min || 0);
    const max = Number(endSlider.max || 0);
    const initialWidth = Math.min(10 * 60, Math.max(max - min, 0));
    const currentEnd = Number(endSlider.value);
    if (currentEnd - min >= initialWidth) {
      startSlider.value = String(currentEnd - initialWidth);
    } else {
      startSlider.value = String(min);
      endSlider.value = String(Math.min(max, min + initialWidth));
    }
    shell.classList.add("is-range-active");
    sync();
    notify();
  }

  function disableRange(event) {
    event?.preventDefault();
    if (!active) return;
    endSelectionDrag();
    active = false;
    selectedHandles.clear();
    startSlider.value = endSlider.value;
    startSlider.hidden = true;
    shell.classList.remove("is-range-active", "is-range-origin-start");
    sync();
    notify();
  }

  function toggleHandleSelection(event, handle) {
    if (!active || !event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (selectedHandles.size === 2) {
      selectedHandles.clear();
      selectedHandles.add(handle);
    } else if (selectedHandles.has(handle)) {
      selectedHandles.add(handle === "start" ? "end" : "start");
    } else {
      selectedHandles.add(handle);
    }
    playbackPlan = null;
    replayPlan = null;
    sync();
  }

  function startSelectionDrag(event) {
    if (!active || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const start = Number(startSlider.value);
    const end = Number(endSlider.value);
    dragState = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      start,
      end,
      trackWidth: Math.max(endSlider.clientWidth, 1),
    };
    selection.setPointerCapture(event.pointerId);
    selection.classList.add("is-dragging");
  }

  function moveSelectionDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    const min = Number(endSlider.min || 0);
    const max = Number(endSlider.max || 0);
    const step = Math.max(Number(endSlider.step || 1), 1);
    const duration = dragState.end - dragState.start;
    const secondsPerPixel = (max - min) / dragState.trackWidth;
    const rawStart = dragState.start + (event.clientX - dragState.clientX) * secondsPerPixel;
    const clampedStart = Math.min(Math.max(rawStart, min), max - duration);
    const nextStart = Math.min(
      max - duration,
      min + Math.round((clampedStart - min) / step) * step,
    );
    startSlider.value = String(nextStart);
    endSlider.value = String(nextStart + duration);
    sync();
    notify();
  }

  function endSelectionDrag(event) {
    if (!dragState || (event && event.pointerId !== dragState.pointerId)) return;
    if (selection.hasPointerCapture?.(dragState.pointerId)) {
      selection.releasePointerCapture(dragState.pointerId);
    }
    dragState = null;
    selection.classList.remove("is-dragging");
  }

  function setMax(max) {
    startSlider.max = String(max);
    sync();
  }

  function setEnd(seconds) {
    playbackPlan = null;
    replayPlan = null;
    endSlider.value = String(seconds);
    if (active && Number(startSlider.value) > Number(endSlider.value)) {
      startSlider.value = endSlider.value;
    }
    sync();
  }

  function beginPlayback() {
    const start = Number(startSlider.value);
    const end = Number(endSlider.value);
    const max = Number(endSlider.max || 0);
    const moveStart = active && selectedHandles.has("start");
    const moveEnd = selectedHandles.has("end") || (!moveStart && !selectedHandles.has("end"));
    const explicitSelection = moveStart || selectedHandles.has("end");
    const offset = moveStart && !moveEnd ? start : end;
    const maxDelta = moveStart && !moveEnd ? end - start : max - end;
    playbackPlan = {
      start,
      end,
      moveStart,
      moveEnd,
      offset,
      max: offset + Math.max(0, maxDelta),
      explicitSelection,
    };
    replayPlan = { ...playbackPlan };
    return { offset: playbackPlan.offset, max: playbackPlan.max };
  }

  function setPlaybackPosition(position) {
    if (!playbackPlan) beginPlayback();
    const delta = Math.min(
      Math.max(Number(position) - playbackPlan.offset, 0),
      playbackPlan.max - playbackPlan.offset,
    );
    if (playbackPlan.moveStart) startSlider.value = String(playbackPlan.start + delta);
    if (playbackPlan.moveEnd) endSlider.value = String(playbackPlan.end + delta);
    sync();
  }

  function resetPlayback() {
    const min = Number(endSlider.min || 0);
    if (replayPlan?.explicitSelection) {
      startSlider.value = String(replayPlan.start);
      endSlider.value = String(replayPlan.end);
    } else {
      startSlider.value = String(min);
      endSlider.value = String(min);
    }
    playbackPlan = null;
    replayPlan = null;
    sync();
    return Number(endSlider.value);
  }

  function endPlayback({ preserveReplay = false } = {}) {
    playbackPlan = null;
    if (!preserveReplay) replayPlan = null;
  }

  function getStartSeconds() {
    return active ? Number(startSlider.value) : Number(endSlider.min || 0);
  }

  function sync() {
    const min = Number(endSlider.min || 0);
    const max = Number(endSlider.max || 0);
    const span = Math.max(max - min, 1);
    const start = active ? Number(startSlider.value) : min;
    const end = Number(endSlider.value);
    const startPercent = ((start - min) / span) * 100;
    const endPercent = ((end - min) / span) * 100;
    const trackLeft = endSlider.offsetLeft;
    const trackWidth = endSlider.clientWidth;
    selection.style.left = `${trackLeft + trackWidth * (startPercent / 100)}px`;
    selection.style.width = `${trackWidth * (Math.max(0, endPercent - startPercent) / 100)}px`;
    shell.classList.toggle("is-range-origin-start", active && start === min && start === end);
    selection.title = active ? "ドラッグで選択範囲を移動・ダブルクリックで解除" : "";
    startSlider.title = active ? "SHIFT+クリックで再生対象・ダブルクリックで範囲解除" : "";
    endSlider.title = active
      ? "SHIFT+クリックで再生対象・ダブルクリックで範囲解除"
      : "ダブルクリックで範囲選択";
    syncHandleSelection();
    startSlider.setAttribute("aria-valuetext", `範囲開始 ${formatOffset(start)}`);
    endSlider.setAttribute(
      "aria-valuetext",
      active ? `範囲終了 ${formatOffset(end)}` : `表示時刻 ${formatOffset(end)}`,
    );
  }

  function syncHandleSelection() {
    startSlider.classList.toggle("is-playback-selected", active && selectedHandles.has("start"));
    endSlider.classList.toggle("is-playback-selected", active && selectedHandles.has("end"));
    startSlider.setAttribute("aria-selected", String(active && selectedHandles.has("start")));
    endSlider.setAttribute("aria-selected", String(active && selectedHandles.has("end")));
  }

  function notify() {
    onChange?.({
      active,
      start: getStartSeconds(),
      end: Number(endSlider.value),
    });
  }

  return {
    beginPlayback,
    endPlayback,
    getEndSeconds: () => Number(endSlider.value),
    getStartSeconds,
    isActive: () => active,
    resetPlayback,
    setEnd,
    setMax,
    setPlaybackPosition,
    sync,
  };
}

function formatOffset(seconds) {
  const totalMinutes = Math.round(Number(seconds) / 60);
  const hour = 18 + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
