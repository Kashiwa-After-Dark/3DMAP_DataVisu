import test from "node:test";
import assert from "node:assert/strict";
import { activityLayerVisibility, createActivityLayerFilter } from "../time-space-graph/js/features/activityLayerFilter.js";

test("layer modes independently control routes and stationary activity rings", () => {
  assert.deepEqual(activityLayerVisibility(), { directions: true, activities: true });
  assert.deepEqual(activityLayerVisibility("directions"), { directions: true, activities: false });
  assert.deepEqual(activityLayerVisibility("activities"), { directions: false, activities: true });
  assert.deepEqual(activityLayerVisibility("combined"), { directions: true, activities: true });
});

test("layer buttons switch immediately, survive language changes, and ignore repeated selections", () => {
  const previousDocument = globalThis.document;
  const changes = [];
  globalThis.document = { createElement() {
    return { dataset: {}, attributes: {}, children: [], listeners: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, callback) { this.listeners[type] = callback; },
      append(child) { this.children.push(child); },
    };
  } };
  try {
    const control = createActivityLayerFilter((visibility) => changes.push(visibility));
    const [routes, activities, combined] = control.root.children;
    assert.equal(combined.attributes["aria-pressed"], "true");
    routes.listeners.click();
    assert.deepEqual(control.getVisibility(), { directions: true, activities: false });
    assert.equal(routes.attributes["aria-pressed"], "true");
    assert.equal(combined.attributes["aria-pressed"], "false");
    routes.listeners.click();
    assert.equal(changes.length, 1);
    control.setLanguage("en");
    assert.equal(routes.textContent, "Routes only");
    assert.equal(routes.attributes["aria-pressed"], "true");
    activities.listeners.click();
    assert.deepEqual(changes.at(-1), { directions: false, activities: true });
    combined.listeners.click();
    assert.deepEqual(changes.at(-1), { directions: true, activities: true });
  } finally { globalThis.document = previousDocument; }
});
