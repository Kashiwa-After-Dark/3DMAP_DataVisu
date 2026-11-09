import { summarizePlaces } from "./placeSummaryModel.js";

export function createPlaceSummary(root, onSelect) {
  return {
    render(records, catalog, period, selectedCode) {
      const rows = summarizePlaces(records, catalog, period);
      const max = Math.max(1, ...rows.map((row) => row.total));
      const maxPeriod = Math.max(1, ...rows.flatMap((row) => row.periods));
      root.replaceChildren();
      const heading = document.createElement("div");
      heading.className = "place-summary-heading";
      heading.innerHTML = "<span>場所 / 観察記録数</span><span>時間帯別</span>";
      root.append(heading);
      if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "place-summary-note";
        empty.textContent = "場所コード付きの観察記録はありません。";
        root.append(empty);
        return;
      }
      for (const row of rows) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "place-summary-row";
        button.style.setProperty("--place-color", row.color);
        button.setAttribute("aria-pressed", String(selectedCode === row.code));
        button.setAttribute("aria-label", `${row.label}、${row.total}件`);
        button.title = `${row.code} · ${row.label} / 座標なし ${row.unplaced}件`;
        const title = document.createElement("span");
        title.className = "place-summary-title";
        const swatch = document.createElement("i");
        const name = document.createElement("span");
        name.textContent = row.label;
        const count = document.createElement("b");
        count.textContent = `${row.total}件`;
        title.append(swatch, name, count);
        const track = document.createElement("span");
        track.className = "place-count-track";
        const bar = document.createElement("i");
        bar.style.width = `${row.total / max * 100}%`;
        track.append(bar);
        const periods = document.createElement("span");
        periods.className = "place-periods";
        row.periods.forEach((value, index) => {
          const cell = document.createElement("span");
          cell.className = "place-period-cell";
          cell.classList.toggle("is-outside", period !== "all" && Number(period) !== index);
          cell.style.setProperty("--intensity", String(value ? 0.12 + value / maxPeriod * 0.48 : 0));
          const label = document.createElement("small");
          label.textContent = ["18–20", "20–22", "22–24"][index];
          const number = document.createElement("b");
          number.textContent = String(value);
          cell.append(label, number);
          periods.append(cell);
        });
        const activities = document.createElement("span");
        activities.className = "place-common-activities";
        activities.textContent = row.activities.length ? `主な行動：${row.activities.slice(0, 2).map((item) => `${item.label} ${item.count}件`).join(" / ")}` : "行動の記録なし";
        activities.title = row.activities.map((item) => `${item.label} ${item.count}件`).join(" / ");
        button.append(title, track, periods, activities);
        button.addEventListener("click", () => onSelect(row.code === selectedCode ? "all" : row.code));
        root.append(button);
      }
      const note = document.createElement("p");
      note.className = "place-summary-note";
      note.textContent = "単位：観察記録（人数ではありません）。座標なしも含みます。複数場所の記録は各場所に計上するため、場所別合計には重複があります。行動は記録文の表記別で集計しています。";
      root.append(note);
    },
  };
}
