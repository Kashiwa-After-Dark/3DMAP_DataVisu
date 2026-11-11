/**
 * ファイル概要: 画面全体の日本語・英語表示を切り替える。
 */
import { translateObservationText } from "./observation-translations.js?v=20261029-01";

const UI_ENGLISH = [
  ["観察対象の感情", "SUBJECT EMOTION"],
  ["観察者の感情", "OBSERVER FEELING"],
  ["感情の視点", "EMOTION PERSPECTIVE"],
  ["カードデックを表示", "SHOW CARD DECK"],
  ["タイムラインを展開", "EXPAND TIMELINE"],
  ["モード切替", "SWITCH MODE"],
  ["設定", "SETTINGS"],
  ["時間帯", "TIME PERIOD"],
  ["データ説明と絞り込み", "DATA GUIDE AND FILTER"],
  ["再生同期統計", "PLAYBACK STATISTICS"],
  ["タイムラインを最小化", "MINIMIZE TIMELINE"],
  ["カードデックを収納", "STORE CARD DECK"],
  ["担当者で絞り込み", "FILTER BY ASSIGNEE"],
  ["データコード説明", "DATA CODE GUIDE"],
  ["表示切り替え", "MAP VIEW"],
  ["表示モード", "VIEW MODE"],
  ["統計モードを終了", "EXIT STATISTICS MODE"],
  ["統計モード", "STATISTICS MODE"],
  ["ヒントを終了", "EXIT HINT MODE"],
  ["ヒントを表示", "SHOW HINTS"],
  ["タイムライン時刻", "TIMELINE TIME"],
  ["カメラの方角", "CAMERA DIRECTION"],
  ["再生速度", "PLAYBACK SPEED"],
  ["時間操作", "TIME CONTROL"],
  ["範囲開始時刻", "RANGE START"],
  ["表示時刻", "CURRENT TIME"],
  ["最小化", "MINIMIZE"],
  ["一時停止", "PAUSE"],
  ["リピート", "REPEAT"],
  ["再生", "PLAY"],
  ["全表示", "SHOW ALL"],
  ["担当者", "ASSIGNEES"],
  ["高校生", "HIGH SCHOOL"],
  ["中学生以下", "CHILD"],
  ["大学生", "UNIVERSITY"],
  ["若い社会人", "YOUNG WORKERS"],
  ["中高年", "ADULT"],
  ["高齢者", "SENIOR"],
  ["カップル", "COUPLE"],
  ["年齢・属性混合", "MIXED GROUP"],
  ["家族", "FAMILY"],
  ["男女混合", "MIXED GENDER"],
  ["性別混合", "MIXED GENDER"],
  ["男性", "MALE"],
  ["女性", "FEMALE"],
  ["不明", "UNKNOWN"],
  ["レイソル", "REYSOL"],
  ["テラス", "TERRACE"],
  ["会話", "CONVERSATION"],
  ["待機", "WAITING"],
  ["飲食", "FOOD / DRINK"],
  ["休憩", "REST"],
  ["遊び・表現", "PLAY / EXPRESSION"],
  ["遊び", "PLAY"],
  ["スマホ・電話", "PHONE"],
  ["仕事", "WORK"],
  ["移動", "MOVING"],
  ["肯定的", "POSITIVE"],
  ["中立・落ち着き", "NEUTRAL / CALM"],
  ["否定的・懸念", "NEGATIVE / CONCERN"],
  ["判定保留", "UNCLASSIFIED"],
  ["行動の色", "ACTIVITY COLORS"],
  ["観察者印象の色", "IMPRESSION COLORS"],
  ["年齢の色", "AGE COLORS"],
  ["物の記録", "OBJECT"],
  ["形", "SHAPE"],
  ["物", "OBJECT"],
  ["絞り込みとデータ色の切り替え", "FILTER AND DATA COLOR TABS"],
  ["データアイコンの色分け", "DATA ICON COLORS"],
  ["絞り込み", "FILTERS"],
  ["絞込", "FILTER"],
  ["感情", "MOOD"],
  ["行動", "ACT."],
  ["年齢", "AGE"],
  ["通過", "PASSING"],
  ["その他", "OTHER"],
  ["の行動構成", " ACTIVITY COMPOSITION"],
  ["年齢構成", " AGE COMPOSITION"],
  ["観察データ", "OBSERVATION DATA"],
  ["選択中のコードだけを表示。暗いコードを選ぶと表示へ追加。", "SHOWS SELECTED CODES. SELECT A DIM CODE TO ADD IT."],
  ["色を選択して絞り込み", "SELECT COLORS TO FILTER"],
  ["で絞り込み", " FILTER"],
  ["キーワード", "KEYWORD"],
  ["メモ検索", "SEARCH OBSERVATIONS"],
  ["全員", "ALL"],
  ["件", " ITEMS"],
];

