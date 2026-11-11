/**
 * ファイル概要: 時間帯別の感情・印象件数を3D表示用に集計する。
 */
import { IMPRESSION_TYPES, getImpressionType } from "../../../backend/impressionClassifier.js?v=20261029-db1";
export const IMPRESSION_PERIOD_MS = 2 * 60 * 60 * 1000;

export function createImpressionVolumeModel({ memos, startTime, endTime }) {
  const periods = Array.from({ length: Math.ceil((endTime - startTime) / IMPRESSION_PERIOD_MS) }, (_, index) => ({
    index, start: startTime + index * IMPRESSION_PERIOD_MS,
    end: Math.min(startTime + (index + 1) * IMPRESSION_PERIOD_MS, endTime),
    memos: memos.filter((memo) => memo.isPeople && memo.time >= startTime + index * IMPRESSION_PERIOD_MS && memo.time < Math.min(startTime + (index + 1) * IMPRESSION_PERIOD_MS, endTime)),
  }));
  return { periods };
}

export function collectImpressionVolumes({ period, currentTime, rangeStart, matches = () => true, getType = getImpressionType }) {
  const counts = new Map(IMPRESSION_TYPES.map(({ id }) => [id, 0]));
  for (const memo of period.memos) {
    if (memo.time > currentTime || memo.time < rangeStart || !matches(memo)) continue;
    const id = getType(memo).id;
    counts.set(id, counts.get(id) + 1);
  }
  return IMPRESSION_TYPES.map((type) => {
    const count = counts.get(type.id);
    return { ...type, count };
  });
}
