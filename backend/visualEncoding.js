import { getActivityType } from "./activityClassifier.js";
import { getImpressionType } from "./impressionClassifier.js";

// Okabe-Ito-derived colors remain distinguishable without relying on red/green alone.
export const AGE_STYLES = Object.freeze({
  C: { label: "中学生以下", color: "#6ecbf2", soft: "#c6edff" },
  H: { label: "高校生", color: "#48b9c7", soft: "#b9eaf0" },
  U: { label: "大学生", color: "#3aa58f", soft: "#b6e5da" },
  Y: { label: "若い社会人", color: "#bd765d", soft: "#e9c1b4" },
  A: { label: "中高年", color: "#d85f55", soft: "#f2b8b2" },
  S: { label: "高齢者", color: "#ad3f55", soft: "#e7a9b6" },
  MX: { label: "複数年齢", color: "#9a70c4", soft: "#d9c7eb" },
  UN: { label: "不明", color: "#b8c4cc", soft: "#e5edf2" },
  OBJ: { label: "物の記録", color: "#ffffff", soft: "#e8eef2" },
});

export const VISUAL_MODES = Object.freeze([
  { id: "attribute", label: "年齢", description: "色＝年齢、形＝グループ" },
  { id: "activity", label: "行動", description: "色＝行動、形＝グループ" },
  { id: "impression", label: "観察者印象", description: "色＝観察者印象、形＝グループ" },
]);

export function getObservationVisual(memo, mode = "attribute") {
  if (!memo?.isPeople) return { ...AGE_STYLES.OBJ, id: "object", shape: "OBJ" };
  const source = mode === "activity"
    ? getActivityType(memo)
    : mode === "impression"
      ? getImpressionType(memo)
      : AGE_STYLES[memo.ageCategory || memo.category] || AGE_STYLES.UN;
  return {
    ...source,
    id: source.id || memo.ageCategory || memo.category || "UN",
    shape: memo.groupCategory || "UN",
  };
}
