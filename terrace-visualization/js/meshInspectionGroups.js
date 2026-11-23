/** Builds connected inspection areas without treating identical colors as identical records. */
export function buildMeshInspectionGroups(width, height, details, onDeck) {
  const ids = new Uint16Array(width * height);
  const groups = [null];
  const keyFor = (detail) => detail?.records.length
    ? JSON.stringify([detail.source, [...new Set(detail.records.map(({ id }) => id))].sort()]) : null;
  const keys = Array.from(ids, (_, index) => keyFor(details.get(index)));
  for (let start = 0; start < ids.length; start++) {
    if (!onDeck[start] || ids[start]) continue;
    const id = groups.length;
    groups.push(details.get(start) ?? { source: null, records: [] });
    ids[start] = id;
    const key = keys[start];
    if (key === null) continue;
    const frontier = [start];
    for (let i = 0; i < frontier.length; i++) {
      const cell = frontier[i], x = cell % width;
      const neighbors = [x > 0 ? cell - 1 : -1, x < width - 1 ? cell + 1 : -1, cell - width, cell + width];
      for (const next of neighbors) {
        if (!onDeck[next] || ids[next] || keys[next] !== key) continue;
        ids[next] = id;
        frontier.push(next);
      }
    }
  }
  return { ids, groups };
}
