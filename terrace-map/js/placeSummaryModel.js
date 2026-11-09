const COLORS = ["#72c9dd", "#ecae77", "#a8cc89", "#c3a8e2", "#e890ac", "#7cd4bd", "#c7cdd5", "#b8b46e"];

export function buildPlaceCatalog(records) {
  const codes = [...new Set(records.flatMap((record) => record.placeCodes))].sort();
  const meanings = new Map();
  for (const record of records) {
    for (const item of record.placeMeanings || []) {
      if (item.meaning?.trim() && !meanings.has(item.code)) meanings.set(item.code, item.meaning.trim());
    }
  }
  return codes.map((code, index) => {
    const name = meanings.get(code) || `意味名未登録（${code}）`;
    const duplicateName = codes.some((other) => other !== code && meanings.get(other) === name);
    return { code, name, label: duplicateName ? `${name}（${code}）` : name, color: COLORS[index % COLORS.length] };
  });
}

export function summarizePlaces(records, catalog, period = "all") {
  const rows = catalog.map((place) => ({ ...place, total: 0, periods: [0, 0, 0], unplaced: 0, activities: new Map() }));
  const byCode = new Map(rows.map((row) => [row.code, row]));
  for (const record of records) {
    if (period !== "all" && record.period !== Number(period)) continue;
    for (const code of new Set(record.placeCodes)) {
      const row = byCode.get(code);
      if (!row) continue;
      row.total += 1;
      if (record.period >= 0 && record.period < 3) row.periods[record.period] += 1;
      if (!record.hasLocation) row.unplaced += 1;
      const activity = typeof record.activity === "string" ? record.activity.trim().replace(/\s+/gu, " ") : "";
      if (activity) row.activities.set(activity, (row.activities.get(activity) || 0) + 1);
    }
  }
  return rows.map((row) => ({ ...row, activities: [...row.activities].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja")) }))
    .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
}

export function formatPlaceNames(record, catalog) {
  const byCode = new Map(catalog.map((place) => [place.code, place.label]));
  return [...new Set(record.placeCodes)].map((code) => byCode.get(code) || `意味名未登録（${code}）`).join(" / ");
}
