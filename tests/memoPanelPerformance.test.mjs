/**
 * ファイル概要: カードデッキの不要な再描画防止を自動確認する。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { renderMemoPanel } from "../space-time-cube/js/data-display/memo-panel.js";

class ElementStub {
  children = [];
  attributes = new Map();
  style = { setProperty() {} };
  classList = { toggle() {}, remove() {} };
  addEventListener() {}
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

test("unchanged card data is not sorted or rebuilt on every replay tick", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { addEventListener() {}, createElement: () => new ElementStub() };
  try {
    let iterations = 0;
    const memos = Array.from({ length: 460 }, (_, i) => ({ time: i, name: `memo-${i}`, sourceLabel: "survey", isPeople: true, gender: "U", count: 1, category: "UN" }));
    const originalIterator = memos[Symbol.iterator];
    memos[Symbol.iterator] = function* () { iterations++; yield* originalIterator.call(this); };
    const list = new ElementStub();
    const options = { list, memos, activeMemo: null, suppressedMemo: null, categories: { UN: { color: "#aabbcc", label: "Unknown" } }, formatTime: String };
    assert.equal(renderMemoPanel(options), true);
    const nodes = [...list.children];
    for (let i = 0; i < 1000; i++) assert.equal(renderMemoPanel(options), false);
    assert.equal(iterations, 1);
    assert.deepEqual(list.children, nodes);
    assert.equal(renderMemoPanel({ ...options, activeMemo: memos[100] }), true);
    assert.equal(iterations, 1);
    assert.equal(list.children[359].attributes.get("aria-pressed"), "true");
    assert.equal(renderMemoPanel({ ...options, activeMemo: memos[100], visualKey: "subject" }), true);
    assert.notEqual(list.children[0], nodes[0]);
    assert.equal(iterations, 1);
  } finally {
    globalThis.document = previousDocument;
  }
});
