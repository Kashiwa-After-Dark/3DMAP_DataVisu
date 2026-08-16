import { extractContentTerms } from "./japaneseContentWords.js?v=20260809-05";
import { translateDataText } from "./languageMode.js?v=20260809-05";

const MAX_WORDS = 64;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 34;
const TERM_ALIASES = [
  [/(?:会話|談笑|話|chat|talk)/iu, "会話"],
  [/(?:座り|座る|腰掛|sitting|seated)/iu, "座る"],
  [/(?:立ち|立つ|standing)/iu, "立つ"],
  [/(?:待ち|待つ|waiting)/iu, "待つ"],
  [/(?:歩く|歩い|walking|walked|heading|leaving)/iu, "歩く"],
  [/(?:飲酒|飲み|呑み|drinking|drunk|beer)/iu, "飲酒"],
  [/(?:飲食|食事|食べ|eating|food)/iu, "飲食"],
  [/(?:喫煙|煙草|タバコ|smoking|smoke)/iu, "喫煙"],
  [/(?:呼び込み|キャッチ|catching|catch)/iu, "呼び込み"],
  [/(?:電話|スマホ|携帯|phone|cellphone)/iu, "スマホ"],
  [/(?:手をつな|holding|hands)/iu, "手をつなぐ"],
  [/(?:楽し|笑顔|笑い|happy|jovial|merrily)/iu, "楽しそう"],
  [/(?:女性|女の人|ladies|lady|women|woman)/iu, "女性"],
  [/(?:男性|男の人|dudes|dude|guys|guy|men|man)/iu, "男性"],
  [/(?:カップル|couples|couple)/iu, "カップル"],
  [/(?:駅前|station)/iu, "駅前"],
  [/(?:路上|道路|street|road)/iu, "路上"],
  [/(?:グループ|group)/iu, "グループ"],
  [/(?:居酒屋|飲み屋|bars|bar|izakaya)/iu, "飲食店"],
  [/(?:ごみ|ゴミ|trash)/iu, "ごみ"],
];

export function createStatisticsWordCloud({ root }) {
  let mode = "period";
  let language = "ja";
  let latestState = null;

  root.innerHTML = `
    <header>
      <div><b>WORD CLOUD</b><span class="statistics-word-period"></span></div>
      <div class="statistics-word-tabs" role="tablist" aria-label="ワードクラウドの時間範囲">
        <button type="button" data-word-range="period" class="is-active" role="tab" aria-selected="true">TIME</button>
        <button type="button" data-word-range="all" role="tab" aria-selected="false">ALL</button>
      </div>
    </header>
    <div class="statistics-word-legend" aria-label="ワードクラウドの色分類">
      <span data-sentiment="positive">POS</span>
      <span data-sentiment="neutral">NEU</span>
      <span data-sentiment="negative">NEG</span>
      <span data-sentiment="action">ACTION</span>
    </div>
    <div class="statistics-word-cloud" aria-live="polite"></div>
  `;

  const periodLabel = root.querySelector(".statistics-word-period");
  const cloud = root.querySelector(".statistics-word-cloud");

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-word-range]");
    if (!button) return;
    mode = button.dataset.wordRange;
    for (const tab of root.querySelectorAll("[data-word-range]")) {
      const selected = tab === button;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    }
    render();
  });

  function update(state) {
    latestState = state;
    render();
  }

  function render() {
    if (!latestState) return;
    const isAll = mode === "all";
    const memos = isAll ? latestState.allMemos : latestState.periodMemos;
    periodLabel.textContent = isAll ? "18–24 / ALL" : latestState.periodLabel;
    const words = countWords(memos).slice(0, MAX_WORDS);
    if (!words.length) {
      cloud.innerHTML = `<span class="statistics-word-empty">NO WORD DATA</span>`;
      return;
    }

    const maxCount = Math.max(...words.map((word) => word.count), 1);
    const minCount = Math.min(...words.map((word) => word.count), maxCount);
    const countSpan = Math.max(Math.sqrt(maxCount) - Math.sqrt(minCount), 1);
    const elements = words.map((word) => {
      const normalized = (Math.sqrt(word.count) - Math.sqrt(minCount)) / countSpan;
      const size = MIN_FONT_SIZE + Math.round(Math.pow(normalized, 0.82) * (MAX_FONT_SIZE - MIN_FONT_SIZE));
      const element = document.createElement("span");
      element.dataset.sentiment = word.sentiment;
      element.dataset.count = String(word.count);
      element.style.fontSize = `${size}px`;
      const displayLabel = translateDataText(word.label, language);
      element.title = `${displayLabel}: ${word.count} / ${word.sentiment.toUpperCase()}`;
      element.textContent = displayLabel;
      return element;
    });
    cloud.replaceChildren(...elements);
    placeWordsFromCenter(cloud, elements);
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage;
    render();
  }

  return { update, setLanguage };
}

