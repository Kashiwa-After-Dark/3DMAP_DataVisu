/**
 * ファイル概要: 統計モードのデータ取得、集計、グラフ、ワードクラウド、画面操作をまとめて制御する。
 */
// 共通データの読み込み
import { loadRouteDataset, getTimeRange } from "../backend/routeData.js?v=20261029-db1";
import { PUBLIC_SURVEY_DATE, ROUTE_SOURCES as CONFIGURED_SOURCES } from "../backend/surveyConfig.js?v=20261025-01";

// 日本語の内容語抽出
var FUNCTION_WORDS = /* @__PURE__ */ new Set([
  "が",
  "を",
  "に",
  "へ",
  "と",
  "で",
  "や",
  "の",
  "も",
  "は",
  "から",
  "まで",
  "より",
  "だけ",
  "ほど",
  "など",
  "って",
  "て",
  "で",
  "たり",
  "だり",
  "し",
  "ながら",
  "ので",
  "のに",
  "けど",
  "けれど",
  "そして",
  "しかし",
  "また",
  "または",
  "および",
  "でも",
  "だから",
  "ため",
  "よう",
  "です",
  "ます",
  "でした",
  "ました",
  "だ",
  "だった",
  "である",
  "ない",
  "たい",
  "れる",
  "られる",
  "せる",
  "させる",
  "そう",
  "らしい",
  "ようだ",
  "いる",
  "ある",
  "いた",
  "する",
  "した",
  "して",
  "これ",
  "それ",
  "あれ",
  "この",
  "その",
  "あの",
  "ここ",
  "そこ",
  "ところ",
  "もの",
  "こと",
  "さん"
]);
var ENGLISH_FUNCTION_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "or",
  "but",
  "for",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "under",
  "outside",
  "inside",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "just",
  "very",
  "more",
  "most",
  "was",
  "were",
  "are",
  "is",
  "been",
  "being",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could"
]);
var DATA_CODE = /^(?:[huyas]|cp|fm|mx|un|am|af|ym|yf|um|uf|ax|yx)[-_.]?\d*(?:[._-]\d+)*$/iu;
var I_ADJECTIVE = /(?:しい|ない|たい|っぽい|多い|多か(?:った|なく|れば)?|少ない|少なか(?:った|なく|れば)?|良い|良か(?:った|なく|れば)?|よい|よか(?:った|なく|れば)?|悪い|悪か(?:った|なく|れば)?|高い|高か(?:った|なく|れば)?|低い|低か(?:った|なく|れば)?|大きい|大きか(?:った|なく|れば)?|小さい|小さか(?:った|なく|れば)?|近い|近か(?:った|なく|れば)?|遠い|遠か(?:った|なく|れば)?)$/u;
var WORD_BOUNDARIES = /* @__PURE__ */ new Set([
  "が",
  "を",
  "に",
  "へ",
  "と",
  "で",
  "や",
  "の",
  "も",
  "は",
  "から",
  "まで",
  "より",
  "だけ",
  "ほど",
  "など",
  "ので",
  "のに",
  "けど",
  "けれど",
  "そして",
  "しかし",
  "また",
  "または",
  "および",
  "でも",
  "だから",
  "な"
]);
var VERB_ENDING = /(?:していた|している|してる|された|される|させる|られる|っていた|っている|ってる|ていた|ている|てる|った|って|いた|れる|せる|する|した|して|て|く|ぐ|す|つ|ぬ|ぶ|む|る|う)$/u;
var ENGLISH_VERB = /(?:ing|ed|ize|ise)$/iu;
var POSITIVE_WORDS = /(?:笑顔|笑い|幸せ|安心|活気|賑わい|にぎわい|交流|会話|団らん|遊び|祭り|快適|人気|好評|happy|enjoy|fun|smile)/iu;
var NEGATIVE_WORDS = /(?:事故|危険|不安|恐怖|喧嘩|けんか|混雑|渋滞|騒音|迷惑|ごみ|ゴミ|酔客|泥酔|孤独|疲労|泣き|犯罪|捕ま|壊れ|汚れ|danger|accident|noise|crowd|trash)/iu;
function extractContentWords(text) {
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("ja", { granularity: "word" }) : null;
  const tokens = segmenter ? joinJapaneseSegments(segmenter.segment(text)) : text.split(/\s+/u);
  return tokens.map((token) => token.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "").trim()).map(stripNominalAuxiliary).filter(isNounVerbOrAdjectivalNoun);
}
function extractContentTerms(text) {
  return extractContentWords(text).map((label) => {
    const partOfSpeech = isVerbExpression(label) ? "verb" : "noun";
    return {
      label,
      partOfSpeech,
      sentiment: partOfSpeech === "noun" ? getNounSentiment(label) : "action"
    };
  });
}
function isVerbExpression(word) {
  return VERB_ENDING.test(word) || ENGLISH_VERB.test(word);
}
function getNounSentiment(word) {
  if (POSITIVE_WORDS.test(word)) return "positive";
  if (NEGATIVE_WORDS.test(word)) return "negative";
  return "neutral";
}
function stripNominalAuxiliary(word) {
  return word.replace(/(?<=[\p{Script=Han}\p{Script=Katakana}ー])(?:だった|でした|です|だ)$/u, "");
}
function joinJapaneseSegments(segments) {
  const words = [];
  let current = "";
  const flush = () => {
    if (current) words.push(current);
    current = "";
  };
  for (const part of segments) {
    const token = part.segment.trim();
    if (!part.isWordLike || !token) {
      flush();
      continue;
    }
    if (WORD_BOUNDARIES.has(token)) {
      flush();
      continue;
    }
    const isLatinWord = /^[a-z]+$/iu.test(token);
    const currentIsLatin = /^[a-z]+$/iu.test(current);
    if (current && isLatinWord !== currentIsLatin) flush();
    if (current && isVerbExpression(current) && /^[\p{Script=Han}\p{Script=Katakana}ー]/u.test(token)) flush();
    current += token;
  }
  flush();
  return words;
}
function isNounVerbOrAdjectivalNoun(word) {
  if (!word || word.length < 2) return false;
  const normalized = word.toLocaleLowerCase("ja");
  if (FUNCTION_WORDS.has(normalized) || ENGLISH_FUNCTION_WORDS.has(normalized)) return false;
  if (/^\d+(?:\.\d+)?$/u.test(normalized) || DATA_CODE.test(normalized)) return false;
  if (I_ADJECTIVE.test(normalized)) return false;
  if (/^[a-z][a-z'-]+$/iu.test(normalized)) return normalized.length >= 3;
  if (/^[\p{Script=Hiragana}]+$/u.test(normalized)) return false;
  return /[\p{Script=Han}\p{Script=Katakana}ー]/u.test(normalized);
}

// ワードクラウド
import { classifyImpression } from "../backend/impressionClassifier.js?v=20261029-db1";
var MAX_WORDS = 64;
var MIN_FONT_SIZE = 6;
var MAX_FONT_SIZE = 34;
var TERM_ALIASES = [
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
  [/(?:ごみ|ゴミ|trash)/iu, "ごみ"]
];
function createStatisticsWordCloud({ root }) {
  let mode = "period";
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
      <span data-sentiment="unknown">UN</span>
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
    const memos2 = isAll ? latestState.allMemos : latestState.periodMemos;
    periodLabel.textContent = isAll ? "18–24 / ALL" : latestState.periodLabel;
    const words = countWords(memos2).slice(0, MAX_WORDS);
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
      const displayLabel = word.label;
      element.title = `${displayLabel}: ${word.count} / ${word.sentiment.toUpperCase()}`;
      element.textContent = displayLabel;
      return element;
    });
    cloud.replaceChildren(...elements);
    placeWordsFromCenter(cloud, elements);
  }
  return { update };
}
function countWords(memos2) {
  const counts = /* @__PURE__ */ new Map();
  const labels = /* @__PURE__ */ new Map();
  const classifications = /* @__PURE__ */ new Map();
  for (const memo of memos2) {
    const fields = memo.activity || memo.impression ? [
      { text: memo.activity, sentiment: "action" },
      { text: memo.impression, sentiment: classifyImpression(memo) }
    ] : [{ text: `${memo.name || ""} ${memo.desc || ""}`, sentiment: null }];
    for (const field of fields) for (const term of extractContentTerms(field.text || "")) {
      const label = normalizeTerm(term.label);
      const key = label.toLocaleLowerCase("ja");
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key)) labels.set(key, label);
      if (!classifications.has(key)) classifications.set(key, {
        ...term,
        sentiment: field.sentiment || term.sentiment
      });
    }
  }
  return [...counts.entries()].map(([key, count]) => ({ ...classifications.get(key), key, count, label: labels.get(key) })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}
