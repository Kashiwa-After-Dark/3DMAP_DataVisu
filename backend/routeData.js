import { getMemoProfile } from "./profiles.js?v=20261024-02";
import { fetchPublicRouteHistory, mapPublicTracks, publicSourceLookup } from "./publicRouteApi.js?v=20261024-03";
import { resolveSurveySources } from "./surveyConfig.js?v=20261024-03";

export async function loadRouteDataset(sources) {
  try {
    const data = await fetchPublicRouteHistory();
    sources = resolveSurveySources(data, sources);
    const findSource = publicSourceLookup(sources);
    const unmatchedSourceFilenames = [...data.tracks, ...data.memos].filter((record) => !findSource(record)).map((record) => record.sourceFilename);
    const tracks = mapPublicTracks(data, sources);
    const memos = data.memos.flatMap((record, index) => {
      const source = findSource(record);
      if (!source) return [];
      const lat = record.lat == null ? null : Number(record.lat);
      const lon = record.lon == null ? null : Number(record.lon);
      const time = Date.parse(record.time);
      if (!Number.isFinite(time)) return [];
      const hasLocation = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon);
      const rawName = record.name?.trim() ?? "";
      const rawDesc = record.desc?.trim() ?? "";
      return [{
        id: record.observationId, routeId: record.routeId,
        lat: hasLocation ? lat : null, lon: hasLocation ? lon : null, time, hasLocation,
        recordType: record.recordType || 'people',
        name: rawName || record.subject || (record.recordType === 'objects' ? '物の記録' : '観察記録'),
        desc: [rawDesc || [record.activity, record.impression].filter(Boolean).join(' / '),
          record.recordType === 'objects' ? record.impression : '',
          record.memo ? `メモ: ${record.memo}` : ''].filter(Boolean).join(' / '),
        place: record.place, motion: record.motion, direction: record.direction,
        sourceId: source.id,
        sourceLabel: source.label,
        ...memoProfile(record, `${rawName} ${rawDesc}`),
        marker: null,
      }];
    }).sort((a, b) => a.time - b.time);
    return { tracks, memos, sources, counts: data.counts, errors: [], source: "api", unmatchedSourceFilenames };
  } catch (error) {
    console.warn("Public route API failed:", error);
    return {
      tracks: [],
      memos: [],
      errors: [error],
      source: "api-error",
      sources,
      unmatchedSourceFilenames: [],
    };
  }
}

function memoProfile(record, rawText) {
  const fallback = getMemoProfile(rawText);
  if (record.recordType === 'objects') return { category: 'OBJ', symbol: 'OBJ', gender: 'U', count: null, isPeople: false, quantity: record.qty };
  if (record.inputFormat !== "field_csv") return fallback;
  const ageCodes = {
    child: "C", high_school: "H", university: "U", young: "Y", adult: "A", senior: "S",
  };
  const groupCodes = {
    B: "B", G: "G", BG: "BG", GG: "GG", XG: "XG",
    couple: "CP", family: "FM", mixed_group: "MX",
  };
  const genderCodes = { male: "M", female: "F", mixed: "X" };
  const ageCategory = ageCodes[record.age] || (record.age === 'mixed' ? 'MX' : 'UN');
  const groupCategory = groupCodes[record.groupType] || record.groupType || 'UN';
  const category = ageCategory;
  const gender = genderCodes[record.gender] || 'U';
  const count = Number(record.countMin);
  return {
    category,
    ageCategory, groupCategory, ageCodes: record.ageCodes || [],
    countMax: Number(record.countMax) || count, countOver30: record.countOver30,
    symbol: `${ageCategory}${gender === "U" ? "X" : gender}`,
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
