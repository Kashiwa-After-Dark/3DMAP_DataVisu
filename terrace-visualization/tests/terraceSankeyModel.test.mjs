/** ファイル概要: サンキー図の並び順と観察記録の重みを確認する。 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildPlaceCatalog } from "../js/placeSummaryModel.js";
import { buildTerraceSankey, sankeyObservations, sankeyRecordTracks, selectSankeyTracks } from "../js/terraceSankeyModel.js";

const category = (id, label) => ({ id, label });
const row = (personTags, placeCodes, activityCategories, impression, more = {}) => ({
  personTags, placeCodes, activityCategories, impression,
  placeMeanings: [{ code: "TR-02", meaning: "通路" }, { code: "TR-10", meaning: "店舗前" }], ...more,
});

test("selecting a node or strand returns original matching records without repeating multi-tag observations", () => {
  const first = row(["学生"], ["TR-02"], [category("movement", "移動"), category("call", "通話")], "かなり急いでいるように見えた。");
  const second = row(["学生"], ["TR-02"], [category("call", "通話")], "少し心配になった。");
  const unrelated = row(["社会人"], ["TR-10"], [category("call", "通話")], "");
  const records = [first, second, unrelated];
  const graph = buildTerraceSankey(records, buildPlaceCatalog(records));
  const strand = graph.links.find(({ source, target }) => source === "0:student" && target === "1:TR-02");
  assert.deepEqual(strand.threads, [0.5, 0.5, 1]);
  assert.deepEqual(sankeyObservations(graph, { kind: "link", id: strand.id }), [first, second]);
  assert.deepEqual(sankeyObservations(graph, { kind: "node", id: "2:movement" }), [first]);
  assert.deepEqual(sankeyObservations(graph, { kind: "record", record: second }), [second]);
  assert.deepEqual(sankeyObservations(graph, null), records);
});

test("the full place catalog remains present in a sparse or empty time interval", () => {
  const first = row(["学生"], ["TR-02"], [category("movement", "移動")], "");
  const later = row(["学生"], ["TR-10"], [category("call", "通話")], "");
  const catalog = buildPlaceCatalog([first, later]);
  for (const records of [[first], []]) {
    const graph = buildTerraceSankey(records, catalog);
    assert.deepEqual(graph.nodes.filter(({ stage }) => stage === 1).map(({ id }) => id), ["1:TR-02", "1:TR-10"]);
    assert.ok(!graph.links.some(({ source, target }) => [source, target].includes("1:TR-10")));
  }
});

test("raw labels live in their own stage and highlighting never leaks across a shared category", () => {
  const first = row(["学生"], ["TR-02"], [category("food_shopping", "飲食/買い物")], "楽しそう", {
    desc: "大学生、通路、買い物、楽しそう",
  });
  const second = row(["学生"], ["TR-02"], [category("food_shopping", "飲食/買い物")], "落ち着いてる", {
    desc: "高校生、通路、食事、落ち着いてる",
  });
  const third = { ...first };
  const records = [first, second, third];
  const { labels, tracks } = sankeyRecordTracks(buildTerraceSankey(records, buildPlaceCatalog(records)));
  assert.equal(tracks.length, 3);
  const shopping = [...labels.values()].find(({ text }) => text === "買い物");
  assert.equal(shopping.stage, 2);
  assert.equal(shopping.category, "2:food_shopping");
  assert.equal([...labels.values()].filter(({ text }) => text === "通路").length, 1);
  const selected = selectSankeyTracks(tracks, { kind: "label", id: shopping.id });
  assert.deepEqual(selected.map(({ record }) => record), [first, third]);
  assert.deepEqual(selectSankeyTracks(tracks, { kind: "track", id: selected[0].id }), [selected[0]]);
  assert.ok(!selected.some(({ record }) => record === second));
});

test("groups measured roles, keeps meaning names and respects numeric code and display order", () => {
  const records = [
    row(["警察関係者"], ["TR-10"], [category("custom-id", "喧嘩")], "不安"),
    row(["社会人"], ["TR-02"], [category("movement", "移動")], "普通"),
    row(["高校生"], ["TR-02"], [category("rest_phone_wait", "休憩/スマホ/待機")], "楽しそう"),
    row(["子供"], ["TR-10"], [category("protest", "抗議活動")], ""),
    row([], ["TR-10"], [], "", { isObject: true }),
  ];
  const graph = buildTerraceSankey(records, buildPlaceCatalog(records));
  const labels = (stage) => graph.nodes.filter((node) => node.stage === stage).sort((a,b) => a.order-b.order).map(({ label }) => label);
  assert.equal(graph.count, 4);
  assert.deepEqual(labels(0), ["学生", "社会人", "その他の職種・役割", "その他・職種不明"]);
  assert.deepEqual(labels(1), ["通路", "店舗前"]);
  assert.deepEqual(labels(2), ["休憩/スマホ/待機", "移動", "喧嘩", "抗議活動"]);
  assert.deepEqual(labels(3), ["ポジティブ", "中立", "ネガティブ", "未記録・判定保留"]);
});

test("a multi-tag multi-place observation still adds only one observation at each tier", () => {
  const records = [row(["学生"], ["TR-10", "TR-02", "TR-02"], [
    category("filming", "撮影"), category("filming", "撮影"), category("movement", "移動"),
  ], "楽しそう", { emotionAnalysis: { experiencer: "observer", polarity: "negative" } })];
  const graph = buildTerraceSankey(records, buildPlaceCatalog(records));
  assert.equal(graph.paths.length, 4);
  assert.ok(graph.nodes.some(({ id }) => id === "3:negative"));
  for (const stage of [0, 1, 2]) {
    assert.equal(graph.links.filter(({ source }) => source.startsWith(`${stage}:`))
      .reduce((sum, { value }) => sum + value, 0), 1);
  }
});
