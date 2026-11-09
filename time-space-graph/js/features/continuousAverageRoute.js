const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function buildContinuousAverageRoutes(periods, segments) {
  const adjacency = new Map();
  for (const segment of segments) {
    for (const [from, to] of [[segment.from, segment.to], [segment.to, segment.from]]) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push({ to, segment, length: distance(from, to) });
    }
  }
  const componentOf = new Map();
  let component = 0;
  for (const node of adjacency.keys()) {
    if (componentOf.has(node)) continue;
    const queue = [node];
    componentOf.set(node, component);
    while (queue.length) {
      const from = queue.pop();
      for (const { to } of adjacency.get(from)) {
        if (componentOf.has(to)) continue;
        componentOf.set(to, component);
        queue.push(to);
      }
    }
    component += 1;
  }

  for (const period of periods) {
    period.path = [];
    period.routeCells = new Map();
    period.connectorCount = 0;
    period.omittedCells = 0;
    if (!period.cells.size) continue;
    const support = new Map();
    for (const cell of period.cells.values()) {
      const id = componentOf.get(cell.from);
      support.set(id, (support.get(id) || 0) + cell.contributors);
    }
    const mainComponent = [...support].sort((a, b) => b[1] - a[1])[0][0];
    const candidates = [...period.sequences.values()].map((sequence) => sequence
      .map((id) => period.cells.get(id))
      .filter((cell) => cell && componentOf.get(cell.from) === mainComponent))
      .filter((sequence) => sequence.length);
    if (!candidates.length) continue;
    const footprints = candidates.map((sequence) => new Set(sequence.map((cell) => cell.id)));
    // Medoid supplies traversal order; all tracks still contribute to average coordinates.
    const scores = footprints.map((footprint) => footprints.reduce((sum, other) => {
      const overlap = [...footprint].filter((id) => other.has(id)).length;
      return sum + 1 - overlap / (footprint.size + other.size - overlap);
    }, 0));
    let bestIndex = 0;
    for (let index = 1; index < candidates.length; index += 1) {
      if (scores[index] < scores[bestIndex] - 1e-6
        || (Math.abs(scores[index] - scores[bestIndex]) < 1e-6 && footprints[index].size > footprints[bestIndex].size)) bestIndex = index;
    }
    const sequence = removeShortReversals(candidates[bestIndex]);
    const meanNodes = getMeanNodePositions(period.cells);
    const pathNodes = [];
    const appendNode = (node) => {
      const point = meanNodes.get(node) || node;
      if (!period.path.length || distance(period.path.at(-1), point) > 0.01) {
        period.path.push({ x: point.x, z: point.z });
        pathNodes.push(node);
      }
    };
    const first = sequence[0];
    const nextCenter = sequence[1]?.center || first.end;
    const forward = distance(first.end, nextCenter) <= distance(first.start, nextCenter);
    appendNode(forward ? first.from : first.to);
    for (const cell of sequence) {
      const from = pathNodes.at(-1);
      const entry = distance(from, cell.from) <= distance(from, cell.to) ? cell.from : cell.to;
      const exit = entry === cell.from ? cell.to : cell.from;
      const bridge = shortestRoadPath(from, entry, adjacency, period.cells);
      for (const edge of bridge) {
        appendNode(edge.to);
      }
      appendNode(exit);
    }
    // Keep one main traversal; discard GPS-driven reversals, repeated laps and side loops.
    const selectedNodes = selectMainTraversal(pathNodes, adjacency, period.cells);
    period.path = selectedNodes.map((node) => {
      const point = meanNodes.get(node) || node;
      return { x: point.x, z: point.z };
    });
    const traversed = new Set();
    for (let index = 1; index < selectedNodes.length; index += 1) {
      const edge = adjacency.get(selectedNodes[index - 1]).find(({ to }) => to === selectedNodes[index]);
      if (edge) traversed.add(edge.segment.id);
    }
    for (const id of traversed) if (period.cells.has(id)) period.routeCells.set(id, period.cells.get(id));
    period.connectorCount = [...traversed].filter((id) => !period.cells.has(id)).length;
    period.omittedCells = period.cells.size - period.routeCells.size;
    delete period.sequences;
  }
}

function selectMainTraversal(nodes, adjacency, supported) {
  const stack = [];
  const indexes = new Map();
  const candidates = [];
  for (const node of nodes) {
    if (indexes.has(node)) {
      const index = indexes.get(node);
      if (stack.length - index > 2) candidates.push([...stack.slice(index), node]);
      for (const removed of stack.splice(index + 1)) indexes.delete(removed);
    } else {
      indexes.set(node, stack.length);
      stack.push(node);
      candidates.push([...stack]);
    }
  }
  let best = [];
  let bestScore = -1;
  let bestLength = Infinity;
  for (const candidate of candidates) {
    let length = 0;
    const unique = new Set();
    for (let index = 1; index < candidate.length; index += 1) {
      const edge = adjacency.get(candidate[index - 1]).find(({ to }) => to === candidate[index]);
      if (!edge) continue;
      unique.add(edge.segment.id);
      length += edge.length;
    }
    const score = [...unique].reduce((sum, id) => sum + (supported.get(id)?.contributors || 0), 0);
    if (score > bestScore || (score === bestScore && length < bestLength)) {
      best = candidate;
      bestScore = score;
      bestLength = length;
    }
  }
  return best;
}

function getMeanNodePositions(cells) {
  const positions = new Map();
  for (const cell of cells.values()) {
    for (const [node, point] of [[cell.from, cell.start], [cell.to, cell.end]]) {
      if (!positions.has(node)) positions.set(node, []);
      positions.get(node).push(point);
    }
  }
  return new Map([...positions].map(([node, points]) => [node, {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
  }]));
}

function removeShortReversals(sequence) {
  const result = [];
  for (const cell of sequence) {
    if (result.at(-1)?.id === cell.id) continue;
    if (result.length >= 2 && result.at(-2).id === cell.id && distance(result.at(-1).center, cell.center) < 35) {
      result.pop();
      continue;
    }
    result.push(cell);
  }
  return result;
}

function shortestRoadPath(start, end, adjacency, supported) {
  if (start === end) return [];
  const costs = new Map([[start, 0]]);
  const previous = new Map();
  const pending = new Set([start]);
  while (pending.size) {
    let from = null;
    for (const node of pending) if (!from || costs.get(node) < costs.get(from)) from = node;
    pending.delete(from);
    if (from === end) break;
    for (const edge of adjacency.get(from) || []) {
      const cost = costs.get(from) + edge.length * (supported.has(edge.segment.id) ? 1 : 3);
      if (cost >= (costs.get(edge.to) ?? Infinity)) continue;
      costs.set(edge.to, cost);
      previous.set(edge.to, { ...edge, from });
      pending.add(edge.to);
    }
  }
  const result = [];
  let cursor = end;
  while (cursor !== start) {
    const edge = previous.get(cursor);
    if (!edge) throw new Error("Average route cannot cross disconnected road components.");
    result.push(edge);
    cursor = edge.from;
  }
  return result.reverse();
}
