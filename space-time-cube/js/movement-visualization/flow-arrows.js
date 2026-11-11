/**
 * ファイル概要: 駅へ向かう・駅から離れる人数をルート上の矢印で表示する。
 */
export const FLOW_COLORS = Object.freeze({ to_station: 0x189dce, from_station: 0xe8793e });

export function buildFlowArrowPositions(flows, y = 0.6, { phase = 0, sampleRoute } = {}) {
  const positions = [];
  const grouped = new Map();
  for (const flow of flows) {
    if (!grouped.has(flow.cell)) grouped.set(flow.cell, new Map());
    const directions = grouped.get(flow.cell);
    if (!directions.has(flow.direction)) directions.set(flow.direction, { ...flow, people: 0 });
    const group = directions.get(flow.direction);
    group.people += Math.max(0, Math.round(Number(flow.people) || 0));
    if (flow.motion === "running") group.motion = "running";
  }
  // Extend each queue along the route, never into parallel lanes.
  for (const { cell, direction, motion, people } of [...grouped.values()].flatMap((directions) => [...directions.values()])) {
    const count = Math.max(0, Math.round(Number(people) || 0));
    const sign = cell.towardSign * (direction === "to_station" ? 1 : -1);
    for (let index = 0; index < count; index += 1) {
      const travel = (-5 - index * 9 + phase * 3) * sign;
      const point = sampleRoute ? sampleRoute(cell.center, travel) : {
        x: cell.center.x + cell.tangent.x * travel,
        z: cell.center.z + cell.tangent.z * travel,
        tangent: cell.tangent,
      };
      const tangent = { x: point.tangent.x * sign, z: point.tangent.z * sign };
      const normal = { x: -tangent.z, z: tangent.x };
      const tip = { x: point.x, z: point.z };
      for (const side of [-1, 1]) {
        const tail = { x: tip.x - tangent.x * 4 + normal.x * side * 2.5, z: tip.z - tangent.z * 4 + normal.z * side * 2.5 };
        appendStroke(positions, tail, tip, y, motion === "running" ? 1.25 : 1.05);
      }
    }
  }
  return positions;
}

function appendStroke(positions, a, b, y, width) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const nx = -(b.z - a.z) / length * width / 2;
  const nz = (b.x - a.x) / length * width / 2;
  positions.push(
    a.x + nx, y, a.z + nz, a.x - nx, y, a.z - nz, b.x + nx, y, b.z + nz,
    b.x + nx, y, b.z + nz, a.x - nx, y, a.z - nz, b.x - nx, y, b.z - nz,
  );
}
