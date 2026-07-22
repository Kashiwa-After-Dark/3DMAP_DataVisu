export function createLegendFilter({ root, categories, sources, onChange, onSourcesReset }) {
  const ageKeys = ["H", "U", "Y", "A", "S"];
  const groupKeys = ["CP", "FM", "MX", "UN"];
  const allSourceIds = sources.map((source) => source.id);
  const state = {
    categories: new Set(Object.keys(categories)),
    genders: new Set(["M", "F", "X", "U"]),
    sources: new Set(allSourceIds),
    minCount: 0,
    keyword: "",
  };

  const countReadout = document.createElement("output");
  countReadout.className = "legend-filter__count";
  countReadout.textContent = "0";

  const content = document.createElement("div");
  content.className = "legend-filter__content";
  content.append(
    makeOptionGroup("AGE", ageKeys.map((value) => ({
      name: "category",
      value,
      label: value,
      title: getCategoryHelp(value),
      color: categories[value].color,
    })), "age"),
    makeOptionGroup("GROUP", groupKeys.map((value) => ({
      name: "category",
      value,
      label: value,
      title: getCategoryHelp(value),
      color: categories[value].color,
    })), "group"),
    makeOptionGroup("GEN", [
      { name: "gender", value: "M", label: "M", title: "男性", shape: "m" },
      { name: "gender", value: "F", label: "F", title: "女性", shape: "f" },
      { name: "gender", value: "X", label: "X", title: "混合", shape: "x" },
      { name: "gender", value: "U", label: "U", title: "不明", shape: "u" },
    ], "gen"),
    makeNumberControl(),
    makeSearchControl(),
    makeDescription(),
  );

  const handleChange = () => {
    syncStateFromUi(state, root);
    onChange?.();
  };
  const header = makeHeader({
    countReadout,
    onReset: () => {
      resetState(state, root, allSourceIds);
      onSourcesReset?.();
      onChange?.();
    },
    onToggle: (button) => {
      const collapsed = root.classList.toggle("is-collapsed");
      button.textContent = collapsed ? "+" : "−";
      button.title = collapsed ? "フィルターを拡大" : "フィルターを最小化";
      button.setAttribute("aria-expanded", String(!collapsed));
    },
  });

  root.replaceChildren(header, content);
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
    handleChange();
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches('input[type="checkbox"]')) return;
    handleChange();
  });

  return {
    matches: (memo) => memoMatchesState(memo, state),
    updateCount: (memos) => {
      countReadout.textContent = String(memos.filter((memo) => memoMatchesState(memo, state)).length);
    },
    setSources: (sourceIds) => {
      state.sources = new Set(sourceIds);
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
  toggle.setAttribute("aria-label", "フィルターの最小化と拡大");
  toggle.setAttribute("aria-expanded", "true");
  toggle.addEventListener("click", () => onToggle(toggle));

  header.append(toggle, title, count, reset);
  return header;
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
    group.append(label);
  }

  return group;
}

function makeNumberControl() {
  const label = document.createElement("label");
  label.className = "legend-filter__control";
  label.innerHTML = `
    <span>MIN</span>
    <input name="min-count" type="number" min="0" max="30" step="1" value="0" aria-label="最小件数" />
  `;
  return label;
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
  state.keyword = root.querySelector('[name="keyword"]')?.value.trim().toLowerCase() || "";
}

function resetState(state, root, allSourceIds) {
  for (const input of root.querySelectorAll("input")) {
    if (input.type === "checkbox") input.checked = true;
    if (input.name === "min-count") input.value = "0";
    if (input.name === "keyword") input.value = "";
  }
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
