/**
 * ファイル概要: 移動ルートと滞在表示のレイヤー表示を個別に切り替える。
 */
export function activityLayerVisibility(mode = "combined") {
  return { directions: mode !== "activities", activities: mode !== "directions" };
}

export function createActivityLayerFilter(onChange) {
  let mode = "combined";
  let language = "ja";
  const root = document.createElement("div");
  root.className = "activity-layer-filter";
  root.setAttribute("role", "group");
  const modes = ["directions", "activities", "combined"];
  const buttons = modes.map((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.activityLayer = value;
    button.addEventListener("click", () => {
      if (mode === value) return;
      mode = value;
      sync();
      onChange(activityLayerVisibility(mode));
    });
    root.append(button);
    return button;
  });
  function sync() {
    const en = language === "en";
    root.setAttribute("aria-label", en ? "Activity map layers" : "行動マップの表示対象");
    const labels = en ? ["Routes only", "Activities only", "Combined"] : ["方向・点線", "行動のみ", "重ねて表示"];
    buttons.forEach((button, index) => {
      button.textContent = labels[index];
      button.setAttribute("aria-pressed", String(mode === modes[index]));
    });
  }
  sync();
  return { root, getVisibility: () => activityLayerVisibility(mode), setLanguage(value) { language = value; sync(); } };
}
