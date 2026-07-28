import { getMemoProfile } from "./features/profiles.js?v=20260725-2";

export async function loadGpxDataset(sources) {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`Failed to load GPX: ${source.url}`);
      const gpxText = await response.text();
      const doc = new DOMParser().parseFromString(gpxText, "application/xml");
      if (doc.querySelector("parsererror")) {
        throw new Error(`Invalid GPX: ${source.url}`);
      }
      return {
        tracks: parseTrackSegments(doc, source),
        memos: parseMemoPoints(doc, source),
      };
    }),
  );
  const loaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  return {
    tracks: loaded.flatMap((result) => result.tracks),
    memos: loaded
      .flatMap((result) => result.memos)
      .sort((a, b) => a.time - b.time),
    errors: results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason),
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

function parseTrackSegments(doc, source) {
  let segments = [...doc.getElementsByTagNameNS("*", "trkseg")];
  if (!segments.length) segments = [doc];

  return segments
    .map((segment, index) => ({
      id: `${source.id}-track-${index}`,
      sourceId: source.id,
      sourceLabel: source.label,
      points: [...segment.getElementsByTagNameNS("*", "trkpt")]
        .map((point) => ({
          lat: Number(point.getAttribute("lat")),
          lon: Number(point.getAttribute("lon")),
          time: Date.parse(getChildText(point, "time")),
        }))
        .filter((point) => (
          Number.isFinite(point.lat)
          && Number.isFinite(point.lon)
          && Number.isFinite(point.time)
        ))
        .sort((a, b) => a.time - b.time),
    }))
    .filter((track) => track.points.length > 1);
}

function parseMemoPoints(doc, source) {
  return [...doc.getElementsByTagNameNS("*", "wpt")]
    .map((point, index) => {
      const rawName = getChildText(point, "name");
      const rawDesc = getChildText(point, "desc");
      return {
        lat: Number(point.getAttribute("lat")),
        lon: Number(point.getAttribute("lon")),
        time: Date.parse(getChildText(point, "time")),
        name: rawName || rawDesc || `Memo ${index + 1}`,
        desc: rawName ? rawDesc : "",
        sourceId: source.id,
        sourceLabel: source.label,
        ...getMemoProfile(`${rawName} ${rawDesc}`),
        marker: null,
      };
    })
    .filter((point) => (
      Number.isFinite(point.lat)
      && Number.isFinite(point.lon)
      && Number.isFinite(point.time)
    ))
    .sort((a, b) => a.time - b.time);
}

function getChildText(element, name) {
  return element.getElementsByTagNameNS("*", name)[0]?.textContent?.trim() || "";
}
