/**
 * ファイル概要: 画面内の主要操作部品へヒント表示を重ねるモードを管理する。
 */
const usage = (operation, place, description) => ({ operation, place, description });

const HINT_ORDER = [
  "スペースタイムキューブ",
  "カードデック",
  "カード収納",
  "再生ボタン",
  "シークバー",
  "スピードバー",
  "タイムライン収納",
  "時刻・方角・速度",
  "マップ表示切替",
  "統計画面",
  "コード説明・担当者",
  "絞り込み",
];

const BADGE_PLACEMENTS = {
  "カードデック": "left-center",
  "カード収納": "left-center",
  "再生ボタン": "top-center",
  "タイムライン収納": "top-center",
  "時刻・方角・速度": "top-center-high",
  "マップ表示切替": "left-stack",
  "統計画面": "left-stack",
  "絞り込み": "right-lower",
};

const INDEX_GROUPS = {
  "マップ表示切替": { label: "ヘッダー", number: "09", start: true },
  "統計画面": { label: "ヘッダー", number: "09" },
  "コード説明・担当者": { label: "フッター", number: "12", start: true },
};

const BADGE_ANCHORS = {
  "マップ表示切替": ".toolbar-menu__panel--mode",
  "統計画面": ".toolbar-menu__panel--mode",
};

