/**
 * ファイル概要: モデル内の場所範囲名を、明示されたTRコードとして読み取る。
 */
export function placeRegionCode(name) {
  if (typeof name !== "string") return null;
  return name.normalize("NFKC").trim().toUpperCase().match(/^(TR-\d{2})(?:\.\d{3})?$/u)?.[1] || null;
}
