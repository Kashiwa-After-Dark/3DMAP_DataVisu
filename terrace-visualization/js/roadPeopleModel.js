/**
 * ファイル概要: 保存済みの駅方向と、ルート面の出入口を結ぶ表示経路を扱う。
 */
export function roadRepresentatives(records, availableCodes) {
  if (!new Set(availableCodes).has("TR-02")) return [];
  return ["to_station", "from_station"].flatMap((direction, index) => {
    const matches = records.filter((r) => !r.isObject && r.direction === direction && /(?:^|\|)(?:walking|running)(?:\||$)/u.test(r.motion || ""));
    return matches.length ? [{ code: "TR-02", label: direction === "to_station" ? "駅へ向かう" : "駅から離れる", count: matches.length, direction, motion: "walk", illustration: "walk", index, sourceCodes: [...new Set(matches.flatMap((r) => r.placeCodes || []))] }] : [];
  });
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const vertexKey = ({ x, z }) => `${x.toFixed(4)},${z.toFixed(4)}`;

export function routeBetweenEdges(triangles, station, exits, canCross) {
  const edges = new Map();
  for (const { points } of triangles) {
    const nodes = points.map((a, index) => {
      const b = points[(index + 1) % 3];
      const key = [vertexKey(a), vertexKey(b)].sort().join("/");
      if (!edges.has(key)) edges.set(key, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, faces: 0, neighbors: new Set() });
      const node = edges.get(key);
      node.faces++;
      return node;
    });
    for (let i = 0; i < 3; i++) {
      const a = nodes[i], b = nodes[(i + 1) % 3];
      if (canCross(a, b)) {
        a.neighbors.add(b);
        b.neighbors.add(a);
      }
    }
  }
  const boundary = [...edges.values()].filter((edge) => edge.faces === 1);
  const gate = (point) => boundary.find((edge) => distance(edge, point) < 0.02);
  const start = gate(station);
  if (!start) return null;
  const goals = new Set(exits.map(gate).filter((edge) => edge && edge !== start));
  const pending = new Set([start]), visited = new Set();
  const costs = new Map([[start, 0]]), previous = new Map();
  while (pending.size) {
    const node = [...pending].reduce((best, edge) => costs.get(edge) < costs.get(best) ? edge : best);
    if (goals.has(node)) {
      const path = [];
      for (let edge = node; edge; edge = previous.get(edge)) path.unshift({ x: edge.x, z: edge.z });
      return path;
    }
    pending.delete(node);
    visited.add(node);
    for (const next of node.neighbors) {
      if (visited.has(next)) continue;
      const cost = costs.get(node) + distance(node, next);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, cost);
      previous.set(next, node);
      pending.add(next);
    }
  }
  return null;
}
