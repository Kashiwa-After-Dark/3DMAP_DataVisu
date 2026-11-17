/**
 * ファイル概要: ゲーム風の表示に使う色調、照明、距離に応じた霞を定義する。
 */
export const GAME_STYLE = Object.freeze({
  filter: "saturate(0.74) sepia(0.12) contrast(1.04)",
  exposure: 1.04,
  skyColor: "#dce7ee",
  groundColor: "#68777f",
  sunColor: "#fff0db",
  fogColor: "#bcc9cb",
  fillIntensity: 1.35,
  sunIntensity: 2.6,
  roughness: 0.82,
  maxMetalness: 0.18,
});

export function gameFogRange(radius) {
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 1;
  return { near: safeRadius * 3, far: safeRadius * 10 };
}
