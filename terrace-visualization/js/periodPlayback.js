/** Advances the terrace dial and carries time left over into the next period. */
export const PERIOD_DURATION_MS = 12000;

export function advancePeriodPlayback(period, elapsed, delta, periodCount) {
  const total = elapsed + Math.max(0, delta);
  return {
    period: (period + Math.floor(total / PERIOD_DURATION_MS)) % periodCount,
    elapsed: total % PERIOD_DURATION_MS,
  };
}
