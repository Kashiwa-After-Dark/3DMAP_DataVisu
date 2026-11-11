/**
 * ファイル概要: API観察データをテラス画面用に抽出・正規化する。
 */
const CODE_FIELDS = ["placeCode", "place_code", "locationCode", "location_code"];

const normalizeCode = (value) => typeof value === "string" ? value.normalize("NFKC").trim().toUpperCase() : "";

export function getPlaceCodes(record) {
  for (const source of [record, record.original]) {
    if (Array.isArray(source?.placeCodes)) return [...new Set(source.placeCodes.map(normalizeCode).filter(Boolean))];
  }
  for (const source of [record, record.original]) {
    for (const field of CODE_FIELDS) {
      const value = source?.[field];
      if (typeof value === "string" && value.trim()) return [normalizeCode(value)];
    }
  }
  for (const place of [record.place, record.original?.place]) {
    if (place && typeof place === "object" && typeof place.code === "string") return [normalizeCode(place.code)].filter(Boolean);
    if (typeof place !== "string") continue;
    const value = place.normalize("NFKC").trim().toUpperCase();
    const code = value.match(/^TR[A-Z0-9_-]*/)?.[0];
    if (code) return [code];
  }
  return [];
}

export function getPlaceCode(record) { return getPlaceCodes(record)[0] || ""; }

export function observationPeriod(time) {
  const hour = new Date(time + 9 * 3600000).getUTCHours();
  return hour >= 18 ? Math.min(2, Math.floor((hour - 18) / 2)) : -1;
}

export function selectTerraceObservations(memos, date, matchesSource = () => true) {
  const start = Date.parse(`${date}T00:00:00+09:00`);
  const end = start + 86400000;
  let coded = 0;
  let eligible = 0;
  const records = [];
  for (const [index, record] of memos.entries()) {
    const time = Date.parse(record.time);
    if (!matchesSource(record) || !Number.isFinite(time) || time < start || time >= end) continue;
    eligible += 1;
    const codes = getPlaceCodes(record);
    if (codes.length) coded += 1;
    const placeCodes = codes.filter((code) => code.startsWith("TR"));
    if (!placeCodes.length) continue;
    const lat = record.lat == null || record.lat === "" ? null : Number(record.lat);
    const lon = record.lon == null || record.lon === "" ? null : Number(record.lon);
    const hasLocation = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    records.push({
      id: record.observationId || `terrace-${index}`,
      placeCode: placeCodes[0],
      placeCodes,
      placeMeanings: Array.isArray(record.placeMeanings) ? record.placeMeanings.filter((item) => placeCodes.includes(normalizeCode(item.code))).map((item) => ({ code: normalizeCode(item.code), meaning: String(item.meaning || "") })) : [],
      time,
      period: observationPeriod(time),
      lat: hasLocation ? lat : null,
      lon: hasLocation ? lon : null,
      hasLocation,
      isObject: record.recordType === "objects",
      subject: record.subject || record.objectName || record.name || "観察記録",
      place: typeof record.place === "string" ? record.place : "",
      activity: record.activity || record.state || "",
      impression: record.impression || "",
      desc: record.desc || "",
      memo: record.memo || "",
      count: record.recordType === "objects" ? record.qty : record.countMin,
      age: record.age || "",
      gender: record.gender || "",
      groupType: record.groupType || "",
    });
  }
  records.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  return { records, date, eligible, coded, withLocation: records.filter((record) => record.hasLocation).length };
}

export function filterTerraceObservations(records, period = "all", code = "all") {
  return records.filter((record) => (period === "all" || record.period === Number(period)) && (code === "all" || record.placeCodes.includes(code)));
}
