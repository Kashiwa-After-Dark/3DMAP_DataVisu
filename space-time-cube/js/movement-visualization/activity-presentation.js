/**
 * ファイル概要: 行動データを移動・滞在の画面表示用データへ整理する。
 */
import { getActivityType } from "../../../backend/activityClassifier.js?v=20261028-02";
import { isStationaryObservation } from "./route-activity-density.js?v=20261029-01";

export function routeBinsForView(bins, view) {
  return bins.map((bin) => view === "movement"
    ? { ...bin, color: "#aeb8c2", opacity: 0.3 }
    : { ...bin, opacity: bin.density > 0 ? bin.opacity : 0 });
}

export function summarizeStationaryActivities(memos) {
  const groups = new Map();
  for (const memo of memos) {
    if (!isStationaryObservation(memo)) continue;
    const type = getActivityType(memo);
    if (!groups.has(type.id)) groups.set(type.id, { ...type, records: 0, people: 0 });
    const group = groups.get(type.id);
    group.records += 1;
    group.people += Math.max(1, Math.round(Number(memo.count) || 1));
  }
  return [...groups.values()].sort((a, b) => b.records - a.records || a.id.localeCompare(b.id));
}
