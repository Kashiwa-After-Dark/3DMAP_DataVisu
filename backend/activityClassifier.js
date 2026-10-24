export const ACTIVITY_TYPES = Object.freeze([
  { id: "conversation", label: "会話", code: "TALK", color: "#52c7d9" },
  { id: "waiting", label: "待機", code: "WAIT", color: "#d9ad55" },
  { id: "food", label: "飲食", code: "FOOD", color: "#e78665" },
  { id: "rest", label: "休憩", code: "REST", color: "#6fc59b" },
  { id: "play", label: "遊び", code: "PLAY", color: "#c782b8" },
  { id: "passing", label: "通過", code: "MOVE", color: "#7f9fca" },
  { id: "other", label: "その他", code: "OTHER", color: "#718994" },
]);

const ACTIVITY_RULES = [
  ["conversation", /(?:会話|話し|話す|話して|談笑|交流|団らん|井戸端|おしゃべり|喋|キャッチ|chat|talk)/iu],
  ["food", /(?:飲食|食べ|食事|飲み|飲ん|酒|居酒屋|バー|カフェ|たい焼き|弁当|買って|restaurant|bar|cafe|eat|drink)/iu],
  ["play", /(?:遊び|遊ん|ゲーム|スポーツ|子ども|子供|game|play)/iu],
  ["rest", /(?:休憩|休ん|座り|座って|腰掛|くつろ|たむろ|hanging out|sitting|rest)/iu],
  ["waiting", /(?:待ち|待って|待機|立って|並ん|滞留|waiting|standing|queue)/iu],
  ["passing", /(?:通過|歩き|歩い|帰り|帰る|向か|移動|散歩|自転車|走り|walking|moving|bicycle)/iu],
];

export function classifyActivity(memo) {
  const text = `${memo.name || ""} ${memo.desc || ""}`;
  return ACTIVITY_RULES.find(([, pattern]) => pattern.test(text))?.[0] || "other";
}
