/**
 * ファイル概要: 滞在が多い地点と代表的な滞在行動を判定する。
 */
import { nearestSegment } from "./average-route-model.js?v=20261029-03";
import { isStationaryObservation } from "./route-activity-density.js?v=20261029-01";
import { getActivityType } from "../../../backend/activityClassifier.js?v=20261028-02";

export const STAY_DOMINANCE_RATIO = 0.7;
export const MIN_STAY_RECORDS = 3;
export const STAY_COLOR = "#54cc89";

export function collectStayingActivities(cells, memos) {
  const counts = new Map(cells.map((cell) => [cell.id, { total: 0, staying: 0, records: 0 }]));
  const points = [];
  for (const memo of memos) {
    if (!memo.isPeople || !memo.hasLocation || !memo.world) continue;
    const cell = nearestSegment(memo.world, cells, 30)?.segment;
    const staying = !["to_station", "from_station"].includes(memo.direction) && isStationaryObservation(memo);
    if (staying) points.push({ memo, activity: getActivityType(memo) });
    if (!cell) continue;
    const count = counts.get(cell.id);
    const people = Math.max(1, Math.round(Number(memo.count) || 1));
    count.total += people;
    if (staying) { count.staying += people; count.records += 1; }
  }
  const dominant = new Set([...counts].filter(([, count]) => count.records >= MIN_STAY_RECORDS && count.staying / count.total >= STAY_DOMINANCE_RATIO).map(([id]) => id));
  return { dominant, points, counts };
}

export function applyStayingStyle(bins, dominant) {
  return bins.map((bin) => dominant.has(bin.cell.id)
    ? { ...bin, color: STAY_COLOR, startColor: STAY_COLOR, endColor: STAY_COLOR, opacity: 0.85, dashed: true }
    : { ...bin, dashed: false });
}

export function isInStayingZone(point, cells, dominant) {
  if (!dominant.size) return false;
  const cell = nearestSegment(point, cells, 8)?.segment;
  return Boolean(cell && dominant.has(cell.id));
}
