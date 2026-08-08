import { hexToRgbChannels } from "../formatters.js";
import { formatProfileBadge } from "./profiles.js?v=20260725-2";

const renderStates = new WeakMap();
const dockStates = new WeakMap();
const dockAnimations = new WeakMap();
const keyboardEnabledLists = new WeakSet();

export function renderMemoPanel({
  list,
  memos,
  activeMemo,
  suppressedMemo,
  categories,
  formatTime,
  onSelect,
  onHover,
  onHoverSuppressionEnd,
}) {
  enableGlobalKeyboardNavigation(list);
  const chronologicalMemos = [...memos].sort((a, b) => b.time - a.time);
  const latestMemo = chronologicalMemos[0];
  const featuredMemo = chronologicalMemos.includes(activeMemo) ? activeMemo : null;
  const previous = renderStates.get(list);
  const unchanged = previous
    && previous.activeMemo === activeMemo
    && previous.featuredMemo === featuredMemo
    && previous.suppressedMemo === suppressedMemo
    && previous.memos.length === chronologicalMemos.length
    && previous.memos.every((memo, index) => memo === chronologicalMemos[index]);
  if (unchanged) return false;

  list.replaceChildren(
    ...chronologicalMemos.map((memo, index) => makeMemoItem({
      memo,
      index,
      isCurrent: memo === featuredMemo,
      isHoverSuppressed: memo === suppressedMemo,
      isLatest: memo === latestMemo,
      category: categories[memo.category],
      formatTime,
      onSelect,
      onHover,
      onHoverSuppressionEnd,
    })),
  );
  renderStates.set(list, {
    memos: chronologicalMemos,
    activeMemo,
    featuredMemo,
    suppressedMemo,
  });
  return true;
}

function makeMemoItem({
  memo,
  index,
  isCurrent,
  isHoverSuppressed,
  isLatest,
  category,
  formatTime,
  onSelect,
  onHover,
  onHoverSuppressionEnd,
}) {
  const item = document.createElement("article");
  item.className = [
    "memo-item",
    "is-stacked",
    isCurrent ? "is-current" : "",
    isHoverSuppressed ? "is-hover-suppressed" : "",
    isLatest ? "is-latest" : "",
  ].filter(Boolean).join(" ");
  item.tabIndex = 0;
  item.role = "button";
  item.style.setProperty("--deck-index", String(index));
  item.style.setProperty("--deck-offset", "0px");
  item.style.setProperty("--deck-tilt", "0deg");
  item.style.setProperty("--deck-layer", String(Math.max(1, 30 - Math.min(index, 29))));
  item.setAttribute("aria-label", `${formatTime(memo.time)}の観察データへ移動`);
  item.setAttribute("aria-pressed", String(isCurrent));
  item.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown Enter");
  if (isCurrent) item.setAttribute("aria-current", "true");
  item.style.setProperty("--memo-color", category.color);
  item.style.setProperty("--memo-soft", category.soft);
  item.style.setProperty("--memo-rgb", hexToRgbChannels(category.color));
  item.addEventListener("mouseenter", () => {
    if (item.parentElement?.dataset.dockInputMode === "keyboard") return;
    item.parentElement.dataset.dockInputMode = "pointer";
    setDockFocus(item);
    if (!item.classList.contains("is-hover-suppressed")) onHover(memo);
  });
  item.addEventListener("pointermove", () => {
    const list = item.parentElement;
    if (!list || list.dataset.dockInputMode !== "keyboard") return;
    list.dataset.dockInputMode = "pointer";
    setDockFocus(item);
    if (!item.classList.contains("is-hover-suppressed")) onHover(memo);
  });
  item.addEventListener("mouseleave", () => {
    if (item.parentElement?.dataset.dockInputMode === "keyboard") return;
    clearDockFocus(item.parentElement);
    if (item.classList.contains("is-hover-suppressed")) {
      item.classList.remove("is-hover-suppressed");
      onHoverSuppressionEnd(memo);
    }
    onHover(null);
  });
  item.addEventListener("focus", () => {
    if (item.parentElement?.dataset.dockInputMode !== "pointer") {
      item.parentElement.dataset.dockInputMode = "keyboard";
    }
    setDockFocus(item);
    if (!item.classList.contains("is-hover-suppressed")) onHover(memo);
  });
  item.addEventListener("blur", () => {
    if (item.parentElement?.dataset.dockInputMode === "keyboard") return;
    clearDockFocus(item.parentElement);
    onHover(null);
  });
  item.addEventListener("click", () => onSelect(memo));
  item.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      focusAdjacentMemoItem(item, event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.repeat) return;
    onSelect(memo);
  });

  const meta = document.createElement("div");
  meta.className = "memo-meta";

  const time = document.createElement("time");
  time.textContent = formatTime(memo.time);

  const badge = document.createElement("span");
  badge.className = "memo-category";
  badge.textContent = formatProfileBadge(memo, category);

  const title = document.createElement("strong");
  title.textContent = memo.name;

  const source = document.createElement("small");
  source.className = "memo-source";
  source.textContent = memo.sourceLabel;

  meta.append(time, badge);
  item.append(meta, title, source);
  if (memo.desc) {
    const body = document.createElement("p");
    body.textContent = memo.desc;
    item.append(body);
  }

  return item;
}

