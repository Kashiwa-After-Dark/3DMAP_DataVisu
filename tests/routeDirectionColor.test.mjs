import test from "node:test";
import assert from "node:assert/strict";
import { routeDirectionBins } from "../time-space-graph/js/features/routeDirectionColor.js";

const a = { id: "a", a: { x: 0, z: 0 }, b: { x: 20, z: 0 } };
const b = { id: "b", a: { x: 20, z: 0 }, b: { x: 40, z: 0 } };
const flow = (direction, people, cell = a) => ({ cell, direction, people });
const bin = (flows) => routeDirectionBins([a], flows)[0];
const rgb = (color) => color.slice(1).match(/../g).map((value) => parseInt(value, 16));

test("equal counts, absent direction data and invalid flows stay neutral", () => {
  assert.equal(bin([]).color, "#aeb8c2");
  assert.equal(bin([flow("to_station", 5), flow("from_station", 5)]).color, "#aeb8c2");
  assert.equal(bin([flow("unknown", 100), flow("to_station", -1), flow("from_station", NaN)]).color, "#aeb8c2");
});

test("direction tint stays between vivid color and near-neutral gray", () => {
  const incoming = bin([flow("to_station", 10)]);
  const outgoing = bin([flow("from_station", 10)]);
  const [ir, , ib] = rgb(incoming.color);
  const [or, , ob] = rgb(outgoing.color);
  assert.ok(ib > ir);
  assert.ok(or > ob);
  assert.equal(incoming.opacity, 0.5);
  assert.equal(outgoing.opacity, 0.5);
  assert.equal(incoming.color, "#74aed4");
  assert.equal(outgoing.color, "#cea088");
  for (const color of [incoming.color, outgoing.color]) {
    assert.ok(rgb(color).every((value, index) => Math.abs(value - [174, 184, 194][index]) <= 60));
  }
  assert.equal(bin([]).opacity, 0.3);
});

test("tint strength uses uncapped people counts, not symbol count or record count", () => {
  const weak = bin([flow("to_station", 6), flow("from_station", 4)]);
  const strong = bin([flow("to_station", 20), flow("from_station", 4)]);
  assert.ok(strong.balance > weak.balance);
  assert.ok(rgb(strong.color)[0] < rgb(weak.color)[0]);
  assert.equal(strong.toStation, 20);
  assert.equal(strong.fromStation, 4);
  assert.equal(bin([flow("to_station", 12), flow("from_station", 8)]).color, weak.color);
});

test("coordinate-local ratios create blue and orange regions within one route", () => {
  const cells = Array.from({ length: 12 }, (_, i) => ({ id: String(i), a: { x: i * 20, z: 0 }, b: { x: (i + 1) * 20, z: 0 } }));
  const flows = [flow("to_station", 4, cells[0]), flow("to_station", 3, cells[0]), flow("from_station", 8, cells.at(-1))];
  const result = routeDirectionBins(cells, flows);
  assert.equal(result[0].toStation, 7);
  assert.equal(result.at(-1).fromStation, 8);
  assert.ok(result[0].balance > 0);
  assert.ok(result.at(-1).balance < 0);
  assert.equal(result[5].color, "#aeb8c2");
  assert.notEqual(result[0].color, result[1].color);
  for (let i = 1; i < result.length; i++) assert.equal(result[i - 1].endColor, result[i].startColor);
  assert.equal(flows[0].people, 4);
  assert.deepEqual(routeDirectionBins([], flows), []);
});

test("a closed route has a continuous gradient across its start/end seam", () => {
  const points = [{ x: 0, z: 0 }, { x: 20, z: 0 }, { x: 20, z: 20 }, { x: 0, z: 20 }, { x: 0, z: 0 }];
  const cells = points.slice(1).map((p, i) => ({ id: String(i), a: points[i], b: p }));
  const result = routeDirectionBins(cells, [flow("to_station", 4, cells[0])]);
  assert.equal(result[0].startColor, result.at(-1).endColor);
  assert.notEqual(result.at(-1).endColor, "#aeb8c2");
});

test("nearby map coordinates do not blend across distant parts of the route", () => {
  const cells = [a, { id: "long", a: a.b, b: { x: 200, z: 0 } }, { id: "back", a: { x: 200, z: 0 }, b: { x: 0, z: 2 } }];
  const result = routeDirectionBins(cells, [flow("to_station", 5), flow("from_station", 1000, cells[2])]);
  assert.equal(result[0].fromStation, 0);
  assert.equal(result[0].color, "#74aed4");
});
