/** Groups saved observer impressions by authored terrace area. */
export function summarizePlaceImpressions(records, codes, limit = 7) {
  const groups = new Map();
  for (const { placeCodes, impression } of records) {
    if (typeof impression !== "string") continue;
    const phrases = new Set(impression.split(/[、。！？\n]+/u).map((phrase) => phrase.trim()).filter(Boolean));
    for (const code of new Set(placeCodes)) {
      if (!codes.has(code) || !phrases.size) continue;
      if (!groups.has(code)) groups.set(code, new Map());
      const words = groups.get(code);
      for (const phrase of phrases) words.set(phrase, (words.get(phrase) ?? 0) + 1);
    }
  }
  return new Map([...groups].map(([code, words]) => [code,
    [...words].sort(([a, aCount], [b, bCount]) => bCount - aCount || a.length - b.length || a.localeCompare(b, "ja"))
      .slice(0, limit).map(([text, count]) => ({ text, count })),
  ]));
}
