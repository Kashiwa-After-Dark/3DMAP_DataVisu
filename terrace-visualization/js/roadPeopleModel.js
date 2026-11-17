/**
 * ファイル概要: 保存済みの駅方向のみを模式表示へ選び、道の線分を駅側から遠い側へ順序付けする。
 */
export function roadRepresentatives(records, availableCodes) {
  if (!new Set(availableCodes).has("TR-02")) return [];
  return ["to_station", "from_station"].flatMap((direction, index) => {
    const matches = records.filter((r) => !r.isObject && r.direction === direction && /(?:^|\|)(?:walking|running)(?:\||$)/u.test(r.motion || ""));
    return matches.length ? [{ code: "TR-02", label: direction === "to_station" ? "駅へ向かう" : "駅から離れる", count: matches.length, direction, motion: "walk", illustration: "walk", index, sourceCodes: [...new Set(matches.flatMap((r) => r.placeCodes || []))] }] : [];
  });
}

export function roadSegmentCandidates(triangle, station) {
  return [[0, 1], [1, 2], [2, 0]].map(([a, b]) => {
    const point = (index) => ({ x: triangle.reduce((sum, p, i) => sum + p.x * (i === index ? 0.82 : 0.09), 0), z: triangle.reduce((sum, p, i) => sum + p.z * (i === index ? 0.82 : 0.09), 0) });
    const ends = [point(a), point(b)];
    ends.sort((p, q) => Math.hypot(p.x - station.x, p.z - station.z) - Math.hypot(q.x - station.x, q.z - station.z));
    const dx = ends[1].x - ends[0].x;
    const dz = ends[1].z - ends[0].z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((station.x - ends[0].x) * dx + (station.z - ends[0].z) * dz) / lengthSquared)) : 0;
    ends[0] = { x: ends[0].x + dx * t, z: ends[0].z + dz * t };
    return ends;
  }).sort((a, b) => Math.hypot(b[0].x - b[1].x, b[0].z - b[1].z) - Math.hypot(a[0].x - a[1].x, a[0].z - a[1].z));
}
