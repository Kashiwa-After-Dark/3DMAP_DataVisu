export const IMPRESSION_TYPES = Object.freeze([
  { id: "positive", label: "肯定的", code: "POS", color: "#ffb000" },
  { id: "neutral", label: "中立・落ち着き", code: "NEU", color: "#f4f7fa" },
  { id: "negative", label: "否定的・懸念", code: "NEG", color: "#4ea5ff" },
  { id: "unknown", label: "判定保留", code: "UN", color: "#aab8c2" },
]);

const IMPRESSION_RULES = [
  ["positive", /(?:楽し|嬉し|喜|笑顔|いい雰囲気|良い雰囲気|仲良|にぎやか|賑やか|快適|面白|活気|幸せ|楽そう)/u],
  ["negative", /(?:大変|つまらな|寒そう|暑そう|うるさ|心配|寂し|感じ悪|怖|疲れ|不快|邪魔|汚い|危な|困|気の毒|かわいそう|不安|退屈)/u],
  ["neutral", /(?:落ち着|普通|静か|穏やか|特になし|何も感じない|自然)/u],
];

export function classifyImpression(memo) {
  const text = String(memo.impression || "").trim();
  if (!text) return "unknown";
  return IMPRESSION_RULES.find(([, pattern]) => pattern.test(text))?.[0] || "unknown";
}

export function getImpressionType(memo) {
  const id = classifyImpression(memo);
  return IMPRESSION_TYPES.find((impression) => impression.id === id) || IMPRESSION_TYPES.at(-1);
}
