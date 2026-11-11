/**
 * ファイル概要: ルート上の滞在行動と観察密度を集計する。
 */
import { getActivityType } from "../../../backend/activityClassifier.js?v=20261028-02";
import { nearestSegment } from "./average-route-model.js?v=20261029-03";

export function isStationaryObservation(memo) {
  return memo.isPeople && !String(memo.motion || "").split("|").some((motion) => ["walking", "running", "cycling"].includes(motion))
    && getActivityType(memo).id !== "passing";
}

export function collectRouteActivityDensity({ period, memos, currentTime = Infinity, rangeStart = -Infinity, matches = () => true, referenceMax }) {
  const cells = [...period.cells.values()];
  const bins = cells.map((cell) => ({ cell, density: 0, votes: new Map(), color: "#b1c8d2", activity: null }));
  let records = 0;
  for (const memo of memos) {
    if (memo.time < Math.max(period.start, rangeStart) || memo.time >= period.end || memo.time > currentTime
      || !memo.hasLocation || !memo.world || !isStationaryObservation(memo) || !matches(memo)) continue;
    const hit = nearestSegment(memo.world, cells, 30);
    if (!hit) continue;
    records += 1;
    const activity = getActivityType(memo);
    for (const bin of bins) {
      const distance = Math.hypot(hit.x - bin.cell.center.x, hit.z - bin.cell.center.z);
      const weight = Math.max(0, 1 - distance / 30);
      if (!weight) continue;
      bin.density += weight;
      bin.votes.set(activity.id, { ...activity, weight: (bin.votes.get(activity.id)?.weight || 0) + weight });
    }
  }
  const maximum = referenceMax ?? Math.max(1, ...bins.map((bin) => bin.density));
  for (const bin of bins) {
    const dominant = [...bin.votes.values()].sort((a, b) => b.weight - a.weight)[0];
    bin.activity = dominant?.id || null;
    bin.color = dominant?.color || "#b1c8d2";
    bin.opacity = bin.density ? 0.15 + 0.65 * Math.sqrt(Math.min(1, bin.density / Math.max(1, maximum))) : 0.06;
    delete bin.votes;
  }
  return { bins, maximum, records };
}
