/**
 * ファイル概要: 行動分類と物体表示の条件だけを判定する絞り込み処理である。
 */
import { getActivityType } from "../../../../backend/activityClassifier.js?v=20261028-02";

export function matchesActivityFilter(memo, state) {
  const isObject = memo.isPeople === false || memo.category === "OBJ";
  if (isObject) return state.activityTypes.has("object");
  return state.activityTypes.has(getActivityType(memo).id);
}
