/** ファイル概要: 公開APIの人物タグからTR-03の抗議活動の模式表示を判定する。 */
export function isTerraceProtest(record, code) {
  return code === "TR-03" && !record.isObject && record.personTags?.includes("抗議活動") === true;
}