function normalizeTerm(value) {
  const label = String(value || "").toLocaleLowerCase("ja").replace(/[’']s$/u, "").replace(/(?:ies)$/u, "y").replace(/(?:sses|xes|ches|shes)$/u, (ending) => ending.slice(0, -2)).replace(/(?<=[a-z])s$/u, "");
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
      bottom: y + wordHeight + paddingY
    };
    const inside = rect.left >= 1 && rect.right <= width - 1 && rect.top >= 1 && rect.bottom <= height - 1;
    const clear = placed.every((other) => rect.right < other.left || rect.left > other.right || rect.bottom < other.top || rect.top > other.bottom);
    if (inside && clear) return { x, y, rect };
  }
  return null;
}

// 行動別グラフ
import { ACTIVITY_TYPES, classifyActivity } from "../backend/activityClassifier.js?v=20261028-01";
var TIME_SEGMENTS = [
  { label: "18–20", start: 18, end: 20 },
  { label: "20–22", start: 20, end: 22 },
  { label: "22–24", start: 22, end: 24 }
];
function createStatisticsActivityChart({ root, onSelect }) {
  let selected = "all";
  root.innerHTML = `
    <header><b>ACTIVITY / TIME</b><span>LIVE COMPOSITION</span></header>
    <div class="statistics-activity-bars"></div>
    <div class="statistics-activity-filters" aria-label="行動別マップ表示">
      ${ACTIVITY_TYPES.map((activity) => `
        <button type="button" data-activity="${activity.id}" style="--activity-color:${activity.color}" aria-pressed="false">
          <i></i><span>${activity.code}</span>
        </button>
      `).join("")}
    </div>
  `;
  const bars = root.querySelector(".statistics-activity-bars");
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-activity]");
    if (!button) return;
    setSelection(selected === button.dataset.activity ? "all" : button.dataset.activity);
  });
  function update(memos2) {
    bars.innerHTML = TIME_SEGMENTS.map((segment) => {
      const segmentMemos = memos2.filter((memo) => {
        const date = new Date(memo.time);
        const hour = date.getHours() + date.getMinutes() / 60;
        return hour >= segment.start && hour < segment.end;
      });
      const counts = new Map(ACTIVITY_TYPES.map((activity) => [activity.id, 0]));
      for (const memo of segmentMemos) {
        const activity = classifyActivity(memo);
        counts.set(activity, counts.get(activity) + 1);
      }
      return `
        <div class="statistics-activity-row">
          <span>${segment.label}</span>
          <div class="statistics-activity-stack" aria-label="${segment.label}の行動構成">
            ${ACTIVITY_TYPES.map((activity) => {
        const count = counts.get(activity.id);
        const width = segmentMemos.length ? count / segmentMemos.length * 100 : 0;
        return `<i style="width:${width}%;--activity-color:${activity.color}" title="${activity.label}: ${count}"></i>`;
      }).join("")}
          </div>
          <output>${segmentMemos.length}</output>
        </div>
      `;
    }).join("");
  }
  function setSelection(nextSelection, { notify = true } = {}) {
    selected = nextSelection;
    for (const button of root.querySelectorAll("[data-activity]")) {
      const active = button.dataset.activity === selected;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    if (notify) onSelect?.(selected);
  }
  function reset() {
    if (selected === "all") return;
    setSelection("all");
  }
  return { update, reset };
}

