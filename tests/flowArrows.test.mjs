import test from "node:test";
import assert from "node:assert/strict";
import { buildFlowArrowPositions } from "../time-space-graph/js/features/flowArrows.js";
import { buildSpecifiedRouteModel } from "../time-space-graph/js/features/specifiedActivityRoute.js";
import { collectDirectionalFlows, HALF_HOUR_MS } from "../time-space-graph/js/features/averageRouteModel.js";
import { createRouteMotion } from "../time-space-graph/js/features/flowArrowMotion.js";

const cell = { center: { x: 0, z: 0 }, tangent: { x: 1, z: 0 }, towardSign: 1 };
const flow = { cell, direction: "to_station", motion: "walking", people: 1 };

test("each recorded person produces one chevron regardless of movement type", () => {
  for (const motion of ["walking", "running", "cycling"]) {
    for (const people of [0, 1, 3, 10, 30]) {
      const positions = buildFlowArrowPositions([{ ...flow, people, motion }]);
      assert.equal(positions.length, people * 36);
      assert.ok(positions.every(Number.isFinite));
    }
  }
});

test("arrows form one queue on the centerline and reverse direction for outbound records", () => {
  const positions = buildFlowArrowPositions([{ ...flow, people: 10 }]);
  const chevrons = Array.from({ length: 10 }, (_, i) => JSON.stringify(positions.slice(i * 36, (i + 1) * 36)));
  assert.equal(new Set(chevrons).size, 10);
  for (let index = 0; index < 10; index += 1) {
    const start = index * 36;
    assert.equal((positions[start + 8] + positions[start + 17]) / 2, 0);
    assert.equal((positions[start + 6] + positions[start + 15]) / 2, -5 - index * 9);
  }
  const inward = buildFlowArrowPositions([flow]);
  const outward = buildFlowArrowPositions([{ ...flow, direction: "from_station" }]);
  for (let i = 0; i < inward.length; i += 3) {
    assert.equal(outward[i], -inward[i]);
    assert.equal(outward[i + 2], -inward[i + 2]);
  }
});

test("queues follow route corners in all three frames, without lateral displacement", () => {
  const sampleRoute = createRouteMotion([{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 100 }, { x: 0, z: 100 }, { x: 0, z: 0 }]);
  const cornerCell = { ...cell, center: { x: 10, z: 0 } };
  for (const direction of ["to_station", "from_station"]) for (const phase of [0, 1, 2]) {
    const positions = buildFlowArrowPositions([{ ...flow, cell: cornerCell, direction, people: 20 }], 0.6, { phase, sampleRoute });
    const sign = direction === "to_station" ? 1 : -1;
    for (let index = 0; index < 20; index += 1) {
      const expected = sampleRoute(cornerCell.center, (-5 - index * 9 + phase * 3) * sign);
      const start = index * 36;
      assert.ok(Math.abs((positions[start + 6] + positions[start + 15]) / 2 - expected.x) < 1e-9);
      assert.ok(Math.abs((positions[start + 8] + positions[start + 17]) / 2 - expected.z) < 1e-9);
    }
  }
});

test("multiple observations sum people, not record count, and filters update arrows", () => {
  const model = buildSpecifiedRouteModel({ project: ({ lat, lon }) => ({ x: lon * 90000, z: lat * 111000 }), station: { lat: 35.8623276, lon: 139.9710664 }, startTime: 0, endTime: HALF_HOUR_MS });
  const segment = model.segments.find((entry) => entry.towardSign);
  const memo = { time: 1000, world: segment.center, hasLocation: true, isPeople: true, direction: "to_station", motion: "walking" };
  const options = { model, period: model.periods[0], memos: [{ ...memo, count: 3 }, { ...memo, count: 5 }], currentTime: 2000, rangeStart: 0 };
  const result = collectDirectionalFlows(options);
  assert.equal(result.flows[0].records, 2);
  assert.equal(result.flows[0].people, 8);
  assert.equal(buildFlowArrowPositions(result.flows).length, 8 * 36);
  assert.equal(buildFlowArrowPositions(collectDirectionalFlows({ ...options, matches: (entry) => entry.count === 3 }).flows).length, 3 * 36);
});

test("different movement types at the same cell occupy distinct arrow slots", () => {
  const positions = buildFlowArrowPositions([{ ...flow, people: 3 }, { ...flow, people: 2, motion: "running" }]);
  assert.equal(positions.length, 5 * 36);
  const arrows = Array.from({ length: 5 }, (_, index) => JSON.stringify(positions.slice(index * 36, (index + 1) * 36)));
  assert.equal(new Set(arrows).size, 5);
});
