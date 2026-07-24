import { hexToRgbChannels } from "../src/formatters.js";
import { formatProfileBadge } from "./profiles.js?v=20260725-2";

const renderStates = new WeakMap();

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
  item.style.setProperty("--deck-offset", `${Math.min(index, 5) * 2}px`);
  item.style.setProperty("--deck-tilt", `${((index % 3) - 1) * 0.35}deg`);
  item.style.setProperty("--deck-layer", String(Math.max(1, 30 - Math.min(index, 29))));
  item.setAttribute("aria-label", `${formatTime(memo.time)}の観察データへ移動`);
  item.setAttribute("aria-pressed", String(isCurrent));
  if (isCurrent) item.setAttribute("aria-current", "true");
  item.style.setProperty("--memo-color", category.color);
  item.style.setProperty("--memo-soft", category.soft);
  item.style.setProperty("--memo-rgb", hexToRgbChannels(category.color));
  item.addEventListener("mouseenter", () => {
    if (!item.classList.contains("is-hover-suppressed")) onHover(memo);
  });
  item.addEventListener("mouseleave", () => {
    if (item.classList.contains("is-hover-suppressed")) {
      item.classList.remove("is-hover-suppressed");
      onHoverSuppressionEnd(memo);
    }
    onHover(null);
  });
  item.addEventListener("focus", () => {
    if (!item.classList.contains("is-hover-suppressed")) onHover(memo);
  });
  item.addEventListener("blur", () => onHover(null));
  item.addEventListener("click", () => onSelect(memo));
  item.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
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