const HINTS = [
  { target: "#legend-filter", title: "絞り込み", description: "条件に一致する観察データだけを地図・カード・タイムラインへ反映します。", usage: [usage("クリック", "右タブ「年齢」", "年齢表示へ切り替え、年齢・グループ・性別・人数・検索の絞り込みを開きます。"), usage("クリック", "右タブ「感情／行動」", "対応する色の凡例と絞り込みを開きます。行動では滞在行動をルートの色、観察密度を濃さで表示します。"), usage("クリック", "感情／行動タブの色項目", "最初のクリックで一種類だけを表示し、追加クリックで複数選択します。最後の一種類を再クリックすると全表示へ戻ります。"), usage("再クリック", "現在開いている右タブ", "フィルターパネルを画面外へ閉じます。"), usage("クリック", "フィルター上段", "AGE・GROUP・GENのコードを選択します。選択中の一つを再クリックすると同じ分類を全表示します。"), usage("ドラッグ", "COUNT", "左右のつまみで表示する人数範囲を指定します。"), usage("文字入力", "SEARCH", "コード・時間帯・説明文などをキーワード検索します。"), usage("クリック", "ヘッダー右側「全表示」", "すべての絞り込み条件と時間帯表示を初期状態へ戻します。")], placement: "right" },
  { target: "#scene", title: "スペースタイムキューブ", description: "地図上の位置と、時間＝高さで観察データを確認する中心画面です。", usage: [usage("ドラッグ", "マップ上", "視点を回転します。"), usage("右ドラッグ", "マップ上", "視点を平行移動します。"), usage("ホイール", "マップ上", "地図を拡大・縮小します。"), usage("カーソル / クリック", "データアイコン", "対象を強調し、選択するとカードと座標を表示します。"), usage("カーソル / クリック", "ルート線", "対象を強調し、選択すると担当者・件数・データ割合を表示します。")], placement: "center", highlight: false },
  { target: "#statistics-link", title: "統計画面", description: "集計・比較グラフの専用画面を開きます。", usage: [usage("クリック", "MODE → STATISTICS", "独立した統計画面へ移動します。"), usage("戻る", "統計画面右上", "スペースタイムキューブへ戻ります。"), usage("右クリック", "上部バー", "常時表示と自動収納を切り替えます。")], placement: "bottom", offsetX: -105 },
  { target: ".view-toggle", title: "マップ表示切替", description: "視点と観察データの表現を切り替えます。", usage: [usage("クリック", "MODE → MAP VIEW → 3D", "立体マップと時間＝高さの表示へ切り替えます。"), usage("クリック", "MODE → MAP VIEW → 2D", "上方から場所を確認しやすい表示へ切り替えます。"), usage("クリック", "右タブ「年齢」", "年齢を色、性別・性別混合・カップル・不明を形で表します。"), usage("クリック", "右タブ「行動」", "滞在行動をルートの色、観察密度を濃さ、移動方向と人数を矢印で表します。鮮やかな断面の帯はGPS記録の再生位置です。"), usage("クリック", "右タブ「感情」", "18–20・20–22・22–24時の3箱に、座標ごとの感情を液体の塊として表示。記録が多い場所ほど大きく濃くなります。液体の揺れは演出です。"), usage("クリック", "感情タブ上部の2つの切替", "観察者の感情と観察対象の感情を切り替えます。文面からの仮分類で、対象の感情は様子からの推定。各視点の色の絞込を別々に保持します。"), usage("右クリック", "上部バー", "常時表示と自動収納を切り替えます。")], placement: "bottom", offsetY: 58, detailOffsetX: -26 },
  { target: "#memo-panel", title: "カードデック", description: "観察データを新しい順に並べ、記録内容を表示します。", usage: [usage("カーソル", "カード", "対象カードと近くのカードを拡大します。"), usage("クリック", "カード", "データを選択して該当位置へ移動します。再クリックで選択解除します。"), usage("↑ / ↓", "キーボード", "前後のカードへフォーカスを移動します。"), usage("Enter", "キーボード", "フォーカス中のカードを選択・解除します。"), usage("クリック", "マップ上のデータアイコン", "対応するカードを選択します。")], placement: "left", offsetY: 155 },
  { target: "#memo-panel-storage", title: "カード収納", description: "カードデックを画面外へ収納し、地図の表示範囲を広げます。", usage: [usage("クリック", "バー先端の三角形", "カードデックとバーを画面外へ収納します。"), usage("クリック", "収納後の三角形", "カードデックとバーを再表示します。"), usage("収納中", "カードデック", "マウス・キーボードによるカード操作を停止します。")], placement: "left", offsetY: -64 },
  { target: "#play-toggle", title: "再生ボタン", description: "タイムラインの再生・一時停止・リピートを操作します。", usage: [usage("クリック / Space", "再生・一時停止ボタン / キーボード", "再生と一時停止を切り替えます。"), usage("クリック / Space", "再生終了後のリピートボタン / キーボード", "時刻を先頭へ戻して再生します。"), usage("← / →", "キーボード", "18–20、20–22、22–24の区分単位で巻き戻し・スキップします。")], placement: "top", offsetX: 80 },
  { target: ".time-track-shell", title: "シークバー", description: "表示時刻の移動と時間範囲の選択を行います。", usage: [usage("ドラッグ", "時刻つまみ", "表示時刻を移動します。"), usage("ダブルクリック", "時刻つまみ", "二つ目のつまみを作り、時間範囲を選択します。"), usage("ダブルクリック", "つまみ / 青い範囲バー", "つまみを一つへ戻します。"), usage("ドラッグ", "青い範囲バー", "選択時間幅を保ったまま二つのつまみを動かします。"), usage("Shift＋クリック", "二つの時刻つまみ", "再生で動かすつまみを選択します。"), usage("クリック", "レイソル / テラス", "表示する場所を個別に選択・解除します。")], placement: "top", offsetX: 25 },
  { target: ".speed-control", title: "スピードバー", description: "タイムラインの再生速度を調整します。", usage: [usage("ドラッグ", "SPEEDスライダー", "0.25倍から2倍までの再生速度を変更します。"), usage("確認", "SPEED右側の数値", "現在の再生倍率を確認します。")], placement: "top", offsetX: -48, offsetY: -62 },
  { target: "#timeline-minimize", title: "タイムライン収納", description: "タイムラインを小さくしてマップの表示範囲を広げます。", usage: [usage("クリック", "タイムライン右端「−」", "タイムラインを最小化します。"), usage("クリック", "最小化後のボタン", "タイムラインを元の大きさへ戻します。")], placement: "left", offsetX: -8, offsetY: -62 },
  { target: ".timeline-instruments", title: "時刻・方角・速度", description: "現在時刻、カメラの方角、タイムラインの再生速度を表示します。", usage: [usage("確認", "アナログ時計", "タイムラインの現在時刻を確認します。"), usage("確認", "コンパス", "カメラ視点が向いている方角を確認します。"), usage("確認", "速度計", "現在のタイムライン再生速度を確認します。")], placement: "top", offsetY: -8 },
  { target: ".data-code-guide", title: "コード説明・担当者", description: "データコードの意味と、各ルートの担当者を確認します。", usage: [usage("クリック", "担当者ボタン", "選んだ担当者のデータを表示します。複数人を同時に選択できます。"), usage("再クリック", "選択中の担当者ボタン", "その担当者を表示対象から外します。"), usage("連続クリック", "「全員」ボタン", "初期担当者・全担当者・追加データを含む全担当者へ順番に切り替えます。"), usage("右クリック", "下部バー", "常時表示と自動収納を切り替えます。自動収納中は画面下端へカーソルを合わせると表示します。")], placement: "top", offsetX: 230 },
]
  .sort((left, right) => HINT_ORDER.indexOf(left.title) - HINT_ORDER.indexOf(right.title))
  .map((hint) => ({
    ...hint,
    badgePlacement: BADGE_PLACEMENTS[hint.title],
    badgeAnchor: BADGE_ANCHORS[hint.title],
    indexGroup: INDEX_GROUPS[hint.title],
  }));

