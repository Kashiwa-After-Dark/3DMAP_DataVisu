/** ファイル概要: テラスの観察記録をサンキー図の4段にまとめる。 */
import { classifyImpression } from "../../backend/impressionClassifier.js";

export const SANKEY_STAGES = ["who", "where", "action", "feeling"];
const PEOPLE = [
  ["student", "学生", "#9fdbbf", /学生|中学生|高校生|大学生|専門学校生/u],
  ["worker", "社会人", "#f6c57e", /社会人|会社員|サラリーマン/u],
  ["occupation", "その他の職種・役割", "#d8a4ce", /警備|警察関係者|演奏者|家事従事者/u],
  ["other", "その他・職種不明", "#a4aead", /./u],
];
const ACTIVITY_ORDER = [
  "rest_phone_wait", "food_shopping", "movement", "conversation", "call", "filming",
  "skateboard", "performance", "security", "solicitation", "ナンパ", "その他", "口論", "protest",
];
const EMOTION = [
  ["positive", "ポジティブ", "#f5aa84"],
  ["neutral", "中立", "#d6ca9d"],
  ["negative", "ネガティブ", "#85aedc"],
  ["unknown", "未記録・判定保留", "#8e969a"],
];
const ACTIVITY_COLORS = ["#a9d4ac", "#c3d78f", "#81d6cd", "#90c1e6", "#a7b4db", "#b6a1db",
  "#dbacde", "#d2a8b9", "#c3c3ad", "#e3ab73", "#dfaa8a", "#a6a7a8", "#ed896a", "#e16777"];

const activityRank = ({ id, label }) => {
  if (/喧嘩|口論/u.test(label)) return ACTIVITY_ORDER.indexOf("口論");
  const rank = ACTIVITY_ORDER.indexOf(id);
  const labelRank = ACTIVITY_ORDER.indexOf(label);
  return rank >= 0 ? rank : labelRank >= 0 ? labelRank : ACTIVITY_ORDER.indexOf("その他");
};
const placeRank = (code) => /^TR-?(\d+)$/u.exec(code)?.[1] ?? Number.MAX_SAFE_INTEGER;

export function buildTerraceSankey(records, catalog) {
  const places = new Map(catalog.map(({ code, name, color }) =>
    [code, { name: name === `意味名未登録（${code}）` ? "意味名未登録" : name, color }]));
  const nodes = new Map(), links = new Map(), paths = new Map();
  const observations = [];
  const put = (stage, key, label, color, order) => {
    const id = `${stage}:${key}`;
    if (!nodes.has(id)) nodes.set(id, { id, stage, label, color, order });
    return id;
  };
  for (const [code, { name, color }] of places) put(1, code, name, color, Number(placeRank(code)));
  for (const record of records) {
    if (record.isObject) continue;
    const codes = [...new Set(record.placeCodes)];
    if (!codes.length) continue;
    const role = PEOPLE.findIndex(([key, , , pattern]) => key === "other" || record.personTags.some((tag) => pattern.test(tag)));
    const [roleId, roleLabel, roleColor] = PEOPLE[role];
    const person = put(0, roleId, roleLabel, roleColor, role);
    observations.push(record);
    const emotion = classifyImpression(record);
    const feeling = EMOTION.findIndex(([id]) => id === emotion);
    const [feelingId, feelingLabel, feelingColor] = EMOTION[feeling];
    const end = put(3, feelingId, feelingLabel, feelingColor, feeling);
    const tags = [...new Map(record.activityCategories.map((tag) => [tag.id, tag])).values()];
    if (!tags.length) tags.push({ id: "untagged", label: "タグなし" });
    const value = 1 / (codes.length * tags.length);
    for (const code of codes) for (const tag of tags) {
      const place = places.get(code);
      const location = put(1, code, place?.name ?? "意味名未登録", place?.color ?? "#a6a7a8", Number(placeRank(code)));
      const rank = activityRank(tag);
      const activity = put(2, tag.id, tag.label, ACTIVITY_COLORS[rank], rank);
      const chain = [person, location, activity, end];
      const key = JSON.stringify(chain);
      const flow = paths.get(key) ?? { nodes: chain, links: [], observations: [] };
      flow.observations.push(record);
      for (let index = 0; index < chain.length - 1; index++) {
        const [source, target] = chain.slice(index, index + 2);
        const id = JSON.stringify([source, target]);
        if (!links.has(id)) links.set(id, { id, source, target, value: 0, threads: [] });
        const band = links.get(id);
        band.value += value;
        if (index === 0) band.threads.push(value);
        if (!paths.has(key)) flow.links.push(id);
      }
      paths.set(key, flow);
    }
  }
  return { count: observations.length, observations, nodes: [...nodes.values()], links: [...links.values()], paths: [...paths.values()] };
}

export function sankeyObservations(graph, selection) {
  if (!selection) return graph.observations;
  if (selection.kind === "record") return [selection.record];
  const matching = new Set();
  for (const path of graph.paths) {
    const ids = selection.kind === "node" ? path.nodes : path.links;
    if (ids.includes(selection.id)) for (const record of path.observations) matching.add(record);
  }
  return graph.observations.filter((record) => matching.has(record));
}

const fields = ["subject", "place", "activity", "impression"];

export function sankeyRecordTracks(graph) {
  const labels = new Map(), tracks = [];
  for (const path of graph.paths) for (const record of path.observations) {
    const original = typeof record.desc === "string" ? record.desc.split("、") : [];
    const parts = fields.map((field, stage) => {
      const value = original.length === 4 ? original[stage] : record[field];
      const fragments = typeof value === "string" ? value.split(/[、,，]/u).map((part) => part.trim()).filter(Boolean) : [];
      return (fragments.length ? fragments : [""]).map((text) => {
        const category = path.nodes[stage];
        const id = JSON.stringify([category, text]);
        if (!labels.has(id)) labels.set(id, { id, category, stage, text });
        return id;
      });
    });
    // Join the ordered fragments without multiplying them into a Cartesian product.
    const offsets = parts.map(() => 0);
    while (true) {
      tracks.push({ id: tracks.length, record, nodes: path.nodes, labels: parts.map((labels, stage) => labels[offsets[stage]]) });
      const boundaries = parts.map((labels, stage) => (offsets[stage] + 1) / labels.length);
      const next = Math.min(...boundaries);
      if (next >= 1) break;
      for (const [stage, boundary] of boundaries.entries()) if (boundary === next) offsets[stage]++;
    }
  }
  return { labels, tracks };
}

export function selectSankeyTracks(tracks, selection) {
  if (!selection) return tracks;
  return tracks.filter((track) => {
    if (selection.kind === "track") return track.id === selection.id;
    if (selection.kind === "label") return track.labels.includes(selection.id);
    return track.nodes.includes(selection.id);
  });
}
