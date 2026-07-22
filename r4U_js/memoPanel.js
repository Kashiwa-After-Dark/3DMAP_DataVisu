import { hexToRgbChannels } from "../src/formatters.js";
import { formatProfileBadge } from "./profiles.js";

export function renderMemoPanel({ list, memos, currentTime, activeMemo, categories, formatTime, onSelect }) {
  const visibleMemos = memos
    .filter((memo) => memo.time <= currentTime)
    .slice(-8)
    .reverse();

  list.replaceChildren(
    ...visibleMemos.map((memo) => makeMemoItem({
      memo,
      isSelected: memo === activeMemo,
      category: categories[memo.category],
      formatTime,
      onSelect,
    })),
  );
}

function makeMemoItem({ memo, isSelected, category, formatTime, onSelect }) {
  const item = document.createElement("article");
  item.className = `memo-item${isSelected ? " is-selected" : ""}`;
  item.tabIndex = 0;
  item.role = "button";
  item.setAttribute("aria-label", `${formatTime(memo.time)}の観察データへ移動`);
  item.style.setProperty("--memo-color", category.color);
  item.style.setProperty("--memo-soft", category.soft);
  item.style.setProperty("--memo-rgb", hexToRgbChannels(category.color));
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
