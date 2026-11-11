/**
 * ファイル概要: 観察メモの絞り込み結果を再利用し、再生中の処理を軽くする。
 */
export function createMemoFilterCache(getMemos, matches) {
  let source = null;
  let filtered = null;
  let membership = null;
  function get() {
    const memos = getMemos();
    if (source !== memos || filtered === null) {
      source = memos;
      filtered = memos.filter(matches);
      membership = new Set(filtered);
    }
    return filtered;
  }
  return {
    get,
    has(memo) { get(); return membership.has(memo); },
    invalidate() { filtered = null; },
  };
}
