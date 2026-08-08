export function createRouteSelection({
  root,
  sources,
  categories,
  getMemos,
  onSelect,
  onDeselect,
}) {
  const displayDuration = 6000;
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  let hideTimer = 0;
  let activeSourceId = null;

  function select(sourceId, anchor) {
    const source = sourceById.get(sourceId);
    if (!source) return;
    if (activeSourceId === sourceId) {
      activeSourceId = null;
      onDeselect?.(source);
      hide();
      return;
    }
    const isSwitching = activeSourceId !== null;
    activeSourceId = sourceId;
    onSelect?.(source, { isSwitching });
    showSummary(source, anchor);
  }

  function showSummary(source, anchor = {}) {
    const memos = getMemos(source.id) || [];
    const categoryCounts = new Map();
    for (const memo of memos) {
      categoryCounts.set(memo.category, (categoryCounts.get(memo.category) || 0) + 1);
    }
    const ratios = [...categoryCounts]
      .map(([code, count]) => ({
        code,
        count,
        ratio: memos.length ? count / memos.length : 0,
        color: categories[code]?.color || "#94a3b8",
      }))
      .sort((a, b) => b.count - a.count);
    const place = source.lane === "terrace" ? "テラス" : "レイソル";

    const header = document.createElement("header");
    header.innerHTML = `<span>ROUTE · ${place}</span><strong>${source.label}</strong>`;
    const count = document.createElement("p");
    count.className = "route-summary__count";
    count.innerHTML = `<span>DATA</span><b>${memos.length}</b><small>件</small>`;
    const ratioBar = document.createElement("div");
    ratioBar.className = "route-summary__ratio-bar";
    ratioBar.setAttribute("aria-label", "データ種類の割合");
    for (const item of ratios) {
      const segment = document.createElement("i");
      segment.style.flexGrow = String(item.count);
      segment.style.background = item.color;
      segment.title = `${item.code} ${Math.round(item.ratio * 100)}%`;
      ratioBar.append(segment);
    }
    const ratioLabels = document.createElement("div");
    ratioLabels.className = "route-summary__ratios";
    for (const item of ratios) {
      const label = document.createElement("span");
      label.style.setProperty("--route-ratio-color", item.color);
      label.innerHTML = `<b>${item.code}</b>${Math.round(item.ratio * 100)}%`;
      ratioLabels.append(label);
    }
    const lifetime = document.createElement("i");
    lifetime.className = "route-summary__lifetime";
    lifetime.title = "表示残り時間";
    lifetime.setAttribute("aria-hidden", "true");
    lifetime.append(document.createElement("b"));
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "route-summary__close";
    closeButton.textContent = "×";
    closeButton.title = "閉じる";
    closeButton.setAttribute("aria-label", "ルート情報を閉じる");
    closeButton.addEventListener("click", hide);

    root.replaceChildren(header, count, ratioBar, ratioLabels, lifetime, closeButton);
    root.hidden = false;
    root.classList.remove("is-visible");
    positionRoot(anchor.clientX, anchor.clientY);
    requestAnimationFrame(() => root.classList.add("is-visible"));
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, displayDuration);
  }

  function positionRoot(clientX = window.innerWidth / 2, clientY = window.innerHeight / 2) {
    const width = 270;
    const height = 154;
    const left = Math.min(Math.max(clientX + 16, 14), window.innerWidth - width - 14);
    const top = Math.min(Math.max(clientY - height / 2, 14), window.innerHeight - height - 14);
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  }

  function hide() {
    root.classList.remove("is-visible");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      root.hidden = true;
    }, 180);
  }

  return { hide, select };
}
