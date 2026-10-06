const usage = (operation, place, description) => ({ operation, place, description });

const HINT_ORDER = [
  "タイムスペースマップ",
  "カードデック",
  "カード収納",
  "再生ボタン",
  "シークバー",
  "スピードバー",
  "タイムライン収納",
  "時刻・方角・速度",
  "写真可視化",
  "マップ表示切替",
  "統計モード",
  "コード説明・担当者",
  "絞り込み",
];

const BADGE_PLACEMENTS = {
  "カードデック": "left-center",
  "カード収納": "left-center",
  "再生ボタン": "top-center",
  "タイムライン収納": "top-center",
  "時刻・方角・速度": "top-center-high",
  "写真可視化": "left-stack",
  "マップ表示切替": "left-stack",
  "統計モード": "left-stack",
  "絞り込み": "right-lower",
};

const INDEX_GROUPS = {
  "写真可視化": { label: "ヘッダー", number: "09", start: true },
  "マップ表示切替": { label: "ヘッダー", number: "09" },
  "統計モード": { label: "ヘッダー", number: "09" },
  "コード説明・担当者": { label: "フッター", number: "12", start: true },
};

const BADGE_ANCHORS = {
  "写真可視化": ".toolbar-menu__panel--mode",
  "マップ表示切替": ".toolbar-menu__panel--mode",
  "統計モード": ".toolbar-menu__panel--mode",
};

const HINTS = [
  { target: "#legend-filter", title: "絞り込み", description: "条件に一致する観察データだけを地図・カード・タイムラインへ反映します。", usage: [usage("クリック", "フィルター上段", "AGE・GROUP・GENのコードを選択します。選択中の一つを再クリックすると同じ分類を全表示します。"), usage("ドラッグ", "COUNT", "左右のつまみで表示する人数範囲を指定します。"), usage("文字入力", "SEARCH", "コード・担当者・説明文などをキーワード検索します。"), usage("クリック", "ヘッダー右側「全表示」", "絞り込み条件と担当者表示を初期状態へ戻します。"), usage("クリック", "ヘッダー左側「− / ＋」", "フィルター内容を最小化・最大化します。"), usage("クリック", "右中央の三角形", "フィルター全体を画面外へ収納・再表示します。")], placement: "right" },
  { target: "#scene", title: "タイムスペースマップ", description: "地図上の位置と、時間＝高さで観察データを確認する中心画面です。", usage: [usage("ドラッグ", "マップ上", "視点を回転します。"), usage("右ドラッグ", "マップ上", "視点を平行移動します。"), usage("ホイール", "マップ上", "地図を拡大・縮小します。"), usage("カーソル / クリック", "データアイコン", "対象を強調し、選択するとカードと座標を表示します。"), usage("カーソル / クリック", "ルート線", "対象を強調し、選択すると担当者・件数・データ割合を表示します。")], placement: "center", highlight: false },
  { target: "#statistics-mode", title: "統計モード", description: "再生時刻と連動した集計・比較グラフへ切り替えます。", usage: [usage("クリック", "MODE → STATISTICS", "統計モードを開始します。もう一度押すと写真可視化モードへ戻ります。"), usage("再生", "タイムライン", "再生時刻に統計グラフを連動させます。"), usage("右クリック", "上部バー", "常時表示と自動収納を切り替えます。")], placement: "bottom", offsetX: -105 },
  { target: "#photo-entry", title: "写真可視化", description: "観察写真を中心に確認する専用ページへ移動します。", usage: [usage("クリック", "MODE → PHOTO VIEW", "写真可視化ページを開きます。"), usage("確認", "PHOTO VIEW右側の数字", "登録されている写真データ数を確認します。"), usage("右クリック", "上部バー", "常時表示と自動収納を切り替えます。")], placement: "bottom", offsetY: 58 },
  { target: ".view-toggle", title: "マップ表示切替", description: "立体的な3D表示と、上方から確認する2D表示を切り替えます。", usage: [usage("クリック", "MODE → MAP VIEW → 3D", "立体マップと時間＝高さの表示へ切り替えます。"), usage("クリック", "MODE → MAP VIEW → 2D", "上方から場所を確認しやすい表示へ切り替えます。"), usage("右クリック", "上部バー", "常時表示と自動収納を切り替えます。")], placement: "bottom", offsetY: 58, detailOffsetX: -26 },
  { target: "#memo-panel", title: "カードデック", description: "観察データを新しい順に並べ、写真データの内容を表示します。", usage: [usage("カーソル", "カード", "対象カードと近くのカードを拡大します。"), usage("クリック", "カード", "データを選択して該当位置へ移動します。再クリックで選択解除します。"), usage("↑ / ↓", "キーボード", "前後のカードへフォーカスを移動します。"), usage("Enter", "キーボード", "フォーカス中のカードを選択・解除します。"), usage("クリック", "マップ上のデータアイコン", "対応するカードを選択します。")], placement: "left", offsetY: 155 },
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

export function createHintMode({ button, linkedButtons = [], app, onActiveChange }) {
  if (!button || !app) return null;
  const triggerButtons = [...new Set([button, ...linkedButtons].filter(Boolean))];

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
    return { hint, highlight, connector, badge, callout };
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
    const hint = HINTS[index];
    detail.dataset.hintIndex = String(index);
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
      trigger.setAttribute("aria-label", active ? "ヒントを終了" : "ヒントを表示");
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
  return { isActive: () => active, setActive };
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
