/**
 * ファイル概要: 選択した視点の感情・印象分類と物体表示の条件を判定する。
 */
import { getPerspectiveImpressionType } from "../../impression-visualization/emotion-perspective.js?v=20261029-db1";

export function matchesEmotionFilter(memo, state) {
  const isObject = memo.isPeople === false || memo.category === "OBJ";
  if (isObject) return state.impressionTypes.has("object");
  return state.impressionTypes.has(
    getPerspectiveImpressionType(memo, state.impressionPerspective).id,
  );
}
