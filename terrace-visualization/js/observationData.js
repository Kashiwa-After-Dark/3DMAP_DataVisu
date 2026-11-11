/**
 * ファイル概要: 公開APIからテラス対象日の観察データを読み込む。
 */
import { fetchPublicRouteHistory, publicSourceLookup } from "../../backend/publicRouteApi.js?v=20261029-db1";
import { PUBLIC_SURVEY_DATE, ROUTE_SOURCES } from "../../backend/surveyConfig.js?v=20261025-01";
import { selectTerraceObservations } from "./observationModel.js";

export async function loadTerraceObservations() {
  const data = await fetchPublicRouteHistory(PUBLIC_SURVEY_DATE);
  const findSource = publicSourceLookup(ROUTE_SOURCES);
  return selectTerraceObservations(data.memos, PUBLIC_SURVEY_DATE, (record) => Boolean(findSource(record)));
}
