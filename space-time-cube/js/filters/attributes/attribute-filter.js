/**
 * ファイル概要: 年齢、グループ、性別、人数、データソース、キーワードの条件を判定する。
 */
const AGE_CATEGORIES = new Set(["C", "H", "U", "Y", "A", "S"]);

export function matchesAttributeFilter(memo, state) {
  if (memo.category === "OBJ") {
    if (!state.groupCategories.has("OBJ")) return false;
  } else {
    const ageCategory = memo.ageCategory || memo.category || "UN";
    const groupCategory = memo.groupCategory || "UN";
    const isMixed = ageCategory === "MX" || groupCategory === "MX";
    if (isMixed) {
      if (!state.groupCategories.has("MX")) return false;
    } else {
      if (AGE_CATEGORIES.has(ageCategory) && !state.ageCategories.has(ageCategory)) return false;
      if (!state.groupCategories.has(groupCategory)) return false;
    }
  }

  if (!state.genders.has(memo.gender)) return false;
  if (!state.sources.has(memo.sourceId)) return false;
  if ((memo.count || 0) < state.minCount) return false;
  if ((memo.count || 0) > state.maxCount) return false;
  if (!state.keyword) return true;

  const searchableText = `${memo.name} ${memo.desc} ${memo.sourceLabel} ${memo.symbol}`.toLowerCase();
  return searchableText.includes(state.keyword);
}