function focusAdjacentMemoItem(item, direction) {
  const items = [...item.parentElement?.children || []];
  const nextItem = items[items.indexOf(item) + direction];
  if (!nextItem) return;
  focusMemoItem(nextItem);
}

function enableGlobalKeyboardNavigation(list) {
  if (keyboardEnabledLists.has(list)) return;
  keyboardEnabledLists.add(list);

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    if (list.closest(".memo-panel.is-stored")) return;
    const isNavigationKey = event.key === "ArrowUp" || event.key === "ArrowDown";
    const isActivationKey = event.key === "Enter";
    if (!isNavigationKey && !isActivationKey) return;
    if (event.target.closest("input, textarea, select, button, [contenteditable='true']")) return;

    const items = [...list.children];
    if (!items.length) return;
    const focusedItem = document.activeElement?.closest?.(".memo-item");
    const anchor = focusedItem && list.contains(focusedItem)
      ? focusedItem
      : list.querySelector(".is-dock-focus, .is-current");

    if (isActivationKey) {
      if (!anchor || event.repeat) return;
      event.preventDefault();
      anchor.click();
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const anchorIndex = anchor ? items.indexOf(anchor) : -1;
    const nextIndex = anchorIndex < 0
      ? (direction > 0 ? 0 : items.length - 1)
      : Math.max(0, Math.min(anchorIndex + direction, items.length - 1));

    event.preventDefault();
    focusMemoItem(items[nextIndex]);
  });
}

function focusMemoItem(item) {
  item.parentElement.dataset.dockInputMode = "keyboard";
  item.focus({ preventScroll: true });
  scrollMemoItemVertically(item);
}

function scrollMemoItemVertically(item) {
  const viewport = item.closest(".memo-scroll-viewport");
  if (!viewport) return;

  viewport.scrollLeft = 0;
  const viewportTop = viewport.scrollTop;
  const viewportBottom = viewportTop + viewport.clientHeight;
  const itemTop = item.offsetTop;
  const itemHeight = Math.min(Math.max(item.scrollHeight, 132), 300);
  const itemBottom = itemTop + itemHeight;
  const edgePadding = 10;

  if (itemTop < viewportTop + edgePadding) {
    viewport.scrollTop = Math.max(itemTop - edgePadding, 0);
  } else if (itemBottom > viewportBottom - edgePadding) {
    viewport.scrollTop += itemBottom - viewportBottom + edgePadding;
  }
  viewport.scrollLeft = 0;
}

function setDockFocus(item) {
  const list = item.parentElement;
  if (!list) return;
  if (item.classList.contains("is-current")) {
    clearDockFocus(list);
    return;
  }
  if (list.querySelector(".is-dock-focus") === item) return;

  animateDockLayout(list, () => {
    clearDockClasses(list);
    const items = [...list.children];
    const focusIndex = items.indexOf(item);
    const affectedItems = [];
    for (let offset = -2; offset <= 2; offset += 1) {
      const neighbor = items[focusIndex + offset];
      if (!neighbor) continue;
      const distance = Math.abs(offset);
      neighbor.classList.add(distance === 0 ? "is-dock-focus" : `is-dock-near-${distance}`);
      affectedItems.push(neighbor);
    }
    dockStates.set(list, affectedItems);
  }, item);
}

function clearDockFocus(list) {
  if (!list) return;
  if (!dockStates.has(list)) return;
  animateDockLayout(list, () => clearDockClasses(list));
}

function clearDockClasses(list) {
  for (const item of dockStates.get(list) || []) {
    item.classList.remove("is-dock-focus", "is-dock-near-1", "is-dock-near-2");
  }
  dockStates.delete(list);
}

function animateDockLayout(list, updateClasses, focusedItem = null) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    updateClasses();
    return;
  }

  const before = getVisibleCardPositions(list);
  updateClasses();
  const after = getVisibleCardPositions(list);
  const timing = {
    duration: 260,
    easing: "cubic-bezier(0.2, 0.75, 0.2, 1)",
  };

  for (const [item, afterTop] of after) {
    const beforeTop = before.get(item);
    if (beforeTop === undefined) continue;
    const deltaY = beforeTop - afterTop;
    if (Math.abs(deltaY) < 0.5) continue;
    dockAnimations.get(item)?.cancel();
    const animation = item.animate(
      [{ translate: `0 ${deltaY}px` }, { translate: "0 0" }],
      timing,
    );
    dockAnimations.set(item, animation);
    animation.addEventListener("finish", () => dockAnimations.delete(item), { once: true });
    animation.addEventListener("cancel", () => dockAnimations.delete(item), { once: true });
  }

  if (focusedItem) {
    focusedItem.animate(
      [
        { clipPath: "inset(0 0 64% 0)", opacity: 0.78 },
        { clipPath: "inset(0 0 0 0)", opacity: 1 },
      ],
      timing,
    );
  }
}

function getVisibleCardPositions(list) {
  const viewport = list.closest(".memo-scroll-viewport");
  const viewportRect = viewport?.getBoundingClientRect();
  const positions = new Map();
  for (const item of list.children) {
    const rect = item.getBoundingClientRect();
    if (
      viewportRect
      && (rect.bottom < viewportRect.top - 180 || rect.top > viewportRect.bottom + 180)
    ) {
      continue;
    }
    positions.set(item, rect.top);
  }
  return positions;
}
