const NEUTRAL = [174, 184, 194];
const INCOMING = [30, 158, 240];
const OUTGOING = [255, 124, 48];
export const DIRECTION_COLOR_RADIUS = 45;

export function routeDirectionBins(cells, flows) {
  if (!cells.length) return [];
  let length = 0;
  const spans = cells.map((cell) => {
    const start = length;
    length += Math.hypot(cell.b.x - cell.a.x, cell.b.z - cell.a.z);
    return { cell, start, end: length, center: (start + length) / 2 };
  });
  const byId = new Map(spans.map((span) => [span.cell.id, span]));
  const anchors = new Map();
  for (const { cell, direction, people } of flows) {
    if (!["to_station", "from_station"].includes(direction) || !Number.isFinite(people) || people <= 0) continue;
    const span = byId.get(cell.id);
    if (!span) continue;
    if (!anchors.has(cell.id)) anchors.set(cell.id, { along: span.center, to_station: 0, from_station: 0 });
    anchors.get(cell.id)[direction] += people;
  }
  const closed = length > 0 && Math.hypot(cells[0].a.x - cells.at(-1).b.x, cells[0].a.z - cells.at(-1).b.z) < 0.001;
  function sample(along) {
    const count = { to_station: 0, from_station: 0 };
    let support = 0;
    for (const anchor of anchors.values()) {
      let distance = Math.abs(along - anchor.along);
      if (closed) distance = Math.min(distance, length - distance);
      if (distance >= DIRECTION_COLOR_RADIUS) continue;
      const weight = (1 - (distance / DIRECTION_COLOR_RADIUS) ** 2) ** 2;
      count.to_station += anchor.to_station * weight;
      count.from_station += anchor.from_station * weight;
      support = Math.max(support, weight);
    }
    const total = count.to_station + count.from_station;
    const balance = total ? (count.to_station - count.from_station) / total : 0;
    const target = balance >= 0 ? INCOMING : OUTGOING;
    // Fade local direction ratios toward gray without increasing the approved saturation.
    const mix = Math.sqrt(Math.abs(balance)) * 0.4 * support;
    const rgb = NEUTRAL.map((value, index) => Math.round(value + (target[index] - value) * mix));
    const color = `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    return { color, opacity: anchors.size ? 0.5 : 0.3, balance, toStation: count.to_station, fromStation: count.from_station };
  }
  // Shared endpoint samples give adjacent segments identical boundary colors.
  return spans.map(({ cell, start, end, center }) => {
    return { cell, ...sample(center), startColor: sample(start).color, endColor: sample(end).color };
  });
}