const HINT_ENGLISH = {
  "スペースタイムキューブ": {
    title: "Time-space map",
    description: "The main view shows observation locations on the map and time as height.",
    usage: [
      usage("Drag", "Map", "Rotate the camera."),
      usage("Right-drag", "Map", "Pan the camera."),
      usage("Wheel", "Map", "Zoom the map in or out."),
      usage("Hover / click", "Data icon", "Highlight an observation; selecting it opens its card and coordinates."),
      usage("Hover / click", "Route line", "Highlight a route; selecting it shows its time period, count, and data composition."),
    ],
  },
  "カードデック": {
    title: "Card deck",
    description: "Lists observation records from newest to oldest and shows their details.",
    usage: [
      usage("Hover", "Card", "Enlarge the card and nearby cards."),
      usage("Click", "Card", "Select the observation and move to its location. Click again to clear it."),
      usage("Up / Down", "Keyboard", "Move focus to the previous or next card."),
      usage("Enter", "Keyboard", "Select or clear the focused card."),
      usage("Click", "Data icon on map", "Select the corresponding card."),
    ],
  },
  "カード収納": {
    title: "Card storage",
    description: "Stores the card deck off-screen to increase the visible map area.",
    usage: [
      usage("Click", "Triangle at the end of the line", "Store the card deck and its line off-screen."),
      usage("Click", "Triangle while stored", "Restore the card deck and its line."),
      usage("While stored", "Card deck", "Mouse and keyboard card controls are disabled."),
    ],
  },
  "再生ボタン": {
    title: "Playback button",
    description: "Controls timeline playback, pause, and replay.",
    usage: [
      usage("Click / Space", "Play-pause button / keyboard", "Toggle playback and pause."),
      usage("Click / Space", "Replay button / keyboard", "Return to the beginning and play again."),
      usage("Left / Right", "Keyboard", "Jump backward or forward by the 18–20, 20–22, and 22–24 periods."),
    ],
  },
  "シークバー": {
    title: "Seek bar",
    description: "Moves the displayed time and selects a time range.",
    usage: [
      usage("Drag", "Time handle", "Move the displayed time."),
      usage("Double-click", "Time handle", "Create a second handle and select a time range."),
      usage("Double-click", "Handle / blue range", "Return to a single handle."),
      usage("Drag", "Blue range", "Move both handles while preserving the selected duration."),
      usage("Shift-click", "Two time handles", "Choose which handle moves during playback."),
      usage("Click", "Time-period buttons", "Show or hide observations from each time period."),
    ],
  },
  "スピードバー": {
    title: "Speed bar",
    description: "Adjusts the timeline playback speed.",
    usage: [
      usage("Drag", "SPEED slider", "Change playback speed from 0.25× to 2×."),
      usage("Check", "Value beside SPEED", "Read the current playback speed."),
    ],
  },
  "タイムライン収納": {
    title: "Timeline storage",
    description: "Minimizes the timeline to increase the visible map area.",
    usage: [
      usage("Click", "Minus button at timeline right", "Minimize the timeline."),
      usage("Click", "Button while minimized", "Restore the timeline."),
    ],
  },
  "時刻・方角・速度": {
    title: "Time, direction, speed",
    description: "Shows the current time, camera direction, and timeline playback speed.",
    usage: [
      usage("Check", "Analog clock", "Read the current timeline time."),
      usage("Check", "Compass", "Read the camera viewing direction."),
      usage("Check", "Speedometer", "Read the current timeline playback speed."),
    ],
  },
  "マップ表示切替": {
    title: "Map display",
    description: "Switches the map view. Data colors are selected from the filter tabs.",
    usage: [
      usage("Click", "MODE → MAP VIEW → 3D", "Switch to the 3D map with time represented as height."),
      usage("Click", "MODE → MAP VIEW → 2D", "Switch to a top view that makes locations easier to compare."),
      usage("Click", "Right AGE tab", "Color icons by age and use shapes for male, female, mixed gender, couples, and unknown gender."),
      usage("Click", "Right ACT. tab", "Color icons by activities such as conversation, waiting, eating, and phone use."),
      usage("Click", "Right MOOD tab", "Color icons by positive, neutral, negative, or unclassified observer impressions."),
      usage("Right-click", "Top bar", "Toggle pinned display and automatic hiding."),
    ],
  },
  "統計画面": {
    title: "Statistics",
    description: "Opens the dedicated dashboard for aggregation and comparison charts.",
    usage: [
      usage("Click", "MODE → STATISTICS", "Open the separate statistics screen."),
      usage("Back", "Top-right of statistics screen", "Return to the time-space map."),
      usage("Right-click", "Top bar", "Toggle pinned display and automatic hiding."),
    ],
  },
  "コード説明・担当者": {
    title: "Code guide and time periods",
    description: "Explains data codes and selects the 18–20, 20–22, and 22–24 observation periods.",
    usage: [
      usage("Click", "Time-period button", "Show or hide observations from that period. Multiple periods can be selected."),
      usage("Right-click", "Bottom bar", "Toggle pinned display and automatic hiding. When hidden, move the cursor to the bottom edge to reveal it."),
    ],
  },
  "絞り込み": {
    title: "Filters and color tabs",
    description: "Applies matching observations to the map, cards, and timeline.",
    usage: [
      usage("Click", "Right FILTER tab", "Open age, group, gender, count, and search filters."),
      usage("Click", "Right AGE / MOOD / ACT. tabs", "Change data-icon colors and open the matching color and shape legend."),
      usage("Click", "A color in the MOOD / ACT. tabs", "The first click shows only that type. Additional clicks select multiple types; clicking the final selected type restores all."),
      usage("Click again", "Currently open right tab", "Close the filter panel off-screen."),
      usage("Click", "Filter codes", "Select AGE, GROUP, and GEN codes. Clicking the only selected code restores the full category."),
      usage("Drag", "COUNT", "Set the visible people-count range with the two handles."),
      usage("Type", "SEARCH", "Search codes, time periods, and descriptions by keyword."),
      usage("Click", "SHOW ALL", "Reset every filter and time-period visibility."),
    ],
  },
};

