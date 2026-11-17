/** ファイル概要: 画面上のテラス床面のうち、駅が50%以上を遮る場合だけ非表示にする。 */
export function hideStationForCoverage(covered, total) {
  return Number.isFinite(covered) && Number.isFinite(total) && total > 0 && covered / total >= 0.5;
}
