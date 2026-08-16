export function createLegendFilter({ root, categories, sources, onChange, onSourcesReset }) {
  const ageKeys = ["H", "U", "Y", "A", "S"];
  const groupKeys = ["CP", "FM", "MX", "UN"];
  const allSourceIds = sources.map((source) => source.id);
  const state = {
    categories: new Set(Object.keys(categories)),
    genders: new Set(["M", "F", "X", "U"]),
    sources: new Set(allSourceIds),
    minCount: 0,
    maxCount: 30,
    keyword: "",
  };

  const countReadout = document.createElement("output");
  countReadout.className = "legend-filter__count";
  countReadout.textContent = "0";

  const content = document.createElement("div");
  content.className = "legend-filter__content";
  const codeSelector = document.createElement("div");
  codeSelector.className = "legend-filter__code-selector";
  codeSelector.append(
    makeOptionGroup("AGE", ageKeys.map((value) => ({
      name: "category",
      value,
      label: value,
      range: getAgeRange(value),
      title: getCategoryHelp(value),
      color: categories[value].color,
    })), "age"),
    makeOptionGroup("GROUP", groupKeys.map((value) => ({
      name: "category",
      value,
      label: value,
      title: getCategoryHelp(value),
      color: categories[value].color,
      shape: getCategoryShape(value),
    })), "group"),
    makeOptionGroup("GEN", [
      { name: "gender", value: "M", label: "M", title: "男性", shape: "m" },
      { name: "gender", value: "F", label: "F", title: "女性", shape: "f" },
      { name: "gender", value: "X", label: "X", title: "混合", shape: "x" },
      { name: "gender", value: "U", label: "U", title: "不明", shape: "u" },
    ], "gen"),
    makeCountRangeControl(),
    makeSearchControl(),
  );
  content.append(codeSelector, makeDescription());
  let viewLevel = 1;

  const handleChange = (changedInput) => {
    syncCountRangeUi(root, changedInput);
    syncStateFromUi(state, root);
    onChange?.();
  };
  const setViewLevel = (nextLevel, toggleButton = root.querySelector(".legend-filter__toggle")) => {
    viewLevel = nextLevel === 0 ? 0 : 1;
    root.classList.toggle("is-collapsed", viewLevel === 0);
    root.dataset.viewLevel = String(viewLevel);

    if (!toggleButton) return;
    const isExpanded = viewLevel > 0;
    toggleButton.textContent = isExpanded ? "−" : "+";
    toggleButton.title = isExpanded ? "フィルターを最小化" : "フィルターを最大化";
    toggleButton.setAttribute("aria-label", toggleButton.title);
    toggleButton.setAttribute("aria-expanded", String(isExpanded));
  };
  const header = makeHeader({
    countReadout,
    onReset: () => {
      resetState(state, root, allSourceIds);
      onSourcesReset?.();
      onChange?.();
    },
    onToggle: (button) => {
      setViewLevel(viewLevel === 0 ? 1 : 0, button);
    },
  });
  const storage = makeStorageButton(root);

  root.classList.remove("is-collapsed", "is-stored");
  root.dataset.viewLevel = String(viewLevel);
  root.replaceChildren(header, content, storage);
  syncCountRangeUi(root);
  root.addEventListener("click", (event) => {
    const option = event.target.closest(".legend-filter__option");
    if (!option || !root.contains(option)) return;
    event.preventDefault();
    const input = option.querySelector('input[type="checkbox"]');
    const peers = [...root.querySelectorAll(`input[name="${input.name}"]`)];
    const checked = peers.filter((peer) => peer.checked);

    if (checked.length === peers.length) {
      for (const peer of peers) peer.checked = peer === input;
    } else if (!input.checked) {
      input.checked = true;
    } else if (checked.length > 1) {
      input.checked = false;
    } else {
      for (const peer of peers) peer.checked = true;
    }
    handleChange();
  });
  root.addEventListener("keydown", (event) => {
    const option = event.target.closest(".legend-filter__option");
    if (!option || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    option.click();
  });
  root.addEventListener("input", (event) => {
    if (event.target.matches('input[type="checkbox"]')) return;
    handleChange(event.target);
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches('input[type="checkbox"]')) return;
    handleChange(event.target);
  });

  return {
    matches: (memo) => memoMatchesState(memo, state),
    updateCount: (memos) => {
      countReadout.textContent = String(memos.filter((memo) => memoMatchesState(memo, state)).length);
    },
    setSources: (sourceIds) => {
      state.sources = new Set(sourceIds);
    },
    setCollapsed: (collapsed) => {
      setViewLevel(collapsed ? 0 : 1);
    },
    state,
  };
}

function makeHeader({ countReadout, onReset, onToggle }) {
  const header = document.createElement("header");
  header.className = "legend-filter__header";

  const title = document.createElement("span");
  title.textContent = "FILTER / GUIDE";

  const count = document.createElement("strong");
  count.append(countReadout, " 件");

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "legend-filter__reset";
  reset.textContent = "全表示";
  reset.addEventListener("click", onReset);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "legend-filter__toggle";
  toggle.textContent = "−";
  toggle.title = "フィルターを最小化";
  toggle.setAttribute("aria-label", "フィルターを最小化");
  toggle.setAttribute("aria-expanded", "true");
  toggle.addEventListener("click", () => onToggle(toggle));

  header.append(toggle, title, count, reset);
  return header;
}

