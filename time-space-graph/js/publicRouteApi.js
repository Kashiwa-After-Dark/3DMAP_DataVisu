// The public site calls a read-only Edge Function. No Supabase API key is sent
// to browsers; the function alone calls the published-survey RPC.
const ROUTE_API_URL = "https://idzkmlbjcxhhneqbgcfy.supabase.co/functions/v1/public-route-history";

export const PUBLIC_SURVEY_DATE = "2026-07-07";

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
  const sourcesByFile = new Map(sources.map((source) => [source.file, source]));
  return data.tracks.flatMap((route) => {
    const source = sourcesByFile.get(route.sourceFilename);
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
      sourceLabel: source.label,
      points,
    }] : [];
  });
}