// 統計ダッシュボード
import { AGE_STYLES } from "../backend/visualEncoding.js?v=20261028-02";
import { IMPRESSION_TYPES, classifyImpression as classifyImpression2 } from "../backend/impressionClassifier.js?v=20261029-db1";
var AGE_KEYS = ["C", "H", "U", "Y", "A", "S", "MX"];
var GROUP_KEYS = ["B", "G", "BG", "GG", "XG", "CP", "FM", "MX", "UN"];
var GENDER_KEYS = ["M", "F", "X", "U"];
var IMPRESSION_KEYS = ["positive", "neutral", "negative", "unknown"];
var TIME_SEGMENTS2 = [
  { label: "18–20", start: 18, end: 20 },
  { label: "20–22", start: 20, end: 22 },
  { label: "22–24", start: 22, end: 24 }
];
var LABELS = {
  age: { C: "中学生以下", H: "高校生", U: "大学生", Y: "若い社会人", A: "中高年", S: "高齢者", MX: "複数年齢", UN: "不明" },
  group: { B: "B", G: "G", BG: "BG", GG: "GG", XG: "XG", CP: "カップル", FM: "家族", MX: "混合", UN: "不明" },
  gender: { M: "男性", F: "女性", X: "男女混合", U: "不明" },
  impression: { positive: "肯定的", neutral: "中立", negative: "懸念", unknown: "判定保留" }
};
var COLORS = {
  ...Object.fromEntries(Object.entries(AGE_STYLES).map(([key, value]) => [key, value.color])),
  B: "#56b4e9",
  G: "#f0e442",
  BG: "#00d084",
  GG: "#e879f9",
  XG: "#ff9f1c",
  CP: "#ff6b9d",
  FM: "#00e5ff",
  M: "#56b4e9",
  F: "#ff9f1c",
  X: "#e879f9",
  ...Object.fromEntries(IMPRESSION_TYPES.map((item) => [item.id, item.color]))
};
function createStatisticsDashboard({ root, onActivityFilterChange }) {
  let active = false;
  let latestState = null;
  let renderTimer = null;
  let compositionMode = "group";
  root.innerHTML = `
    <section class="statistics-kpis" aria-label="主要統計">
      ${makeKpi("DATA", "statistics-data-count", "0")}
      ${makeKpi("PEOPLE", "statistics-people-count", "0")}
      ${makeKpi("PACE / 15MIN", "statistics-pace", "0")}
      ${makeKpi("UNKNOWN", "statistics-unknown", "0")}
    </section>
    <div class="statistics-side">
      <section class="statistics-activity-panel">
        ${makeHudFrame()}
        <div class="statistics-activity-content"></div>
      </section>
      <section class="statistics-lane-panel">
        ${makeHudFrame()}
        <header><b>TIME PERIODS</b><span>DATA / AGE</span></header>
        <div class="statistics-age-legend" aria-label="年齢コードの色">
          ${[...AGE_KEYS, "UN"].map((key) => `<span style="--stat-color:${COLORS[key]}"><i></i>${key}</span>`).join("")}
        </div>
        <div class="statistics-lanes"></div>
      </section>
      <section class="statistics-composition-panel">
        ${makeHudFrame()}
        <header>
          <div class="statistics-composition-heading"><b>COMPOSITION</b><span></span></div>
          <div class="statistics-composition-tabs" role="tablist" aria-label="構成項目">
            <button type="button" data-composition="age" role="tab" aria-selected="false">AGE</button>
            <button type="button" data-composition="group" class="is-active" role="tab" aria-selected="true">GROUP</button>
            <button type="button" data-composition="gender" role="tab">GEN</button>
            <button type="button" data-composition="impression" role="tab">印象</button>
          </div>
        </header>
        <div class="statistics-composition-stage">
          <div class="statistics-composition"></div>
          <div class="statistics-composition-history" aria-label="完了した時間帯の構成"></div>
        </div>
      </section>
      <section class="statistics-word-panel">
        ${makeHudFrame()}
        <div class="statistics-word-content"></div>
      </section>
    </div>
  `;
  const wordCloud = createStatisticsWordCloud({
    root: root.querySelector(".statistics-word-content")
  });
  const activityChart = createStatisticsActivityChart({
    root: root.querySelector(".statistics-activity-content"),
    onSelect: onActivityFilterChange
  });
  const elements = {
    data: root.querySelector("#statistics-data-count"),
    people: root.querySelector("#statistics-people-count"),
    pace: root.querySelector("#statistics-pace"),
    unknown: root.querySelector("#statistics-unknown"),
    lanes: root.querySelector(".statistics-lanes"),
    composition: root.querySelector(".statistics-composition"),
    compositionPeriod: root.querySelector(".statistics-composition-heading span"),
    compositionHistory: root.querySelector(".statistics-composition-history")
  };
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-composition]");
    if (!button) return;
    compositionMode = button.dataset.composition;
    for (const tab of root.querySelectorAll("[data-composition]")) {
      const selected = tab === button;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    }
    if (latestState) {
      renderComposition(latestState.activeMemos, latestState.periodIndex);
      renderCompositionHistory(latestState);
    }
  });
  function setActive(nextActive) {
    active = nextActive;
    root.classList.toggle("is-active", active);
    if (!active) activityChart.reset();
    if (active && latestState) render(latestState);
  }
  function update(state) {
    const periodIndex = getPeriodIndex(state);
    const periodStartTime = getPeriodStartTime(state, periodIndex);
    latestState = {
      ...state,
      periodIndex,
      periodStartTime,
      cumulativeMemos: state.memos.filter(
        (memo) => memo.time >= state.rangeStartTime && memo.time <= state.currentTime
      ),
      activeMemos: state.memos.filter(
        (memo) => memo.time >= periodStartTime && memo.time <= state.currentTime
      )
    };
    if (!active || renderTimer) return;
    renderTimer = window.setTimeout(() => {
      renderTimer = null;
      if (latestState) render(latestState);
    }, 120);
  }
  function render(state) {
    const { activeMemos } = state;
    const people = sumPeople(activeMemos);
    const durationMinutes = Math.max((state.currentTime - state.periodStartTime) / 6e4, 1);
    const unknown = activeMemos.filter(
      (memo) => memo.isPeople && ((memo.ageCategory || memo.category) === "UN" || memo.gender === "U")
    ).length;
    elements.data.textContent = String(activeMemos.length);
    elements.people.textContent = String(people);
    elements.pace.textContent = formatNumber(activeMemos.length / durationMinutes * 15);
    elements.unknown.textContent = String(unknown);
    renderLanes(state.cumulativeMemos);
    renderComposition(activeMemos, state.periodIndex);
    renderCompositionHistory(state);
    activityChart.update(state.cumulativeMemos);
    wordCloud.update({
      periodMemos: state.cumulativeMemos,
      allMemos: state.memos.filter(
        (memo) => memo.time >= state.rangeStartTime && memo.time <= state.timelineEnd
      ),
      periodLabel: `18–${TIME_SEGMENTS2[state.periodIndex]?.end || 20} / LIVE`
    });
  }
  function renderLanes(memos2) {
    const rows = [{ id: "route", label: "柏駅周辺ルート", laneMemos: memos2 }].map((row) => {
      const { laneMemos } = row;
      return {
        id: row.id,
        label: row.label,
        data: laneMemos.length,
        segments: TIME_SEGMENTS2.map((segment) => {
          const segmentMemos = laneMemos.filter((memo) => {
            const date = new Date(memo.time + 9 * 36e5);
            const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
            return hour >= segment.start && hour < segment.end;
          });
          const ageCounts = new Map([...AGE_KEYS, "UN"].map((key) => [key, 0]));
          for (const memo of segmentMemos) {
            if (!memo.isPeople) continue;
            const age = memo.ageCategory || memo.category;
            const key = AGE_KEYS.includes(age) ? age : "UN";
            ageCounts.set(key, ageCounts.get(key) + 1);
          }
          return { ...segment, data: segmentMemos.length, people: segmentMemos.filter((memo) => memo.isPeople).length, ageCounts };
        })
      };
    });
    elements.lanes.innerHTML = rows.map((row) => `
      <div class="statistics-lane">
        <div class="statistics-lane__header"><b>${row.label}</b><output>${row.data}<small> DATA</small></output></div>
        <div class="statistics-lane-time-rows">
          ${row.segments.map((segment) => `
            <div class="statistics-lane-time-row">
              <span>${segment.label}</span>
              <div class="statistics-lane-stack" aria-label="${row.label} ${segment.label}の年齢構成">
                ${[...AGE_KEYS, "UN"].map((key) => {
      const count = segment.ageCounts.get(key);
      const ratio = segment.people ? count / segment.people : 0;
      return `<i style="width:${ratio * 100}%;--stat-color:${COLORS[key]}" title="${key}: ${count}"></i>`;
    }).join("")}
              </div>
              <output>${segment.data}</output>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
  }
  function renderComposition(memos2, periodIndex) {
    const { entries, total } = getCompositionEntries(memos2, compositionMode);
    elements.compositionPeriod.textContent = TIME_SEGMENTS2[periodIndex]?.label || TIME_SEGMENTS2[0].label;
    elements.composition.innerHTML = buildDonutSvg(entries, total, compositionMode);
  }
  function renderCompositionHistory(state) {
    const periodDuration = 2 * 60 * 60 * 1e3;
    elements.compositionHistory.innerHTML = TIME_SEGMENTS2.slice(0, state.periodIndex).map((segment, index) => {
      const start = state.timelineStart + index * periodDuration;
      const end = start + periodDuration;
      const periodMemos = state.memos.filter(
        (memo) => memo.time >= Math.max(start, state.rangeStartTime) && memo.time < end
      );
      const { entries, total } = getCompositionEntries(periodMemos, compositionMode);
      return `
          <div class="statistics-composition-mini" aria-label="${segment.label} ${compositionMode}構成 ${total}件">
            <span>${segment.label}</span>
            ${buildMiniDonutSvg(entries, total)}
          </div>
        `;
    }).join("");
  }
  function getCompositionEntries(memos2, mode) {
    const config = {
      age: { keys: [...AGE_KEYS, "UN"], getValue: (memo) => memo.ageCategory || memo.category },
      group: { keys: GROUP_KEYS, getValue: (memo) => memo.groupCategory || memo.category },
      gender: { keys: GENDER_KEYS, getValue: (memo) => memo.gender },
      impression: { keys: IMPRESSION_KEYS, getValue: classifyImpression2 }
    }[mode];
    const counts = new Map(config.keys.map((key) => [key, 0]));
    for (const memo of memos2) {
      if (!memo.isPeople) continue;
      const rawValue = config.getValue(memo);
      const value = config.keys.includes(rawValue) ? rawValue : mode === "gender" ? "U" : "UN";
      if (counts.has(value)) counts.set(value, counts.get(value) + 1);
    }
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const entries = config.keys.map((key) => {
      const count = counts.get(key);
      return { key, count, ratio: total ? count / total : 0, color: COLORS[key] || "#94a3b8" };
    });
    return { entries, total };
  }
  return { setActive, update };
}
function getPeriodIndex(state) {
  const periodDuration = 2 * 60 * 60 * 1e3;
  const elapsed = Math.max(0, state.currentTime - state.timelineStart);
  return Math.min(TIME_SEGMENTS2.length - 1, Math.floor(elapsed / periodDuration));
}
function getPeriodStartTime(state, periodIndex = getPeriodIndex(state)) {
  const periodDuration = 2 * 60 * 60 * 1e3;
  const segmentStart = state.timelineStart + periodIndex * periodDuration;
  return Math.max(state.rangeStartTime, segmentStart);
}
function makeKpi(label, id, value) {
  return `<div class="statistics-kpi">${makeHudFrame()}<b>${label}</b><output id="${id}">${value}</output></div>`;
}
function makeHudFrame() {
  return `<i class="statistics-hud-frame" aria-hidden="true"><i></i></i>`;
}
function buildDonutSvg(entries, total, mode) {
  const width = 330;
  const height = 180;
  const centerX = 215;
  const centerY = 86;
  const radius = 54;
  const circumference = Math.PI * 2 * radius;
  let cursor = 0;
  const plotted = entries.map((entry) => {
    const start = cursor;
    cursor += entry.ratio;
    const angle = -Math.PI / 2 + (start + entry.ratio / 2) * Math.PI * 2;
    return { ...entry, start, angle };
  });
  const visibleEntries = plotted.filter((entry) => entry.count > 0);
  const callouts = arrangeDonutCallouts(visibleEntries, centerX, centerY, radius);
  const rings = total ? plotted.map((entry) => {
    const length = Math.max(entry.ratio * circumference - 1.5, 0);
    return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${entry.color}" stroke-width="6" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-entry.start * circumference}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
  }).join("") : "";
  const labels = callouts.map((entry) => {
    const outerX = centerX + Math.cos(entry.angle) * (radius + 4);
    const outerY = centerY + Math.sin(entry.angle) * (radius + 4);
    const elbowX = entry.side === "right" ? 275 : 129;
    const labelX = entry.side === "right" ? 281 : 123;
    const anchor = entry.side === "right" ? "start" : "end";
    const name = LABELS[mode]?.[entry.key] || entry.key;
    return `
      <path d="M ${outerX.toFixed(1)} ${outerY.toFixed(1)} L ${elbowX} ${entry.y} L ${labelX} ${entry.y}" fill="none" stroke="${entry.color}" stroke-width="1"/>
      <circle cx="${outerX.toFixed(1)}" cy="${outerY.toFixed(1)}" r="2" fill="${entry.color}"/>
      <text x="${labelX}" y="${entry.y - 3}" text-anchor="${anchor}" class="statistics-donut-label">${entry.key} ${name}</text>
      <text x="${labelX}" y="${entry.y + 8}" text-anchor="${anchor}" class="statistics-donut-value">${entry.count} DATA · ${Math.round(entry.ratio * 100)}%</text>
    `;
  }).join("");
  return `
    <svg class="statistics-donut-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${mode}構成 ${total}件">
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" class="statistics-donut-track"/>
      ${rings}
      ${labels}
      <text x="${centerX}" y="${centerY - 1}" text-anchor="middle" class="statistics-donut-total">${total}</text>
      <text x="${centerX}" y="${centerY + 13}" text-anchor="middle" class="statistics-donut-caption">DATA</text>
    </svg>
  `;
}
function buildMiniDonutSvg(entries, total) {
  const width = 112;
  const height = 86;
  const centerX = 56;
  const centerY = 45;
  const radius = 28;
  const circumference = Math.PI * 2 * radius;
  let cursor = 0;
  const rings = total ? entries.map((entry) => {
    const start = cursor;
    cursor += entry.ratio;
    const length = Math.max(entry.ratio * circumference - 1, 0);
    return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${entry.color}" stroke-width="4" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-start * circumference}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
  }).join("") : "";
  return `
    <svg class="statistics-mini-donut" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" class="statistics-donut-track statistics-mini-donut__track"/>
      ${rings}
      <text x="${centerX}" y="${centerY + 3}" text-anchor="middle" class="statistics-mini-donut__total">${total}</text>
    </svg>
  `;
}
function arrangeDonutCallouts(entries, centerX, centerY, radius) {
  const sides = { left: [], right: [] };
  for (const entry of entries) {
    const side = Math.cos(entry.angle) >= 0 ? "right" : "left";
    sides[side].push({
      ...entry,
      side,
      targetY: centerY + Math.sin(entry.angle) * (radius + 18)
    });
  }
  return [...spreadCallouts(sides.left), ...spreadCallouts(sides.right)];
}
function spreadCallouts(entries) {
  const minY = 20;
  const maxY = 158;
  const gap = 25;
  const arranged = [...entries].sort((a, b) => a.targetY - b.targetY);
  for (let index = 0; index < arranged.length; index += 1) {
    const previousY = index ? arranged[index - 1].y : minY - gap;
    arranged[index].y = Math.max(minY, arranged[index].targetY, previousY + gap);
  }
  if (arranged.length && arranged.at(-1).y > maxY) {
    const shift = arranged.at(-1).y - maxY;
    for (const entry of arranged) entry.y -= shift;
  }
  return arranged;
}
function sumPeople(memos2) {
  return memos2.reduce(
    (total, memo) => total + (memo.isPeople ? memo.count || 0 : 0),
    0
  );
}
function formatNumber(value) {
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

// 時間帯フィルター
var PERIODS = [
  { id: "18-20", label: "18–20", start: 18, end: 20 },
  { id: "20-22", label: "20–22", start: 20, end: 22 },
  { id: "22-24", label: "22–24", start: 22, end: 24 }
];
function createStatisticsPeriodFilter({ root, allButton, onChange }) {
  const selected = new Set(PERIODS.map((period) => period.id));
  const buttons = PERIODS.map((period) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.periodId = period.id;
    button.textContent = period.label;
    button.addEventListener("click", () => toggle(period.id));
    return button;
  });
  root.replaceChildren(...buttons);
  allButton.addEventListener("click", () => selectAll());
  function toggle(periodId) {
    if (selected.size === PERIODS.length) {
      selected.clear();
      selected.add(periodId);
    } else if (selected.size === 1 && selected.has(periodId)) {
      PERIODS.forEach((period) => selected.add(period.id));
    } else if (selected.has(periodId)) {
      selected.delete(periodId);
    } else {
      selected.add(periodId);
    }
    if (!selected.size) selected.add(periodId);
    sync();
    onChange?.(getSelection());
  }
  function selectAll() {
    selected.clear();
    PERIODS.forEach((period) => selected.add(period.id));
    sync();
    onChange?.(getSelection());
  }
  function sync() {
    for (const button of buttons) {
      const active = selected.has(button.dataset.periodId);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    allButton.classList.toggle("is-active", selected.size === PERIODS.length);
  }
  function matches(memo) {
    const date = new Date(memo.time + 9 * 60 * 60 * 1e3);
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
    const period = PERIODS.find((item) => hour >= item.start && hour < item.end);
    return period ? selected.has(period.id) : false;
  }
  function getSelection() {
    return {
      periodIds: [...selected],
      segmentIndexes: PERIODS.flatMap((period, index) => selected.has(period.id) ? [index] : [])
    };
  }
  sync();
  return { getSelection, matches };
}

// 画面の起動とタイムライン
var ROUTE_SOURCES = CONFIGURED_SOURCES;
var dashboardRoot = document.querySelector("#statistics-dashboard");
var periodFilterList = document.querySelector("#period-filter-list");
var selectAllPeriods = document.querySelector("#select-all-periods");
var playButton = document.querySelector("#statistics-play");
var timeSlider = document.querySelector("#statistics-time");
var timeReadout = document.querySelector("#statistics-time-readout");
var status = document.querySelector("#statistics-status");
var surveyDate = document.querySelector("#survey-date");
var surveyReference = /* @__PURE__ */ new Date(`${PUBLIC_SURVEY_DATE}T18:00:00+09:00`);
var { start: timelineStart, end: timelineEnd } = getTimeRange(surveyReference);
var dashboard = createStatisticsDashboard({
  root: dashboardRoot
});
var periodFilter = createStatisticsPeriodFilter({
  root: periodFilterList,
  allButton: selectAllPeriods,
  onChange: ({ segmentIndexes }) => {
    const latestSegment = Math.max(...segmentIndexes);
    timeSlider.value = String((latestSegment + 1) * 2 * 60 * 60 - 1);
    renderAt(Number(timeSlider.value));
  }
});
var memos = [];
var isPlaying = false;
var lastFrame = 0;
var animationFrame = 0;
surveyDate.textContent = `SURVEY · ${PUBLIC_SURVEY_DATE.replaceAll("-", "/")}`;
dashboard.setActive(true);
loadData();
playButton.addEventListener("click", togglePlayback);
timeSlider.addEventListener("input", () => {
  stopPlayback();
  renderAt(Number(timeSlider.value));
});
async function loadData() {
  const dataset = await loadRouteDataset(ROUTE_SOURCES);
  dataset.errors.forEach((error) => console.error(error));
  if (dataset.unmatchedSourceFilenames.length) {
    console.warn("Unconfigured API sources:", dataset.unmatchedSourceFilenames);
  }
  memos = dataset.memos;
  ROUTE_SOURCES = dataset.sources;
  status.hidden = false;
  if (dataset.source === "api-error") {
    status.textContent = "公開APIへ接続できませんでした";
  } else if (!memos.length) {
    status.textContent = dataset.unmatchedSourceFilenames.length ? "10月23日のデータ設定が未登録です" : "10月23日の公開データはまだ0件です";
  } else {
    const located = memos.filter((memo) => memo.hasLocation).length;
    const objects = memos.filter((memo) => !memo.isPeople).length;
    status.textContent = `観察${memos.length}件（人${memos.length - objects}・物${objects}） / 地図上${located}件・位置不明${memos.length - located}件${dataset.tracks.length ? "" : " / 移動軌跡は未登録"}`;
    timeSlider.value = timeSlider.max;
  }
  renderAt(Number(timeSlider.value));
}
function renderAt(seconds) {
  const currentTime = timelineStart + seconds * 1e3;
  const filteredMemos = memos.filter((memo) => periodFilter.matches(memo));
  timeReadout.textContent = formatTime(currentTime);
  dashboard.update({
    memos: filteredMemos,
    currentTime,
    rangeStartTime: timelineStart,
    timelineStart,
    timelineEnd
  });
}
function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }
  if (Number(timeSlider.value) >= Number(timeSlider.max)) timeSlider.value = "0";
  isPlaying = true;
  playButton.classList.add("is-playing");
  playButton.setAttribute("aria-pressed", "true");
  playButton.setAttribute("aria-label", "一時停止");
  lastFrame = performance.now();
  animationFrame = requestAnimationFrame(stepPlayback);
}
function stepPlayback(now) {
  if (!isPlaying) return;
  const elapsed = (now - lastFrame) * 120;
  lastFrame = now;
  const next = Math.min(Number(timeSlider.max), Number(timeSlider.value) + elapsed / 1e3);
  timeSlider.value = String(next);
  renderAt(next);
  if (next >= Number(timeSlider.max)) stopPlayback();
  else animationFrame = requestAnimationFrame(stepPlayback);
}
function stopPlayback() {
  isPlaying = false;
  cancelAnimationFrame(animationFrame);
  playButton.classList.remove("is-playing");
  playButton.setAttribute("aria-pressed", "false");
  playButton.setAttribute("aria-label", "再生");
}
function formatTime(timestamp) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo"
  }).format(timestamp);
}
