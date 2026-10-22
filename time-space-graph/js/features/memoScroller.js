export function createMemoScroller({ viewport, slider, progress, totalReadout, currentReadout }) {
  let pendingFrame = 0;
  let followLatest = true;
  let requestedPercentage = 100;
  let contentChanged = false;

  const updateReadouts = (dataCount, percentage) => {
    const currentCount = Math.round(dataCount * percentage / 100);
    totalReadout.textContent = String(dataCount);
    currentReadout.textContent = String(currentCount);
    currentReadout.style.top = `${100 - percentage}%`;
    currentReadout.classList.toggle("is-at-end", percentage <= 0.5 || percentage >= 99.5);
  };

  const syncFromViewport = () => {
    pendingFrame = 0;
    const dataCount = viewport.querySelectorAll(".memo-item").length;
    const maxScroll = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);

    if (contentChanged) {
      viewport.scrollTop = followLatest
        ? 0
        : maxScroll * (1 - requestedPercentage / 100);
      contentChanged = false;
    }

    const ratio = maxScroll > 0 ? viewport.scrollTop / maxScroll : 0;
    const percentage = Math.max(0, Math.min((1 - ratio) * 100, 100));
    requestedPercentage = percentage;
    followLatest = percentage >= 99.5;
    slider.max = String(Math.max(dataCount, 1));
    slider.value = String(Math.round(dataCount * percentage / 100));
    progress.style.height = `${percentage}%`;
    updateReadouts(dataCount, percentage);
  };

  const refresh = ({ afterContentChange = false } = {}) => {
    contentChanged ||= afterContentChange;
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(syncFromViewport);
  };

  slider.addEventListener("input", () => {
    const dataCount = viewport.querySelectorAll(".memo-item").length;
    const maxScroll = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
    requestedPercentage = dataCount > 0 ? Number(slider.value) / dataCount * 100 : 100;
    followLatest = requestedPercentage >= 99.5;
    viewport.scrollTop = maxScroll * (1 - requestedPercentage / 100);
    progress.style.height = `${requestedPercentage}%`;
    updateReadouts(dataCount, requestedPercentage);
  });
  viewport.addEventListener("scroll", () => refresh(), { passive: true });
  window.addEventListener("resize", () => refresh());
  refresh();

  return { refresh };
}
