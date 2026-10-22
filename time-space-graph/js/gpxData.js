import { getMemoProfile } from "./features/profiles.js?v=20261022-03";
import { fetchPublicRouteHistory, mapPublicTracks } from "./publicRouteApi.js?v=20261022-01";

export async function loadGpxDataset(sources) {
  try {
    const data = await fetchPublicRouteHistory();
    const sourcesByFile = new Map(sources.map((source) => [source.file, source]));
    const tracks = mapPublicTracks(data, sources);
    const memos = data.memos.flatMap((record, index) => {
      const source = sourcesByFile.get(record.sourceFilename);
      if (!source) return [];
      const lat = Number(record.lat);
      const lon = Number(record.lon);
      const time = Date.parse(record.time);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(time)) return [];
      const rawName = record.name?.trim() ?? "";
      const rawDesc = record.desc?.trim() ?? "";
      return [{
        lat, lon, time,
        name: rawName || rawDesc || `Memo ${index + 1}`,
        desc: rawName ? rawDesc : "",
        sourceId: source.id,
        sourceLabel: source.label,
        ...memoProfile(record, `${rawName} ${rawDesc}`),
        marker: null,
      }];
    }).sort((a, b) => a.time - b.time);
    return { tracks, memos, errors: [], source: "api" };
  } catch (error) {
    console.warn("Public route API failed:", error);
    return { tracks: [], memos: [], errors: [error], source: "api-error" };
  }
}

function memoProfile(record, rawText) {
  const fallback = getMemoProfile(rawText);
  if (record.reviewStatus !== "confirmed") return fallback;
  const ageCodes = {
    child: "C", high_school: "H", university: "U", young: "Y", adult: "A", senior: "S",
  };
  const groupCodes = { couple: "CP", family: "FM", mixed_group: "MX" };
  const genderCodes = { male: "M", female: "F", mixed: "X" };
  const category = groupCodes[record.groupType] || ageCodes[record.age] || fallback.category;
  const gender = genderCodes[record.gender] || fallback.gender;
  const count = Number(record.countMin);
  return {
    category,
    symbol: category.length === 1 ? `${category}${gender === "U" ? "X" : gender}` : category,
    gender,
    count: Number.isInteger(count) && count > 0 ? count : fallback.count,
    isPeople: true,
  };
}

export function getTimeRange(referenceTime, startHour = 18, endHour = 24) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).formatToParts(referenceTime);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const start = Date.parse(
    `${date}T${String(startHour).padStart(2, "0")}:00:00+09:00`,
  );
  return {
    start,
    end: start + (endHour - startHour) * 60 * 60 * 1000,
  };
}
