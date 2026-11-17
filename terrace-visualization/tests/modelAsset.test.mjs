/**
 * ファイル概要: テラス3Dモデルの参照先とファイル存在を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MODEL_URL, FOCUS_OBJECTS, CONTEXT_OBJECTS, MODEL_GEOREFERENCED } from "../js/config.js";

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
  for (const name of [...FOCUS_OBJECTS, ...CONTEXT_OBJECTS, "Construction_Area"]) {
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
  assert.ok(model.nodes.some((node) => node.name.startsWith("Benches_")));
  assert.ok(model.nodes.some((node) => node.name.startsWith("Escalator_")));
  assert.ok(model.nodes.some((node) => node.name.startsWith("Planting_")));
  assert.equal(MODEL_GEOREFERENCED, false);
  assert.equal(model.nodes.find((node) => node.name === "0-tr-00").mesh, undefined);
});
test("all ten place-code planes are included in the supplied model", () => {
  for (let index = 1; index <= 10; index += 1) {
    const name = `TR-${String(index).padStart(2, "0")}`;
    const node = model.nodes.find((node) => node.name === name);
    assert.ok(node && Number.isInteger(node.mesh), `Missing region ${name}`);
    for (const primitive of model.meshes[node.mesh].primitives) {
      const position = model.accessors[primitive.attributes.POSITION];
      assert.equal(position.max[1], position.min[1]);
    }
  }
});

test("floor tile colors are embedded and mapped to every floor vertex", () => {
  const node = model.nodes.find((node) => node.name === "Deck_Floor");
  for (const primitive of model.meshes[node.mesh].primitives) {
    const uv = model.accessors[primitive.attributes.TEXCOORD_0];
    assert.ok(uv, "Floor requires texture coordinates");
    assert.equal(uv.count, model.accessors[primitive.attributes.POSITION].count);
    const material = model.materials[primitive.material];
    const texture = model.textures[material.pbrMetallicRoughness.baseColorTexture.index];
    const image = model.images[texture.source];
    assert.equal(image.mimeType, "image/png");
    assert.ok(Number.isInteger(image.bufferView));
    assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor ?? [1, 1, 1, 1], [1, 1, 1, 1]);
  }
});


test("procedural wood and roof surfaces use embedded GLB textures", () => {
  assert.equal(model.images.length, 6);
  for (const name of ["Benches_Area_A", "Benches_Hexagonal_Opening", "Sky_Plaza", "Kashiwa_Station"]) {
    const node = model.nodes.find((node) => node.name === name);
    const textured = model.meshes[node.mesh].primitives.filter((primitive) => model.materials[primitive.material].pbrMetallicRoughness?.baseColorTexture);
    assert.ok(textured.length, `Missing baked material: ${name}`);
    for (const primitive of textured) assert.ok(Number.isInteger(primitive.attributes.TEXCOORD_0));
  }
  const floor = model.nodes.find((node) => node.name === "Deck_Floor");
  assert.ok(model.materials[model.meshes[floor.mesh].primitives[0].material].normalTexture);
});
