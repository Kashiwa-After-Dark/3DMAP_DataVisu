// The public site calls a read-only Edge Function. No Supabase API key is sent
// to browsers; the function alone calls the published-survey RPC.
import { PUBLIC_SURVEY_DATE } from "./surveyConfig.js?v=20261025-01";

const ROUTE_API_URL = "https://idzkmlbjcxhhneqbgcfy.supabase.co/functions/v1/public-route-history";

export { PUBLIC_SURVEY_DATE };

export async function fetchPublicRouteHistory(date = PUBLIC_SURVEY_DATE) {
  const url = new URL(ROUTE_API_URL);
  url.searchParams.set("date", date);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Map API request failed (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  if (!Array.isArray(data?.tracks) || !Array.isArray(data?.memos)) {
    throw new Error("Map API returned an invalid dataset.");
  }
  return data;
}

export function mapPublicTracks(data, sources) {
  const findSource = publicSourceLookup(sources);
  return data.tracks.flatMap((route) => {
    const source = findSource(route);
    if (!source || !Array.isArray(route.points)) return [];
    const points = route.points.map((point) => ({
      lat: Number(point.lat),
      lon: Number(point.lon),
      time: Date.parse(point.time),
    })).filter((point) => (
      Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.time)
    )).sort((a, b) => a.time - b.time);
    return points.length > 1 ? [{
      id: `${source.id}-api-${route.routeId}`,
      sourceId: source.id,
      // Keep the API route identity and assignee label alongside the logical
      // source used by the observation filters. Several named tracks can
      // therefore share one logical route without losing their identity.
      routeId: route.routeId,
      apiSourceId: route.sourceId,
      trackSourceId: route.sourceId,
      sourceLabel: route.sourceLabel || source.label,
      routeSourceLabel: source.label,
      points,
    }] : [];
  });
}

export function publicSourceLookup(sources) {
  const byId = new Map(sources.flatMap((source) => [
    source.id,
    source.apiId,
    ...(source.apiIds || []),
  ].filter(Boolean).map((id) => [id, source])));
  const byFile = new Map(sources.flatMap((source) => (
    (source.sourceFiles || [source.file]).map((file) => [file, source])
  )));
  return (record) => (record.sourceId && byId.get(record.sourceId)) || byFile.get(record.sourceFilename);
}
