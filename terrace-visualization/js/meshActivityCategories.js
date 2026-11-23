/** Finer activity labels for the 2D color grid only; stored tags remain unchanged. */
const details = [
  ["phone", "スマホ操作", "#ffa64f", "rest_phone_wait", /スマホ/],
  ["waiting", "待ち合わせ・待機", "#ffe46c", "rest_phone_wait", /待って|待機|待ち合わせ/],
  ["rest", "休憩・ぼんやり", "#c49d69", "rest_phone_wait", /ぼーっと|何もしていない|なにもしていない|休憩/],
  ["sleep", "睡眠", "#927bd9", "rest_phone_wait", /寝て|睡眠/],
  ["argument", "口論", "#ff5c50", "conversation", /口論|言い争/],
  ["photo", "写真・自撮り", "#c264ff", "filming", /写真|自撮り|カメラ/],
  ["social_video", "SNS動画撮影", "#f187d6", "filming", /tiktok.*(?:撮|と)|動画/i],
  ["walking", "歩行・帰宅", "#74db9d", "movement", /歩|帰宅/],
  ["running", "走行", "#26ae81", "movement", /走/],
  ["exercise", "体操・運動", "#d1dc55", "skateboard", /体操|筋トレ|ストレッチ/],
  ["dance", "ダンス", "#f368b7", "performance", /踊|ダンス/],
  ["music", "歌・演奏", "#ff36ef", "performance", /演奏|弾き語り|歌って|路上ライブ|ギター|ハーモニカ/],
  ["food", "飲食", "#ffc852", "food_shopping", /食|たべ|飲ん|お菓子/],
  ["audience", "演奏鑑賞", "#8099ff", null, /(?:演奏|弾き語り|歌|ライブ)(?:を)?(?:聞|聴|鑑賞)/],
  ["study", "勉強", "#79c9ff", null, /勉強|学習/],
  ["makeup", "メイク", "#ff9cb1", null, /メイク|化粧/],
  ["affection", "交流・スキンシップ", "#82e5d4", null, /手をつな|頭を撫|頭をなで/],
  ["watching", "周囲を眺める", "#8ca9cd", null, /眺め/],
  ["crying", "泣く", "#677ce7", null, /泣いて|泣く/],
];

export const MESH_DETAIL_LEGEND = details.map(([tag, label, color]) => ({ tag, label, color }));

export function meshActivityCategories(record) {
  const tags = record.activityCategories ?? [];
  const activity = record.activity ?? "";
  if (!tags.length) {
    const match = details.find(([, , , parent, pattern]) => (!parent || parent === "rest_phone_wait") && pattern.test(activity));
    return match ? [{ id: match[0], label: match[1] }] : tags;
  }
  return tags.flatMap((tag) => {
    const matches = details.filter(([, , , parent, pattern]) => parent === tag.id && pattern.test(activity));
    return matches.length ? matches.map(([id, label]) => ({ id, label })) : [tag];
  });
}
