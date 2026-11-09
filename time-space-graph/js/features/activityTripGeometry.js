export const TRIP_SPAN = 90;
export const TRIP_CYCLE_MS = 4800;
export const TRIP_LANE_OFFSET = 2.2;

export function tripPhaseAt(time) {
  return ((Math.max(0, time) % TRIP_CYCLE_MS) / TRIP_CYCLE_MS);
}

// Offset along the local route normal: each travel direction gets one lane.
export function buildActivityTripGeometry(flows, sampleRoute, steps = 72, isBlocked = () => false) {
  const positions = [];
  const progress = [];
  for (const { cell, direction, people } of flows) {
    const sign = cell.towardSign * (direction === "to_station" ? 1 : -1);
    if (!sign) continue;
    const count = Math.min(3, Math.max(0, Math.round(people)));
    for (let trail = 0; trail < count; trail += 1) {
      const phase = trail / count;
      for (let index = 0; index < steps; index += 1) {
        const midpoint = sampleRoute(cell.center, ((index + 0.5) / steps - 0.5) * TRIP_SPAN * sign);
        if (isBlocked(midpoint)) continue;
        const points = [index / steps, (index + 1) / steps].map((t) => {
          const point = sampleRoute(cell.center, (t - 0.5) * TRIP_SPAN * sign);
          const laneX = -point.tangent.z * TRIP_LANE_OFFSET * sign;
          const laneZ = point.tangent.x * TRIP_LANE_OFFSET * sign;
          const nx = -point.tangent.z * 0.65;
          const nz = point.tangent.x * 0.65;
          return { left: [point.x + laneX + nx, 0.9, point.z + laneZ + nz], right: [point.x + laneX - nx, 0.9, point.z + laneZ - nz], t: t + phase };
        });
        const [a, b] = points;
        for (const [point, side] of [[a, "left"], [a, "right"], [b, "left"], [b, "left"], [a, "right"], [b, "right"]]) {
          positions.push(...point[side]);
          progress.push(point.t);
        }
      }
    }
  }
  return { positions, progress };
}
