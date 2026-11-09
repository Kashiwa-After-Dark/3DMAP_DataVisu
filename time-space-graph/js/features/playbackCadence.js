export function createPlaybackCadence(intervalMs = 40) {
  let lastRun = null;
  let lastTime = -Infinity;
  let lastSeconds = null;
  return {
    shouldUpdate({ seconds, run, now, ended = false }) {
      const newRun = run !== lastRun;
      if (!newRun && (seconds === lastSeconds || (!ended && now - lastTime < intervalMs))) return false;
      lastRun = run;
      lastTime = now;
      lastSeconds = seconds;
      return true;
    },
  };
}
