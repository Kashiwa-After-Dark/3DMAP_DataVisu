/** Checks the timing and wraparound of the terrace's automatic period dial. */
import assert from "node:assert/strict";
import test from "node:test";
import { advancePeriodPlayback, PERIOD_DURATION_MS } from "../js/periodPlayback.js";

test("partial progress stays within the current period", () => {
  assert.deepEqual(advancePeriodPlayback(0, 800, 200, 3), { period: 0, elapsed: 1000 });
});

test("a full arc advances to the next period and carries remaining time", () => {
  assert.deepEqual(advancePeriodPlayback(0, PERIOD_DURATION_MS - 10, 40, 3), { period: 1, elapsed: 30 });
});

test("the dial returns to 18:00 after the last period", () => {
  assert.deepEqual(advancePeriodPlayback(2, 0, PERIOD_DURATION_MS, 3), { period: 0, elapsed: 0 });
});
