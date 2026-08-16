const UI_ENGLISH = [
  ["写真可視化ページへ", "OPEN PHOTO VISUALIZATION"],
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
  ["大学生", "UNIVERSITY"],
  ["若い社会人", "YOUNG WORKERS"],
  ["中高年", "ADULT"],
  ["高齢者", "SENIOR"],
  ["カップル", "COUPLE"],
  ["年齢・属性混合", "MIXED GROUP"],
  ["家族", "FAMILY"],
  ["男女混合", "MIXED GENDER"],
  ["男性", "MALE"],
  ["女性", "FEMALE"],
  ["不明", "UNKNOWN"],
  ["レイソル", "REYSOL"],
  ["テラス", "TERRACE"],
  ["会話", "CONVERSATION"],
  ["待機", "WAITING"],
  ["飲食", "FOOD / DRINK"],
  ["休憩", "REST"],
  ["遊び", "PLAY"],
  ["通過", "PASSING"],
  ["その他", "OTHER"],
  ["の行動構成", " ACTIVITY COMPOSITION"],
  ["年齢構成", " AGE COMPOSITION"],
  ["観察データ", "OBSERVATION DATA"],
  ["選択中のコードだけを表示。暗いコードを選ぶと表示へ追加。", "SHOWS SELECTED CODES. SELECT A DIM CODE TO ADD IT."],
  ["キーワード", "KEYWORD"],
  ["メモ検索", "SEARCH OBSERVATIONS"],
  ["全員", "ALL"],
  ["件", " ITEMS"],
];

const DATA_JA_TO_EN = [
  ["道路脇腰掛け", "sitting by the roadside"],
  ["若い社会人", "young workers"], ["社会人", "workers"], ["高校生", "high school students"],
  ["大学生", "university students"], ["男の人", "man"], ["女の人", "woman"], ["子ども", "children"],
  ["子供", "children"], ["会話", "conversation"], ["交流", "socializing"], ["立っていた", "standing"],
  ["立っている", "standing"], ["座っていた", "sitting"], ["座っている", "sitting"], ["待っていた", "waiting"],
  ["飲んでいた", "drinking"], ["食べていた", "eating"], ["買っていた", "shopping"], ["遊んでいた", "playing"],
  ["歩いていた", "walking"], ["帰る", "going home"], ["帰り", "going home"], ["休憩", "resting"],
  ["駅前", "station front"], ["駐車場", "parking lot"], ["道路脇", "roadside"], ["店舗前", "storefront"],
  ["自転車", "bicycle"], ["ゲームセンター", "game center"], ["たい焼き", "taiyaki"], ["多かった", "many"],
  ["楽しそう", "happy"], ["静か", "quiet"], ["事故", "accident"], ["危険", "danger"], ["混雑", "crowding"],
  ["麗澤大生", "Reitaku University students"], ["柏駅", "Kashiwa Station"], ["パレット柏", "Palette Kashiwa"],
  ["腰掛け", "sitting"], ["散歩", "walking"], ["キャッチ", "street solicitation"], ["傘", "umbrella"],
  ["道路", "road"], ["店舗", "store"], ["広場", "plaza"], ["飲み帰り", "returning after drinks"],
  ["飲み終わり", "after drinking"], ["帰る人", "people going home"], ["持ってた", "carrying"],
  ["捕まってる", "being approached"], ["見た", "seen"], ["男", "man"], ["女", "woman"], ["人", "people"],
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
  const excluded = ".memo-panel, .statistics-word-panel, #language-toggle";

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
  const prepared = text.replace(/(\d+)人/gu, "$1 people");
  return normalizeEnglishDataText(replaceTerms(prepared, DATA_JA_TO_EN));
}

function normalizeEnglishDataText(value) {
  return value
    .replace(/にて/gu, " ")
    .replace(/(?:していた|している|だった|でした|してる|して|いた|いる)/gu, " ")
    .replace(/[はがをにでとのへも]/gu, " ")
    .replace(/[　\s]+/gu, " ")
    .replace(/([A-Za-z])(\d)/gu, "$1 $2")
    .replace(/\s+([,.!?])/gu, "$1")
    .trim();
}

function replaceTerms(value, replacements) {
  return replacements.reduce(
    (text, [source, target]) => text.replaceAll(source, target),
    String(value || ""),
  );
}