export function createHintMode({ button, linkedButtons = [], app, onActiveChange }) {
  if (!button || !app) return null;
  const triggerButtons = [...new Set([button, ...linkedButtons].filter(Boolean))];
  let language = "ja";

  const overlay = document.createElement("section");
  overlay.className = "hint-overlay";
  overlay.setAttribute("aria-label", "機能ヒント");
  overlay.hidden = true;

  const heading = document.createElement("header");
  heading.className = "hint-overlay__heading";
  const headingCopy = document.createElement("div");
  const headingTitle = document.createElement("b");
  headingTitle.textContent = "HINT MODE";
  const headingText = document.createElement("span");
  headingText.textContent = `${HINTS.length} FUNCTIONS · 機能名を選択`;
  headingCopy.append(headingTitle, headingText);
  const exitButton = makeDetailButton("×", "ヒントモードを終了");
  exitButton.className = "hint-overlay__exit";
  heading.append(headingCopy, exitButton);
  const hintIndex = document.createElement("nav");
  hintIndex.className = "hint-index";
  hintIndex.setAttribute("aria-label", "機能一覧");
  overlay.append(heading, hintIndex);

  const detail = document.createElement("article");
  detail.className = "hint-detail";
  detail.hidden = true;
  const detailHeader = document.createElement("header");
  const detailIdentity = document.createElement("div");
  const detailNumber = document.createElement("span");
  const detailTitle = document.createElement("b");
  detailIdentity.append(detailNumber, detailTitle);
  const detailControls = document.createElement("nav");
  detailControls.className = "hint-detail__controls";
  detailControls.setAttribute("aria-label", "ヒント詳細の移動");
  const previousButton = makeDetailButton("‹", "前の機能");
  const detailProgress = document.createElement("output");
  const nextButton = makeDetailButton("›", "次の機能");
  const closeButton = makeDetailButton("×", "機能一覧へ戻る");
  closeButton.classList.add("hint-detail__close");
  detailControls.append(previousButton, detailProgress, nextButton, closeButton);
  detailHeader.append(detailIdentity, detailControls);
  const detailDescription = document.createElement("p");
  const detailUsage = document.createElement("div");
  const detailUsageTitle = document.createElement("b");
  detailUsageTitle.textContent = "使用方法";
  const detailUsageList = document.createElement("ul");
  detailUsage.append(detailUsageTitle, detailUsageList);
  detail.append(detailHeader, detailDescription, detailUsage);
  overlay.append(detail);

  const entries = HINTS.map((hint, index) => {
    const highlight = document.createElement("i");
    highlight.className = "hint-highlight";
    const connector = document.createElement("i");
    connector.className = "hint-connector";
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "hint-target-badge";
    badge.textContent = String(index + 1).padStart(2, "0");
    badge.setAttribute("aria-label", `${hint.title}の説明を表示`);
    badge.title = hint.title;
    const callout = document.createElement("button");
    callout.type = "button";
    callout.className = "hint-callout";
    callout.setAttribute("aria-expanded", "false");
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const title = document.createElement("b");
    title.textContent = hint.title;
    if (hint.indexGroup) {
      callout.classList.add("is-group-child");
      title.textContent = `・${hint.title}`;
      if (hint.indexGroup.start) {
        callout.classList.add("is-section-start");
        const sectionHeading = document.createElement("span");
        sectionHeading.className = "hint-callout__section";
        const sectionNumber = document.createElement("em");
        sectionNumber.textContent = hint.indexGroup.number;
        const sectionTitle = document.createElement("strong");
        sectionTitle.textContent = hint.indexGroup.label;
        sectionHeading.append(sectionNumber, sectionTitle);
        callout.append(sectionHeading, title);
      } else {
        callout.append(title);
      }
    } else {
      callout.append(number, title);
    }
    callout.addEventListener("click", () => showDetail(index));
    callout.addEventListener("pointerenter", () => setEmphasis(index));
    callout.addEventListener("pointerleave", () => setEmphasis(selectedHintIndex));
    callout.addEventListener("focus", () => setEmphasis(index));
    callout.addEventListener("blur", () => setEmphasis(selectedHintIndex));
    badge.addEventListener("click", () => showDetail(index));
    badge.addEventListener("pointerenter", () => setEmphasis(index));
    badge.addEventListener("pointerleave", () => setEmphasis(selectedHintIndex));
    badge.addEventListener("focus", () => setEmphasis(index));
    badge.addEventListener("blur", () => setEmphasis(selectedHintIndex));
    overlay.append(highlight, connector, badge);
    hintIndex.append(callout);
    return { hint, highlight, connector, badge, callout, title, sectionTitle: callout.querySelector(".hint-callout__section strong") };
  });

  document.body.append(overlay);
  let active = false;
  let updateTimer = 0;
  let selectedHintIndex = null;
  const inertStates = new Map();

  const setEmphasis = (index) => {
    for (const [entryIndex, entry] of entries.entries()) {
      const emphasized = entryIndex === index;
      entry.highlight.classList.toggle("is-emphasized", emphasized);
      entry.connector.classList.toggle("is-emphasized", emphasized);
      entry.badge.classList.toggle("is-emphasized", emphasized);
      entry.callout.classList.toggle("is-emphasized", emphasized);
    }
  };

  const renderDetail = (index) => {
    const hint = getLocalizedHint(index, language);
    detailNumber.textContent = String(index + 1).padStart(2, "0");
    detailTitle.textContent = hint.title;
    detailProgress.textContent = `${String(index + 1).padStart(2, "0")} / ${String(HINTS.length).padStart(2, "0")}`;
    detailDescription.textContent = hint.description;
    detailUsage.hidden = !hint.usage?.length;
    detailUsageList.replaceChildren(...(hint.usage || []).map((instruction) => {
      const item = document.createElement("li");
      const operation = document.createElement("b");
      operation.textContent = instruction.operation;
      const firstSeparator = document.createElement("i");
      firstSeparator.textContent = ":";
      const place = document.createElement("strong");
      place.textContent = instruction.place;
      const secondSeparator = document.createElement("i");
      secondSeparator.textContent = ":";
      const description = document.createElement("span");
      description.textContent = instruction.description;
      item.append(operation, firstSeparator, place, secondSeparator, description);
      return item;
    }));
  };

  const showDetail = (index) => {
    const shouldClose = detail.dataset.hintIndex === String(index) && !detail.hidden;
    selectedHintIndex = shouldClose ? null : index;
    document.body.classList.toggle("is-hint-detail-open", !shouldClose);
    for (const [entryIndex, entry] of entries.entries()) {
      const selected = !shouldClose && entryIndex === index;
      entry.callout.classList.toggle("is-selected", selected);
      entry.callout.setAttribute("aria-expanded", String(selected));
      for (const element of [entry.highlight, entry.connector, entry.badge, entry.callout]) {
        element.classList.toggle("is-detail-hidden", !shouldClose && !selected);
      }
    }
    if (shouldClose) {
      detail.hidden = true;
      delete detail.dataset.hintIndex;
      setEmphasis(null);
      return;
    }
    detail.dataset.hintIndex = String(index);
    renderDetail(index);
    detail.hidden = false;
    setEmphasis(index);
    positionDetail(index);
  };

  const moveDetail = (direction) => {
    if (selectedHintIndex === null) return;
    const nextIndex = (selectedHintIndex + direction + HINTS.length) % HINTS.length;
    showDetail(nextIndex);
  };

  previousButton.addEventListener("click", () => moveDetail(-1));
  nextButton.addEventListener("click", () => moveDetail(1));
  closeButton.addEventListener("click", () => {
    if (selectedHintIndex !== null) showDetail(selectedHintIndex);
  });
  exitButton.addEventListener("click", () => setActive(false));
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay && selectedHintIndex !== null) showDetail(selectedHintIndex);
  });

  const updatePositions = () => {
    if (!active) return;
    for (const entry of entries) positionEntry(entry);
    if (selectedHintIndex !== null && !detail.hidden) positionDetail(selectedHintIndex);
  };

  const positionDetail = (index) => {
    if (!entries[index]) return;
    detail.style.left = "";
    detail.style.top = "";
    detail.style.maxHeight = "";
  };

  const setInactiveUi = (inactive) => {
    const topTaskbar = app.querySelector(".top-taskbar");
    const buttonOwner = button.closest(".toolbar-actions") || button;
    const targets = [
      ...[...app.children].filter((element) => element !== topTaskbar),
      ...[...topTaskbar.children].filter((element) => element !== buttonOwner),
    ];
    for (const element of targets) {
      if (inactive) {
        inertStates.set(element, element.hasAttribute("inert"));
        element.setAttribute("inert", "");
      } else if (!inertStates.get(element)) {
        element.removeAttribute("inert");
      }
    }
    if (!inactive) inertStates.clear();
  };

  const setActive = (nextActive) => {
    const wasActive = active;
    active = Boolean(nextActive);
    document.body.classList.toggle("is-hint-mode", active);
    overlay.hidden = !active;
    for (const trigger of triggerButtons) {
      trigger.classList.toggle("is-active", active);
      trigger.setAttribute("aria-pressed", String(active));
      trigger.setAttribute("aria-label", active
        ? (language === "en" ? "Exit hint mode" : "ヒントを終了")
        : (language === "en" ? "Show hints" : "ヒントを表示"));
      trigger.title = trigger.getAttribute("aria-label");
    }
    setInactiveUi(active);
    if (wasActive !== active) onActiveChange?.(active);
    if (!active) {
      document.body.classList.remove("is-hint-detail-open");
      selectedHintIndex = null;
      detail.hidden = true;
      delete detail.dataset.hintIndex;
      for (const entry of entries) {
        entry.callout.classList.remove("is-selected");
        entry.callout.setAttribute("aria-expanded", "false");
        for (const element of [entry.highlight, entry.connector, entry.badge, entry.callout]) {
          element.classList.remove("is-detail-hidden");
        }
      }
      setEmphasis(null);
    }
    window.clearTimeout(updateTimer);
    if (active) {
      requestAnimationFrame(updatePositions);
      updateTimer = window.setTimeout(updatePositions, 760);
    }
  };

  const syncLanguage = () => {
    const english = language === "en";
    overlay.setAttribute("aria-label", english ? "Feature hints" : "機能ヒント");
    headingText.textContent = `${HINTS.length} FUNCTIONS · ${english ? "SELECT A FEATURE" : "機能名を選択"}`;
    hintIndex.setAttribute("aria-label", english ? "Feature list" : "機能一覧");
    detailControls.setAttribute("aria-label", english ? "Hint detail navigation" : "ヒント詳細の移動");
    detailUsageTitle.textContent = english ? "HOW TO USE" : "使用方法";
    setButtonLabel(exitButton, english ? "Exit hint mode" : "ヒントモードを終了");
    setButtonLabel(previousButton, english ? "Previous feature" : "前の機能");
    setButtonLabel(nextButton, english ? "Next feature" : "次の機能");
    setButtonLabel(closeButton, english ? "Back to feature list" : "機能一覧へ戻る");
    for (const [index, entry] of entries.entries()) {
      const localized = getLocalizedHint(index, language);
      entry.title.textContent = entry.hint.indexGroup ? `・${localized.title}` : localized.title;
      if (entry.sectionTitle) entry.sectionTitle.textContent = english
        ? (entry.hint.indexGroup.label === "ヘッダー" ? "HEADER" : "FOOTER")
        : entry.hint.indexGroup.label;
      entry.badge.setAttribute("aria-label", english ? `Show details for ${localized.title}` : `${localized.title}の説明を表示`);
      entry.badge.title = localized.title;
    }
    for (const trigger of triggerButtons) {
      trigger.setAttribute("aria-label", active
        ? (english ? "Exit hint mode" : "ヒントを終了")
        : (english ? "Show hints" : "ヒントを表示"));
      trigger.title = trigger.getAttribute("aria-label");
    }
    if (selectedHintIndex !== null && !detail.hidden) renderDetail(selectedHintIndex);
    if (active) requestAnimationFrame(updatePositions);
  };

  for (const trigger of triggerButtons) {
    trigger.addEventListener("click", () => setActive(!active));
  }
  window.addEventListener("resize", updatePositions);
  app.addEventListener("transitionend", (event) => {
    if (active && event.propertyName === "transform") updatePositions();
  });
  window.addEventListener("keydown", (event) => {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (selectedHintIndex !== null) showDetail(selectedHintIndex);
      else setActive(false);
      return;
    }
    if (selectedHintIndex !== null && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveDetail(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key === "Tab" || event.target.closest?.("#hint-mode, .hint-callout")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  setActive(false);
  syncLanguage();
  return {
    isActive: () => active,
    setActive,
    setLanguage: (nextLanguage) => {
      language = nextLanguage === "en" ? "en" : "ja";
      syncLanguage();
    },
  };
}

function getLocalizedHint(index, language) {
  const hint = HINTS[index];
  if (language !== "en") return hint;
  return { ...hint, ...(HINT_ENGLISH[hint.title] || {}) };
}

function positionEntry({ hint, highlight, connector, badge, callout }) {
  const target = document.querySelector(hint.target);
  const targetRect = target?.getBoundingClientRect();
  const previewRect = document.querySelector("#app")?.getBoundingClientRect();
  const rect = intersectRects(targetRect, previewRect);
  const badgeAnchor = hint.badgeAnchor ? document.querySelector(hint.badgeAnchor) : target;
  const badgeAnchorRect = intersectRects(badgeAnchor?.getBoundingClientRect(), previewRect) || rect;
  const visible = rect && rect.width > 0 && rect.height > 0;
  highlight.hidden = !visible || hint.highlight === false;
  connector.hidden = !visible;
  badge.hidden = !visible;
  callout.hidden = !visible;
  if (!visible) return;

  if (hint.highlight !== false) {
    const padding = 4;
    highlight.style.left = `${rect.left - padding}px`;
    highlight.style.top = `${rect.top - padding}px`;
    highlight.style.width = `${rect.width + padding * 2}px`;
    highlight.style.height = `${rect.height + padding * 2}px`;
  }

  positionConnector({ hint, connector, badge, callout, targetRect: rect, badgeAnchorRect });
}

function intersectRects(targetRect, boundaryRect) {
  if (!targetRect || !boundaryRect) return null;
  const left = Math.max(targetRect.left, boundaryRect.left);
  const top = Math.max(targetRect.top, boundaryRect.top);
  const right = Math.min(targetRect.right, boundaryRect.right);
  const bottom = Math.min(targetRect.bottom, boundaryRect.bottom);
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function positionConnector({ hint, connector, badge, callout, targetRect, badgeAnchorRect }) {
  if (!targetRect || callout.hidden) return;

  const calloutRect = callout.getBoundingClientRect();
  let targetX = targetRect.right - Math.min(16, targetRect.width * 0.15);
  let targetY = targetRect.top + Math.min(24, targetRect.height * 0.5);
  if (hint.highlight === false) {
    targetX = targetRect.left + targetRect.width * 0.58;
    targetY = targetRect.top + targetRect.height * 0.42;
  }
  if (hint.badgePlacement === "top-center") {
    targetX = targetRect.left + targetRect.width / 2;
    targetY = targetRect.top - 15;
  } else if (hint.badgePlacement === "top-center-high") {
    targetX = targetRect.left + targetRect.width / 2;
    targetY = targetRect.top - 24;
  } else if (hint.badgePlacement === "left-center") {
    targetX = targetRect.left - 15;
    targetY = targetRect.top + targetRect.height / 2;
  } else if (hint.badgePlacement === "left-stack") {
    targetX = badgeAnchorRect.left - 15;
    targetY = targetRect.top + targetRect.height / 2;
  } else if (hint.badgePlacement === "right-lower") {
    targetX = targetRect.right + 24;
    targetY = targetRect.top + targetRect.height * 0.72;
  }

  const listX = calloutRect.left;
  const listY = calloutRect.top + calloutRect.height / 2;
  const distance = Math.hypot(listX - targetX, listY - targetY);
  const angle = Math.atan2(listY - targetY, listX - targetX) * 180 / Math.PI;
  connector.style.left = `${targetX}px`;
  connector.style.top = `${targetY}px`;
  connector.style.width = `${distance}px`;
  connector.style.transform = `rotate(${angle}deg)`;
  badge.style.left = `${clamp(targetX - 12, 0, window.innerWidth - 24)}px`;
  badge.style.top = `${clamp(targetY - 12, 62, window.innerHeight - 29)}px`;
}

function makeDetailButton(symbol, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = symbol;
  button.setAttribute("aria-label", label);
  button.title = label;
  return button;
}

function setButtonLabel(button, label) {
  button.setAttribute("aria-label", label);
  button.title = label;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
