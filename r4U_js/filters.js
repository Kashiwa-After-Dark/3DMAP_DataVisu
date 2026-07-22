export function createLegendFilter({ root, categories, sources, onChange }) {
  const ageKeys = ["H", "U", "Y", "A", "S"];
  const groupKeys = ["CP", "FM", "MX", "UN"];
  const state = {
    categories: new Set(Object.keys(categories)),
    genders: new Set(["M", "F", "X", "U"]),
    sources: new Set(sources.map((source) => source.id)),
    minCount: 0,
    keyword: "",
  };

  const countReadout = document.createElement("output");
  countReadout.className = "legend-filter__count";
  countReadout.textContent = "0";

  const panels = [
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
    ]),
    makeRoleControl(sources),
    makeNumberControl(),
    makeSearchControl(),
  ];

  root.replaceChildren(
    makeHeader(countReadout, () => {
      resetState(state, root);
      onChange?.();
    }),
    makeFilterSwitcher(panels),
  );

  showPanel(root, "AGE");

  const handleChange = () => {
    syncStateFromUi(state, root);
    onChange?.();
  };
  root.addEventListener("input", handleChange);
  root.addEventListener("change", handleChange);

  return {
    matches: (memo) => memoMatchesState(memo, state),
    updateCount: (memos) => {
      countReadout.textContent = String(memos.filter((memo) => memoMatchesState(memo, state)).length);
    },
    state,
  };
}

function makeFilterSwitcher(panels) {
  const switcher = document.createElement("div");
  switcher.className = "legend-filter__switcher";

  const select = document.createElement("select");
  select.className = "legend-filter__mode";
  select.name = "filter-mode";
  select.setAttribute("aria-label", "絞り込み項目");
  select.innerHTML = ["AGE", "GROUP", "GEN", "ROLE", "MIN", "SEARCH"]
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  select.addEventListener("change", () => showPanel(switcher, select.value));

  const panelArea = document.createElement("div");
  panelArea.className = "legend-filter__panels";
  panelArea.append(...panels);

  const description = document.createElement("p");
  description.className = "legend-filter__description";
  description.dataset.filterDescription = "";
  description.setAttribute("aria-live", "polite");

  switcher.append(select, panelArea, description);
  return switcher;
}

function showPanel(root, name) {
  for (const panel of root.querySelectorAll("[data-filter-panel]")) {
    panel.hidden = panel.dataset.filterPanel !== name;
  }
  const description = root.querySelector("[data-filter-description]");
  if (description) description.textContent = getFilterDescription(name);
}

function makeHeader(countReadout, onReset) {
  const header = document.createElement("header");
  header.className = "legend-filter__header";

  const title = document.createElement("span");
  title.textContent = "FILTER / GUIDE";

  const count = document.createElement("strong");
  count.append(countReadout, " 件");

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "全表示";
  reset.addEventListener("click", onReset);

  header.append(title, count, reset);
  return header;
}

function makeOptionGroup(title, options, variant = "") {
  const group = document.createElement("fieldset");
  group.className = `legend-filter__group${variant ? ` legend-filter__group--${variant}` : ""}`;
  group.dataset.filterPanel = title;

  const legend = document.createElement("legend");
  legend.className = "sr-only";
  legend.textContent = title;
  group.append(legend);

  for (const option of options) {
    const label = document.createElement("label");
    label.className = "legend-filter__option";
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

function makeRoleControl(sources) {
  const label = document.createElement("label");
  label.className = "legend-filter__control";
  label.dataset.filterPanel = "ROLE";
  label.innerHTML = `
    <span>担当者</span>
    <select name="source-select">
      <option value="all">全員</option>
      ${sources.map((source) => `<option value="${source.id}">${source.label}</option>`).join("")}
    </select>
  `;
  return label;
}

function makeNumberControl() {
  const label = document.createElement("label");
  label.className = "legend-filter__control";
  label.dataset.filterPanel = "MIN";
  label.innerHTML = `
    <span>最小件数</span>
    <input name="min-count" type="number" min="0" max="30" step="1" value="0" />
  `;
  return label;
}

function makeSearchControl() {
  const label = document.createElement("label");
  label.className = "legend-filter__control";
  label.dataset.filterPanel = "SEARCH";
  label.innerHTML = `
    <span class="sr-only">メモ検索</span>
    <input name="keyword" type="search" placeholder="キーワードで検索" />
  `;
  return label;
}

function syncStateFromUi(state, root) {
  state.categories = getCheckedValues(root, "category");
  state.genders = getCheckedValues(root, "gender");
  const selectedSource = root.querySelector('[name="source-select"]')?.value || "all";
  state.sources = selectedSource === "all"
    ? new Set([...root.querySelectorAll('[name="source-select"] option:not([value="all"])')].map((option) => option.value))
    : new Set([selectedSource]);
  state.minCount = Number(root.querySelector('[name="min-count"]')?.value || 0);
  state.keyword = root.querySelector('[name="keyword"]')?.value.trim().toLowerCase() || "";
}

function resetState(state, root) {
  for (const input of root.querySelectorAll("input")) {
    if (input.type === "checkbox") input.checked = true;
    if (input.name === "min-count") input.value = "0";
    if (input.name === "keyword") input.value = "";
  }
  const sourceSelect = root.querySelector('[name="source-select"]');
  if (sourceSelect) sourceSelect.value = "all";
  syncStateFromUi(state, root);
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

function getFilterDescription(name) {
  return {
    AGE: "H 高校生 / U 大学生 / Y 若い社会人 / A 中高年 / S 高齢者",
    GROUP: "CP カップル / FM 家族 / MX 年齢・属性混合 / UN 不明",
    GEN: "M 男性 / F 女性 / X 男女混合 / U 不明",
    ROLE: "表示するデータの担当者を選択",
    MIN: "指定した件数以上のアイコンだけを表示",
    SEARCH: "メモの内容をキーワードで検索",
  }[name] || "";
}
