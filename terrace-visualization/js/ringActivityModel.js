/** Terrace ring aggregation and visual encoding for published activity categories. */
const TAG_COLORS = new Map([
  ["conversation", "#00eaff"],
  ["call", "#536dff"],
  ["filming", "#c264ff"],
  ["movement", "#00ffaa"],
  ["rest_phone_wait", "#ff8b00"],
  ["food_shopping", "#fff000"],
  ["solicitation", "#ff6035"],
  ["security", "#209bff"],
  ["skateboard", "#9bff00"],
  ["protest", "#ff356b"],
  ["performance", "#ff36ef"],
]);
const EXTRA_COLORS = ["#ff69b4", "#00ffd5", "#ef84ff"];
const UNTAGGED_COLOR = "#c8d0d5";
const TAG_RANK = new Map([...TAG_COLORS.keys()].map((tag, index) => [tag, index]));
const rank = (tag) => tag === null ? TAG_RANK.size + 1 : TAG_RANK.get(tag) ?? TAG_RANK.size;
const tagOrder = (a, b) => rank(a.tag) - rank(b.tag) || a.label.localeCompare(b.label, "ja") || String(a.tag).localeCompare(String(b.tag));
export const RING_DECK_OFFSET = 0.19;
export const RING_LAYER_GAP = 0.12;

export function summarizeRingActivities(records, ringCodes) {
  const summaries = new Map();
  for (const record of records) {
    const tags = new Map((record.activityCategories ?? []).map(({ id, label }) => [id, label]));
    if (!tags.size) tags.set(null, "カテゴリなし");
    for (const code of new Set(record.placeCodes)) {
      if (!ringCodes.has(code)) continue;
      if (!summaries.has(code)) summaries.set(code, new Map());
      const summary = summaries.get(code);
      for (const [tag, label] of tags) {
        if (!summary.has(tag)) summary.set(tag, { tag, label, count: 0 });
        summary.get(tag).count++;
      }
    }
  }
  return summaries;
}

export function activityLegend(summaries) {
  const tags = new Map();
  for (const summary of summaries.values()) for (const [tag, entry] of summary) tags.set(tag, entry);
  let extra = 0;
  return [...tags.values()].sort(tagOrder).map(({ tag, label }) => ({
    tag, label,
    color: tag === null ? UNTAGGED_COLOR : TAG_COLORS.get(tag) ?? EXTRA_COLORS[extra++ % EXTRA_COLORS.length],
  }));
}

export function activityRingRadius(count, maxCount) {
  return count > 0 && maxCount > 0 ? 0.58 * Math.sqrt(count / maxCount) : 0;
}

export function activityRingLayers(summary) {
  return [...summary.values()].sort(tagOrder)
    .map(({ tag, count }, index) => ({ tag, count, offset: index * RING_LAYER_GAP }));
}
