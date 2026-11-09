import { nearestSegment } from "./averageRouteModel.js?v=20261029-03";
import { isStationaryObservation } from "./routeActivityDensity.js?v=20261029-01";

export function collectStationDirections({ period, memos, currentTime, rangeStart, matches = () => true }) {
  const totals = { to_station: 0, from_station: 0, unknown: 0, stationary: 0, unplaced: 0 };
  const groups = new Map();
  const stationary = [];
  let records = 0;
  for (const memo of memos) {
    if (!memo.isPeople || memo.time < Math.max(period.start, rangeStart) || memo.time >= period.end || memo.time > currentTime || !matches(memo)) continue;
    records += 1;
    const people = Math.max(1, Math.round(Number(memo.count) || 1));
    const direction = ["to_station", "from_station"].includes(memo.direction) ? memo.direction : null;
    if (!direction) {
      if (isStationaryObservation(memo)) {
        totals.stationary += people;
        if (memo.hasLocation && memo.world) stationary.push(memo);
      } else totals.unknown += people;
      continue;
    }
    totals[direction] += people;
    const cell = memo.hasLocation && memo.world ? nearestSegment(memo.world, period.cells.values(), 30)?.segment : null;
    if (!cell?.towardSign) { totals.unplaced += people; continue; }
    const key = `${cell.id}:${direction}`;
    if (!groups.has(key)) groups.set(key, { cell, direction, motion: "walking", people: 0 });
    groups.get(key).people += people;
  }
  return { totals, flows: [...groups.values()], stationary, records };
}

export function directionSymbols(flows, direction = "all") {
  return flows.filter((flow) => direction === "all" || flow.direction === direction)
    .map((flow) => ({ ...flow, people: Math.min(3, Math.ceil(Math.sqrt(flow.people))) }));
}
