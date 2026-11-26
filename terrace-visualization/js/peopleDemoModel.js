/**
 * ファイル概要: 元の行動文を保持し、行動とイラストに応じた代表表示を選ぶ。人数・分類データは変更しない。
 */
import { illustrationForRecord } from "./peopleIllustrations.js?v=20261118-tagged-protest1";

export function motionForActivity(activity) {
  if (/スケボー|スケートボード/u.test(activity) && !/見て|見学|していない|してない/u.test(activity)) return "skate";
  if (/スマホ|電話|TikTok/iu.test(activity)) return "phone";
  if (/雑談|喋/u.test(activity)) return "chat";
  return "idle";
}

export function representativePeople(records, availableCodes) {
  const codes = new Set(availableCodes);
  const areas = new Map();
  for (const record of records) {
    if (record.isObject) continue;
    const activity = typeof record.activity === "string" ? record.activity.trim() : "";
    for (const code of new Set(record.placeCodes || [])) {
      if (!codes.has(code)) continue;
      const illustration = illustrationForRecord(record, code);
      const label = illustration === "protest" ? "抗議活動" : activity || (illustration === "bench-couple" ? "カップル・滞在" : "");
      if (!label) continue;
      if (!areas.has(code)) areas.set(code, new Map());
      const actions = areas.get(code);
      const key = illustration === "bench-couple" ? illustration : JSON.stringify([label, illustration]);
      if (!actions.has(key)) actions.set(key, { label, illustration, count: 0 });
      actions.get(key).count += 1;
    }
  }
  return [...areas].sort(([a], [b]) => a.localeCompare(b)).flatMap(([code, actions]) => {
    const ranked = [...actions.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
    const limit = code === "TR-05" ? 3 : 2;
    const protest = ranked.find((row) => row.illustration === "protest");
    // Only the tagged records produce a protest figure; ordinary actions retain their own poses.
    if (protest) ranked.splice(ranked.indexOf(protest), 1);
    const couple = ranked.find((row) => row.illustration === "bench-couple");
    const chosen = couple ? [couple] : code === "TR-05" ? [] : ranked.slice(0, 1);
    // Show each available supplied illustration once before generic fallback poses.
    for (const row of ranked) if (chosen.length < limit && row.illustration && !chosen.some((other) => other.illustration === row.illustration)) chosen.push(row);
    for (const row of ranked) if (chosen.length < limit && !chosen.includes(row)) chosen.push(row);
    if (protest) chosen.unshift(protest);
    return chosen.slice(0, limit).map((row, index) => ({ ...row, code, index, motion: row === couple || row === protest ? "idle" : motionForActivity(row.label) }));
  });
}

export function benchRepresentatives(records) {
  const benchRecords = records.filter((record) => record.placeMeanings?.some(({ code, meaning }) =>
    code === "TR-05" && meaning.trim() === "ベンチ"));
  const seated = representativePeople(benchRecords, ["TR-05"]).filter(({ illustration }) => illustration?.startsWith("bench-"));
  // Place distinct poses first, then reuse only when more matching observations exist.
  return [...seated, ...seated.flatMap((item) => Array(Math.min(2, item.count - 1)).fill(item))];
}

export function triangleMotion(triangle, phase, moving = true, anchor = [1 / 3, 1 / 3], amplitude = 0.18) {
  const a = moving ? anchor[0] + amplitude * Math.cos(phase) : anchor[0];
  const b = moving ? anchor[1] + amplitude * Math.sin(phase) : anchor[1];
  const weights = [a, b, 1 - a - b];
  return { x: triangle.reduce((sum, p, i) => sum + p.x * weights[i], 0), z: triangle.reduce((sum, p, i) => sum + p.z * weights[i], 0) };
}
