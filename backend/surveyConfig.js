export const PUBLIC_SURVEY_DATE = "2026-10-23";

const DEFAULT_HIDDEN_SOURCES = new Set([
  "01_1820_takahashi.gpx",
  "01_2022_Hayato.gpx",
  "01_2022_KatayamaTakumi.gpx",
  "01_2022_Okazaki.gpx",
  "01_2022_SatoSora.gpx",
  "01_2022_Senri.gpx",
]);

const SOURCE_LANES = new Map([
  ["01_1820_takahashi.gpx", "terrace"],
  ["01_2022_Hayato.gpx", "terrace"],
  ["01_2022_KatayamaTakumi.gpx", "terrace"],
  ["01_2022_Senri.gpx", "terrace"],
  ["01_2224_Kobayashi.gpx", "terrace"],
  ["01_1820_Omori.gpx", "reysol"],
  ["01_1820_Nakamura.gpx", "reysol"],
  ["01_2022_Tomoya.gpx", "reysol"],
  ["01_2022_SatoSora.gpx", "reysol"],
  ["01_2022_Okazaki.gpx", "reysol"],
  ["01_2224_Yoh.gpx", "reysol"],
]);

const SPRING_ROUTE_SOURCES = [
  "01_1820_Omori.gpx",
  "01_1820_Nakamura.gpx",
  "01_1820_takahashi.gpx",
  "01_2022_Tomoya.gpx",
  "01_2022_Hayato.gpx",
  "01_2022_KatayamaTakumi.gpx",
  "01_2022_Okazaki.gpx",
  "01_2022_SatoSora.gpx",
  "01_2022_Senri.gpx",
  "01_2224_Kobayashi.gpx",
  "01_2224_Yoh.gpx",
].map((file, index) => ({
  id: `source-${index}`,
  file,
  label: file.replace(/^\d+_\d+_/, "").replace(/\.gpx$/i, ""),
  visibleByDefault: !DEFAULT_HIDDEN_SOURCES.has(file),
  lane: SOURCE_LANES.get(file),
}));

const SURVEY_SOURCES_BY_DATE = {
  "2026-07-07": SPRING_ROUTE_SOURCES,
  "2026-10-23": [{
    id: "kashiwa-route-2026-10-23",
    file: "observations_people_2026-10-24.csv",
    sourceFiles: [
      "observations_people_2026-10-24.csv",
      "observations_objects_2026-10-24.csv",
    ],
    label: "柏駅周辺ルート",
    lane: "route",
    visibleByDefault: true,
    mergeRecords: true,
  }],
};

export const ROUTE_SOURCES = SURVEY_SOURCES_BY_DATE[PUBLIC_SURVEY_DATE] || [];

export function resolveSurveySources(data, configured = ROUTE_SOURCES) {
  const candidates = [...(data.sources || []), ...data.tracks, ...data.memos];
  const mergedSources = configured.filter((source) => source.mergeRecords);
  if (mergedSources.length) {
    return mergedSources.map((source) => ({
      ...source,
      segmentIndexes: getSegmentIndexes(data.memos.filter((memo) => sourceMatchesRecord(source, memo))),
    }));
  }

  const result = new Map();
  for (const record of candidates) {
    const key = record.sourceId || record.sourceFilename;
    if (!key || result.has(key)) continue;
    const prior = configured.find((source) => source.apiId === key || source.id === key || source.file === record.sourceFilename);
    const sourceRecords = data.memos.filter((memo) => (memo.sourceId || memo.sourceFilename) === key);
    const segmentIndexes = getSegmentIndexes(sourceRecords);
    result.set(key, {
      ...prior,
      id: prior?.id || key, apiId: key,
      file: prior?.file || record.sourceFilename || key,
      label: prior?.label || record.sourceLabel || record.sourceFilename || key,
      lane: prior?.lane || 'unassigned', visibleByDefault: prior?.visibleByDefault !== false,
      segmentIndexes,
    });
  }
  return [...result.values()];
}

function sourceMatchesRecord(source, record) {
  const sourceFiles = source.sourceFiles || [source.file];
  return source.apiId === record.sourceId
    || source.id === record.sourceId
    || sourceFiles.includes(record.sourceFilename);
}

function getSegmentIndexes(records) {
  return [...new Set(records.map((memo) => {
    const hour = new Date(Date.parse(memo.time) + 9 * 3600_000).getUTCHours();
    return Math.floor((hour - 18) / 2);
  }).filter((index) => index >= 0 && index < 3))].sort();
}

