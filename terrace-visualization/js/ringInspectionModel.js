/** Limits the ring's detail rows to its saved place and activity category. */
export function selectRingObservations(records, { code, tag }) {
  return records.filter((record) => {
    if (!record.placeCodes.includes(code)) return false;
    const categories = record.activityCategories ?? [];
    return tag === null ? categories.length === 0 : categories.some(({ id }) => id === tag);
  });
}
