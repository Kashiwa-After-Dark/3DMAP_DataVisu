/**
 * ファイル概要: テラス模型の表示専用の材質設定とパーツの役割を定義する。
 */
import { placeRegionCode } from "./placeRegionNames.js";
export const CONTEXT_STYLE = Object.freeze({
  faceColor: "#668995", faceOpacity: 0.18,
  edgeColor: "#93bdc6", edgeOpacity: 0.34, edgeAngle: 38,
});
export const CONSTRUCTION_STYLE = Object.freeze({ faceColor: "#907354", faceOpacity: 0.2, edgeColor: "#e4b782", edgeOpacity: 0.85, edgeAngle: 25 });
export const WALKWAY_ROOF_OPACITY = 0.15;
export const STATION_MONITOR_NAME = "big_moniter";

export function appearanceRole(names, materialName = "") {
  if (names.some((name) => placeRegionCode(name) || /^place-region-overlay-TR-\d{2}$/u.test(name))) return "region";
  if (names.includes("Construction_Area")) return "construction";
  if (names.includes(STATION_MONITOR_NAME)) return "station-monitor";
  if (names.some((name) => ["駅", "プラザ", "Kashiwa_Station", "Sky_Plaza"].includes(name))) return "context";
  if (names.some((name) => ["デッキ床", "Deck_Floor"].includes(name))) return "floor";
  if (names.includes("Covered_Walkway") && /Translucent promenade roof$/i.test(materialName)) return "walkway-roof";
  return "detail";
}
