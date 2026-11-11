import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MODEL_URL, FOCUS_OBJECTS, CONTEXT_OBJECTS, HIDDEN_OBJECTS, MODEL_GEOREFERENCED } from "../js/config.js";

const bytes = readFileSync(new URL(MODEL_URL));
const jsonLength = bytes.readUInt32LE(12);
const model = JSON.parse(bytes.subarray(20, 20 + jsonLength));

test("terrace uses the supplied standalone, complete embedded GLB", () => {
  assert.ok(MODEL_URL.endsWith("/3Dmodel/teras.glb"));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.toString("ascii", 16, 20), "JSON");
  assert.ok(20 + jsonLength < bytes.length);
  assert.ok(model.buffers.every((buffer) => !buffer.uri));
  assert.ok((model.images || []).every((image) => !image.uri));
  for (const view of model.bufferViews) assert.ok((view.byteOffset || 0) + view.byteLength <= model.buffers[view.buffer].byteLength);
});

test("floor, station, plaza and hidden helper match actual node names", () => {
  for (const name of [...FOCUS_OBJECTS, ...CONTEXT_OBJECTS, ...HIDDEN_OBJECTS]) {
    assert.ok(model.nodes.some((node) => node.name === name), `Missing ${name}`);
  }
  for (const name of FOCUS_OBJECTS) {
    const node = model.nodes.find((node) => node.name === name);
    assert.ok(Number.isInteger(node.mesh));
    for (const primitive of model.meshes[node.mesh].primitives) {
      const accessor = model.accessors[primitive.attributes.POSITION];
      assert.ok(accessor.count > 0);
      assert.ok(accessor.min.every(Number.isFinite));
      assert.ok(accessor.max.every(Number.isFinite));
      assert.ok(accessor.max[0] > accessor.min[0]);
      assert.ok(accessor.max[2] > accessor.min[2]);
    }
  }
});

test("named furniture remains available and an uncalibrated model never claims georeferencing", () => {
  assert.ok(model.nodes.some((node) => node.name.startsWith("ベンチ")));
  assert.ok(model.nodes.some((node) => node.name.startsWith("エスカレーター")));
  assert.ok(model.nodes.some((node) => node.name.startsWith("植栽")));
  assert.equal(MODEL_GEOREFERENCED, false);
  assert.equal(model.nodes.find((node) => node.name === "0-tr-00").mesh, undefined);
});
