export const ACTIVITY_TYPES = Object.freeze([
  { id: "conversation", label: "会話", code: "TALK", color: "#00e5ff" },
  { id: "waiting", label: "待機", code: "WAIT", color: "#f0e442" },
  { id: "food", label: "飲食", code: "FOOD", color: "#ff9f1c" },
  { id: "rest", label: "休憩", code: "REST", color: "#00d084" },
  { id: "play", label: "遊び・表現", code: "PLAY", color: "#e879f9" },
  { id: "phone", label: "スマホ・電話", code: "PHONE", color: "#a78bfa" },
  { id: "work", label: "仕事", code: "WORK", color: "#ff6b6b" },
  { id: "passing", label: "移動", code: "MOVE", color: "#60a5fa" },
  { id: "other", label: "その他", code: "OTHER", color: "#b8c4cc" },
]);

const ACTIVITY_RULES = [
  ["conversation", /(?:雑談|会話|話し|話す|話して|談笑|交流|団らん|井戸端|おしゃべり|喋|chat|talk)/iu],
  ["food", /(?:飲食|食べ|食事|飲み|飲ん|酒|居酒屋|バー|カフェ|たい焼き|弁当|買って|restaurant|bar|cafe|eat|drink)/iu],
  ["phone", /(?:スマホ|携帯|電話|TikTok|動画|撮影|phone|cellphone)/iu],
  ["play", /(?:遊び|遊ん|ゲーム|スポーツ|スケボー|踊|歌|弾き語り|演奏|game|play)/iu],
  ["work", /(?:キャッチ|呼び込み|配達|警備|仕事|勤務|清掃|販売|勧誘|work)/iu],
  ["rest", /(?:休憩|休ん|座り|座って|腰掛|くつろ|たむろ|hanging out|sitting|rest)/iu],
  ["waiting", /(?:待ち|待って|待機|立って|並ん|滞留|ぼーっと|なにもしていない|何もしていない|waiting|standing|queue)/iu],
  ["passing", /(?:通過|歩き|歩い|歩いて|帰り|帰る|向か|移動|散歩|自転車|漕い|走り|走る|walking|moving|bicycle)/iu],
];

export function classifyActivity(memo) {
  const text = `${memo.activity || ""} ${memo.name || ""} ${memo.desc || ""}`;
  return ACTIVITY_RULES.find(([, pattern]) => pattern.test(text))?.[0] || "other";
}

export function getActivityType(memo) {
  const id = classifyActivity(memo);
  return ACTIVITY_TYPES.find((activity) => activity.id === id) || ACTIVITY_TYPES.at(-1);
}
