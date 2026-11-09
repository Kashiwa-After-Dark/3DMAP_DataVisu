export function createStationDirectionSummary({ onChange, onSeek }) {
  const root = document.createElement("section");
  root.className = "station-flow-summary";
  root.hidden = true;
  root.setAttribute("aria-label", "駅方向の観察集計");
  const state = { direction: "all", scope: "period", view: "movement" };
  let language = "ja";
  let last = null;
  const heading = document.createElement("div");
  heading.className = "station-flow-summary__heading";
  const title = document.createElement("b");
  const time = document.createElement("output");
  heading.append(title, time);
  const views = document.createElement("div");
  views.className = "station-flow-summary__views";
  views.setAttribute("role", "group");
  const viewButtons = ["movement", "activity"].map((view) => {
    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", () => { state.view = view; sync(); onChange(state); });
    views.append(button);
    return button;
  });
  const scopes = document.createElement("div");
  scopes.className = "station-flow-summary__scopes";
  const scopeButtons = ["period", "range"].map((scope) => {
    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", () => { state.scope = scope; sync(); onChange(state); });
    scopes.append(button);
    return button;
  });
  const directions = document.createElement("div");
  directions.className = "station-flow-summary__directions";
  const directionButtons = ["to_station", "from_station"].map((direction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.direction = direction;
    const label = document.createElement("span");
    const count = document.createElement("strong");
    button.append(label, count);
    button.addEventListener("click", () => { state.direction = state.direction === direction ? "all" : direction; sync(); onChange(state); });
    directions.append(button);
    return { button, label, count, direction };
  });
  const bar = document.createElement("div");
  bar.className = "station-flow-summary__balance";
  bar.setAttribute("role", "img");
  const incoming = document.createElement("i");
  const outgoing = document.createElement("i");
  bar.append(incoming, outgoing);
  const activities = document.createElement("div");
  activities.className = "station-flow-summary__activities";
  const footer = document.createElement("div");
  footer.className = "station-flow-summary__footer";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "←";
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "→";
  const detail = document.createElement("small");
  const note = document.createElement("small");
  note.className = "station-flow-summary__note";
  previous.addEventListener("click", () => { if (last) onSeek(Math.max(0, last.period.index - 1)); });
  next.addEventListener("click", () => { if (last) onSeek(Math.min(11, last.period.index + 1)); });
  footer.append(previous, next, detail);
  root.append(heading, views, scopes, directions, bar, activities, footer, note);
  function sync() {
    const en = language === "en";
    const movement = state.view === "movement";
    root.dataset.view = state.view;
    root.setAttribute("aria-label", en ? "Movement and activity observations" : "移動と行動の観察集計");
    title.textContent = movement ? (en ? "STATION FLOW" : "柏駅への動き") : (en ? "STAYING ACTIVITIES" : "場所での行動");
    views.setAttribute("aria-label", en ? "Display content" : "表示内容");
    viewButtons.forEach((button, index) => {
      button.textContent = index ? (en ? "Activities" : "行動") : (en ? "Movement" : "移動");
      button.setAttribute("aria-pressed", String(state.view === (index ? "activity" : "movement")));
    });
    directions.hidden = !movement;
    bar.hidden = !movement;
    activities.hidden = movement;
    scopeButtons.forEach((button, index) => {
      button.textContent = index ? (en ? "Selected range" : "選択範囲の累計") : (en ? "30 minutes" : "30分ごと");
      button.setAttribute("aria-pressed", String(state.scope === (index ? "range" : "period")));
    });
    for (const { button, label, count, direction } of directionButtons) {
      label.textContent = direction === "to_station" ? (en ? "TO STATION" : "駅へ向かう") : (en ? "FROM STATION" : "駅から離れる");
      count.textContent = last ? `${last.totals[direction].toLocaleString()}${en ? "" : " 人"}` : "0";
      button.setAttribute("aria-label", `${label.textContent} ${count.textContent}`);
      button.setAttribute("aria-pressed", String(state.direction === "all" || state.direction === direction));
    }
    previous.setAttribute("aria-label", en ? "Previous 30 minutes" : "前の30分");
    next.setAttribute("aria-label", en ? "Next 30 minutes" : "次の30分");
    previous.disabled = !last || last.period.index === 0;
    next.disabled = !last || last.period.index === 11;
    if (!last) return;
    const format = (value) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value);
    time.textContent = `${format(last.start)} — ${format(last.end)}`;
    const total = last.totals.to_station + last.totals.from_station;
    const percent = total ? last.totals.to_station / total * 100 : 50;
    incoming.style.width = `${percent}%`;
    outgoing.style.width = `${100 - percent}%`;
    bar.style.opacity = total ? "1" : "0.2";
    bar.setAttribute("aria-label", en ? `${Math.round(percent)}% toward station` : `方向判明人数のうち駅へ ${total ? Math.round(percent) : 0}%`);
    const groups = last.activities || [];
    const activityRecords = groups.reduce((sum, group) => sum + group.records, 0);
    const activityPeople = groups.reduce((sum, group) => sum + group.people, 0);
    activities.replaceChildren(...groups.map((group) => {
      const row = document.createElement("div");
      const swatch = document.createElement("i");
      swatch.style.backgroundColor = group.color;
      const label = document.createElement("span");
      label.textContent = en ? group.code : group.label;
      const count = document.createElement("span");
      count.textContent = `${group.records}${en ? "" : "件"}`;
      row.append(swatch, label, count);
      return row;
    }));
    if (!groups.length) activities.textContent = en ? "No staying activities" : "該当する行動なし";
    const records = movement ? last.records : activityRecords;
    detail.textContent = en ? `${records} records` : `観察 ${records}件`;
    note.textContent = !movement
      ? (en ? `Observed totals: ${activityPeople} people` : `滞在行動の延べ人数 ${activityPeople}人`)
      : en
      ? `Observed totals · unplaced ${last.totals.unplaced} / direction unknown ${last.totals.unknown}`
      : `延べ人数 ／ 配置不可 ${last.totals.unplaced}人・方向不明 ${last.totals.unknown}人`;
    root.title = en ? "Observed totals, not unique people. Moving trails are schematic, not measured paths or speeds." : "観察記録の延べ人数です。流れる線は方向の模式表示で、実測の移動経路や速度ではありません。";
  }
  sync();
  return { root, state, update(data) { last = data; sync(); }, setLanguage(value) { language = value; sync(); } };
}
