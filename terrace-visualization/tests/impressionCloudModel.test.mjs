/** Tests how saved impressions are grouped for display. */
import test from "node:test";
import assert from "node:assert/strict";
import { summarizePlaceImpressions } from "../js/impressionCloudModel.js";

test("only recorded impressions appear, with repeated phrases counted once per record and place", () => {
  const records = [
    { placeCodes: ["TR-01", "TR-01", "TR-02"], impression: "にぎやか、にぎやか。落ち着く" },
    { placeCodes: ["TR-01"], impression: "にぎやか" },
    { placeCodes: ["TR-03"], impression: "静か" },
    { placeCodes: ["TR-02"], impression: "", activity: "会話" },
  ];
  const cloud = summarizePlaceImpressions(records, new Set(["TR-01", "TR-02"]));
  assert.deepEqual(cloud.get("TR-01"), [{ text: "にぎやか", count: 2 }, { text: "落ち着く", count: 1 }]);
  assert.deepEqual(cloud.get("TR-02").map(({ text }) => text).sort(), ["にぎやか", "落ち着く"]);
  assert.equal(cloud.has("TR-03"), false);
});

test("up to seven distinct saved phrases fit in a place cloud", () => {
  const records = [{ placeCodes: ["TR-01"], impression: "静か、楽しそう、落ち着く、寒そう、にぎやか、忙しそう、安心、うれしそう" }];
  assert.equal(summarizePlaceImpressions(records, new Set(["TR-01"])).get("TR-01").length, 7);
});