const DATA_EN_TO_JA = [
  ["just hanging out", "たむろしている"], ["hanging out", "くつろいでいる"], ["outside the bar", "バーの外"],
  ["at game center", "ゲームセンターで"], ["game center", "ゲームセンター"], ["all happy", "楽しそう"],
  ["talking", "会話している"], ["chatting", "会話している"], ["standing", "立っている"],
  ["waiting", "待っている"], ["walking", "歩いている"], ["sitting", "座っている"],
  ["drinking", "飲んでいる"], ["eating", "食べている"], ["playing", "遊んでいる"],
  ["parking lot", "駐車場"], ["roadside", "道路脇"], ["station front", "駅前"],
  ["couple", "カップル"], ["family", "家族"], ["young", "若者"], ["adult", "社会人"],
];

export function createLanguageMode({ button, root, onChange }) {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  const savedLanguage = readSavedLanguage();
  let language = queryLanguage === "en" || (queryLanguage !== "ja" && savedLanguage === "en") ? "en" : "ja";
  let observer = null;
  const textOriginals = new Map();
  const attributeOriginals = new Map();
  const excluded = ".memo-panel, .activity-flow-legend, .station-flow-summary, .station-flow-legend, #language-toggle";

  button.addEventListener("click", () => {
    language = language === "ja" ? "en" : "ja";
    document.documentElement.lang = language;
    saveLanguage(language);
    syncButton();
    if (language === "en") startEnglishUi();
    else restoreUi();
    onChange?.(language);
  });
  document.documentElement.lang = language;
  syncButton();
  if (language === "en") startEnglishUi();
  onChange?.(language);

  function syncButton() {
    button.dataset.language = language;
    button.setAttribute("aria-label", language === "ja" ? "Switch to English" : "日本語に切り替え");
    button.setAttribute("aria-pressed", String(language === "en"));
  }

  function startEnglishUi() {
    translateTree(root);
    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) translateTree(node);
        } else if (mutation.type === "attributes") {
          translateAttributes(mutation.target);
        }
      }
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder"] });
  }

  function translateTree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node);
      return;
    }
    if (!(node instanceof Element) || node.matches(excluded) || node.closest(excluded)) return;
    translateAttributes(node);
    for (const element of node.querySelectorAll("*")) translateAttributes(element);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      translateTextNode(textNode);
      textNode = walker.nextNode();
    }
  }

  function translateTextNode(node) {
    if (node.parentElement?.closest(excluded)) return;
    const translated = replaceTerms(node.nodeValue, UI_ENGLISH);
    if (translated === node.nodeValue) return;
    if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue);
    node.nodeValue = translated;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || element.matches(excluded) || element.closest(excluded)) return;
    for (const name of ["aria-label", "title", "placeholder"]) {
      const value = element.getAttribute(name);
      if (!value) continue;
      const translated = replaceTerms(value, UI_ENGLISH);
      if (translated === value) continue;
      if (!attributeOriginals.has(element)) attributeOriginals.set(element, new Map());
      const originals = attributeOriginals.get(element);
      originals.set(name, value);
      element.setAttribute(name, translated);
    }
  }

  function restoreUi() {
    observer?.disconnect();
    observer = null;
    for (const [node, value] of textOriginals) {
      if (node.isConnected) node.nodeValue = value;
    }
    for (const [element, originals] of attributeOriginals) {
      if (!element.isConnected) continue;
      for (const [name, value] of originals) element.setAttribute(name, value);
    }
    textOriginals.clear();
    attributeOriginals.clear();
  }

  return { getLanguage: () => language };
}

function readSavedLanguage() {
  try {
    return window.localStorage.getItem("kashiwa-language");
  } catch {
    return null;
  }
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem("kashiwa-language", language);
  } catch {
    // Language switching still works when storage is unavailable.
  }
}

export function translateDataText(value, language) {
  const text = String(value || "");
  if (language !== "en") return replaceTerms(text, DATA_EN_TO_JA);
  return translateObservationText(text);
}

function replaceTerms(value, replacements) {
  return replacements.reduce(
    (text, [source, target]) => text.replaceAll(source, target),
    String(value || ""),
  );
}
