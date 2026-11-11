/**
 * ファイル概要: テラス可視化で使用する対象日、対象ソース、モデルURLを定義する。
 */
export const MODEL_URL = new URL("../../3Dmodel/teras.glb", import.meta.url).href;
export const FOCUS_OBJECTS = Object.freeze(["デッキ床"]);
export const CONTEXT_OBJECTS = Object.freeze(["駅", "プラザ"]);
export const HIDDEN_OBJECTS = Object.freeze(["rout"]);
// The authored model is in local coordinates; no geographic alignment is supplied yet.
export const MODEL_GEOREFERENCED = false;
export const COLORS = Object.freeze({
  background: 0x080d10,
  deck01: 0x72c8bd,
  deck02: 0x95d3b8,
  focusWire: 0xc5e5db,
  buildings: 0x3a494f,
  wire: 0x8a9b9e,
  ground: 0x142023,
  road: 0x435054,
});
