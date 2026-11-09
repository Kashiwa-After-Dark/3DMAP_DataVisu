import { performance } from "node:perf_hooks";
import { loadRouteDataset } from "../backend/routeData.js";
import { PUBLIC_SURVEY_DATE, ROUTE_SOURCES } from "../backend/surveyConfig.js";
import { getActivityType } from "../backend/activityClassifier.js";
import { getPerspectiveImpressionType } from "../time-space-graph/js/features/emotionPerspective.js";
import { createMemoFilterCache } from "../time-space-graph/js/features/memoFilterCache.js";
import { createPlaybackCadence } from "../time-space-graph/js/features/playbackCadence.js";

const dataset = await loadRouteDataset(ROUTE_SOURCES);
if (dataset.errors.length) throw dataset.errors[0];
const memos = dataset.memos;
let checks = 0;
const matches = (memo) => {
  checks++;
  return memo.isPeople && getActivityType(memo).id !== "other" && getPerspectiveImpressionType(memo, "subject").id !== "unknown";
};
const measure = (run) => {
  checks = 0;
  const start = performance.now();
  const checksum = run();
  return { ms: Number((performance.now() - start).toFixed(2)), conditionChecks: checks, checksum };
};
const repeatedFiltering = measure(() => {
  let total = 0;
  for (let i = 0; i < 1000; i++) total += memos.filter(matches).length;
  return total;
});
const cachedFiltering = measure(() => {
  const cache = createMemoFilterCache(() => memos, matches);
  let total = 0;
  for (let i = 0; i < 1000; i++) total += cache.get().length;
  return total;
});
if (repeatedFiltering.checksum !== cachedFiltering.checksum) throw new Error("Filter results changed");
const gate = createPlaybackCadence();
let scheduledUpdates = 0;
for (let frame = 0; frame <= 1800; frame++) {
  if (gate.shouldUpdate({ seconds: frame * 12, run: 1, now: frame * 1000 / 60, ended: frame === 1800 })) scheduledUpdates++;
}
console.log(JSON.stringify({
  date: PUBLIC_SURVEY_DATE, tracks: dataset.tracks.length, memos: memos.length,
  iterations: 1000, repeatedFiltering, cachedFiltering,
  simulatedPlayback: { frames: 1801, scheduledUpdates, finalSecond: 21600 },
  note: "CPU microbenchmark and scheduler simulation, not browser FPS.",
}, null, 2));
