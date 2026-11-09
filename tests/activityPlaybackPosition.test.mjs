import test from "node:test";
import assert from "node:assert/strict";
import { getActivityPlaybackPositions } from "../time-space-graph/js/features/activityPlaybackPosition.js";

const project = ({ lon, lat }) => ({ x: lon, z: lat });
const points = [{ lon: 0, lat: 2, time: 1000 }, { lon: 20, lat: 2, time: 11000 }, { lon: 40, lat: 2, time: 21000 }];
const segments = [{ a: { x: 0, z: 0 }, b: { x: 40, z: 0 }, tangent: { x: 1, z: 0 }, normal: { x: 0, z: 1 } }];
const options = { tracks: [{ points }], currentTime: 6000, rangeStart: 0, project, segments };

test("head interpolates the current GPS position and projects it onto the specified route", () => {
  assert.deepEqual(getActivityPlaybackPositions(options), [{ trackIndex: 0, x: 10, z: 0, sign: 1 }]);
  assert.equal(getActivityPlaybackPositions({ ...options, currentTime: 11000 })[0].x, 20);
  assert.equal(getActivityPlaybackPositions({ ...options, currentTime: 21000 })[0].x, 40);
});

test("finished and not-yet-started tracks never leave a playback cap", () => {
  assert.equal(getActivityPlaybackPositions({ ...options, currentTime: 999 }).length, 0);
  assert.equal(getActivityPlaybackPositions({ ...options, currentTime: 21001 }).length, 0);
  assert.equal(getActivityPlaybackPositions({ ...options, rangeStart: 7000 }).length, 0);
  assert.equal(getActivityPlaybackPositions({ ...options, isTrackVisible: () => false }).length, 0);
});

test("large GPS gaps and off-route positions do not invent a progress point", () => {
  assert.equal(getActivityPlaybackPositions({ ...options, tracks: [{ points: [points[0], { ...points[1], time: 300000 }] }] }).length, 0);
  assert.equal(getActivityPlaybackPositions({ ...options, tracks: [{ points: points.map((point) => ({ ...point, lat: 61 })) }] }).length, 0);
});

test("head direction follows the recorder movement, not the observed people's direction", () => {
  const reversed = [{ ...points[2], time: 1000 }, { ...points[1], time: 11000 }, { ...points[0], time: 21000 }];
  assert.equal(getActivityPlaybackPositions({ ...options, tracks: [{ points: reversed }] })[0].sign, -1);
});