function makeStorageButton(root) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "legend-filter__storage";
  button.innerHTML = '<span aria-hidden="true"></span>';

  const setStored = (stored) => {
    root.classList.toggle("is-stored", stored);
    button.setAttribute("aria-expanded", String(!stored));
    button.setAttribute("aria-label", stored ? "フィルターを画面に戻す" : "フィルターを画面外へ収納");
    button.title = button.getAttribute("aria-label");
  };

  button.addEventListener("click", () => setStored(!root.classList.contains("is-stored")));
  setStored(false);
  return button;
}

function makeOptionGroup(title, options, variant = "") {
  const group = document.createElement("div");
  group.className = `legend-filter__group${variant ? ` legend-filter__group--${variant}` : ""}`;

  const heading = document.createElement("b");
  heading.textContent = title;
  group.append(heading);

  for (const option of options) {
    const label = document.createElement("label");
    label.className = "legend-filter__option";
    label.tabIndex = 0;
    if (option.color) label.style.setProperty("--legend-color", option.color);
    if (option.shape) label.dataset.shape = option.shape;
    if (option.title) label.title = option.title;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = option.name;
    input.value = option.value;
    input.checked = true;

    const text = document.createElement("span");
    text.textContent = option.label;
    label.append(input, text);
    if (variant === "age") {
      const range = document.createElement("small");
      range.textContent = option.range;
      label.append(range);
    }
    group.append(label);
  }

  return group;
}

function makeCountRangeControl() {
  const control = document.createElement("div");
  control.className = "legend-filter__control legend-filter__control--count-range";
  control.innerHTML = `
    <span>COUNT</span>
    <output data-count-range-readout>0–30</output>
    <div class="count-range">
      <i class="count-range__track" aria-hidden="true"></i>
      <input name="min-count" type="range" min="0" max="30" step="1" value="0" aria-label="最小人数" />
      <input name="max-count" type="range" min="0" max="30" step="1" value="30" aria-label="最大人数" />
    </div>
    <div class="count-range__ticks" aria-hidden="true">
      <span>0</span><span>10</span><span>20</span><span>30</span>
    </div>
  `;
  return control;
}

function makeSearchControl() {
  const label = document.createElement("label");
  label.className = "legend-filter__control legend-filter__control--search";
  label.innerHTML = `
    <span>SEARCH</span>
    <input name="keyword" type="search" placeholder="キーワード" aria-label="メモ検索" />
  `;
  return label;
}

function makeDescription() {
  const description = document.createElement("p");
  description.className = "legend-filter__description";
  description.textContent = "選択中のコードだけを表示。暗いコードを選ぶと表示へ追加。";
  return description;
}

function syncStateFromUi(state, root) {
  state.categories = getCheckedValues(root, "category");
  state.genders = getCheckedValues(root, "gender");
  state.minCount = Number(root.querySelector('[name="min-count"]')?.value || 0);
  state.maxCount = Number(root.querySelector('[name="max-count"]')?.value || 30);
  state.keyword = root.querySelector('[name="keyword"]')?.value.trim().toLowerCase() || "";
}

function syncCountRangeUi(root, changedInput) {
  const minInput = root.querySelector('[name="min-count"]');
  const maxInput = root.querySelector('[name="max-count"]');
  if (!minInput || !maxInput) return;

  let min = Number(minInput.value);
  let max = Number(maxInput.value);
  if (min > max) {
    if (changedInput?.name === "min-count") {
      max = min;
      maxInput.value = String(max);
    } else {
      min = max;
      minInput.value = String(min);
    }
  }

  const lowerBound = Number(minInput.min);
  const span = Number(maxInput.max) - lowerBound || 1;
  const control = minInput.closest(".legend-filter__control--count-range");
  control?.style.setProperty("--count-min", `${((min - lowerBound) / span) * 100}%`);
  control?.style.setProperty("--count-max", `${((max - lowerBound) / span) * 100}%`);
  const readout = control?.querySelector("[data-count-range-readout]");
  if (readout) readout.textContent = `${min}–${max}`;
}

function resetState(state, root, allSourceIds) {
  for (const input of root.querySelectorAll("input")) {
    if (input.type === "checkbox") input.checked = true;
    if (input.name === "min-count") input.value = "0";
    if (input.name === "max-count") input.value = "30";
    if (input.name === "keyword") input.value = "";
  }
  syncCountRangeUi(root);
  syncStateFromUi(state, root);
  state.sources = new Set(allSourceIds);
}

function getCheckedValues(root, name) {
  return new Set([...root.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value));
}

function memoMatchesState(memo, state) {
  if (!state.categories.has(memo.category)) return false;
  if (!state.genders.has(memo.gender)) return false;
  if (!state.sources.has(memo.sourceId)) return false;
  if ((memo.count || 0) < state.minCount) return false;
  if ((memo.count || 0) > state.maxCount) return false;
  if (state.keyword) {
    const searchableText = `${memo.name} ${memo.desc} ${memo.sourceLabel} ${memo.symbol}`.toLowerCase();
    if (!searchableText.includes(state.keyword)) return false;
  }
  return true;
}

function getCategoryHelp(value) {
  return {
    H: "高校生 [H]igh school",
    U: "大学生 [U]niversity",
    Y: "若い社会人 [Y]oung",
    A: "中高年 [A]dult",
    S: "高齢者 [S]enior",
    CP: "カップル",
    FM: "家族",
    MX: "年齢・属性混合グループ",
    UN: "不明",
  }[value] || value;
}

function getCategoryShape(value) {
  return {
    CP: "heart",
    UN: "question",
  }[value] || "";
}

function getAgeRange(value) {
  return {
    H: "15–18",
    U: "18–22",
    Y: "23–34",
    A: "35–64",
    S: "65+",
  }[value] || "";
}