function countWords(memos) {
  const counts = new Map();
  const labels = new Map();
  const classifications = new Map();
  for (const memo of memos) {
    const text = `${memo.name || ""} ${memo.desc || ""}`.trim();
    for (const term of extractContentTerms(text)) {
      const label = normalizeTerm(term.label);
      const key = label.toLocaleLowerCase("ja");
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key)) labels.set(key, label);
      if (!classifications.has(key)) classifications.set(key, term);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ ...classifications.get(key), key, count, label: labels.get(key) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}

function normalizeTerm(value) {
  const label = String(value || "")
    .toLocaleLowerCase("ja")
    .replace(/[’']s$/u, "")
    .replace(/(?:ies)$/u, "y")
    .replace(/(?:sses|xes|ches|shes)$/u, (ending) => ending.slice(0, -2))
    .replace(/(?<=[a-z])s$/u, "");
  return TERM_ALIASES.find(([pattern]) => pattern.test(label))?.[1] || label;
}

function placeWordsFromCenter(container, elements) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;
  const centerX = width / 2;
  const centerY = height / 2;
  const placed = [];

  elements.forEach((element, index) => {
    let position = findWordPosition(element, index, centerX, centerY, width, height, placed);
    for (let attempt = 0; !position && attempt < 2; attempt += 1) {
      const currentSize = Number.parseFloat(element.style.fontSize);
      if (currentSize <= MIN_FONT_SIZE) break;
      element.style.fontSize = `${Math.max(MIN_FONT_SIZE, currentSize * 0.86)}px`;
      position = findWordPosition(element, index, centerX, centerY, width, height, placed);
    }
    if (!position) {
      element.hidden = true;
      return;
    }
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    placed.push(position.rect);
  });
}

function findWordPosition(element, index, centerX, centerY, width, height, placed) {
  const wordWidth = element.offsetWidth;
  const wordHeight = element.offsetHeight;
  const paddingX = wordHeight > 18 ? 3 : 1.5;
  const paddingY = wordHeight > 18 ? 2 : 1;
  const start = index === 0 ? 0 : 3;
  for (let step = start; step < 1800; step += 1) {
    const angle = step * 0.34;
    const radius = index === 0 ? 0 : 2.6 * Math.sqrt(step);
    const x = centerX + Math.cos(angle) * radius * 1.24 - wordWidth / 2;
    const y = centerY + Math.sin(angle) * radius * 0.72 - wordHeight / 2;
    const rect = {
      left: x - paddingX,
      top: y - paddingY,
      right: x + wordWidth + paddingX,
      bottom: y + wordHeight + paddingY,
    };
    const inside = rect.left >= 1 && rect.right <= width - 1 && rect.top >= 1 && rect.bottom <= height - 1;
    const clear = placed.every((other) => (
      rect.right < other.left || rect.left > other.right || rect.bottom < other.top || rect.top > other.bottom
    ));
    if (inside && clear) return { x, y, rect };
  }
  return null;
}
