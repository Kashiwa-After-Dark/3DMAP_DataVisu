import { loadRouteDataset, getTimeRange } from "../../backend/routeData.js?v=20261028-01";
import { PUBLIC_SURVEY_DATE, ROUTE_SOURCES as CONFIGURED_SOURCES } from "../../backend/surveyConfig.js?v=20261025-01";
import { createStatisticsDashboard } from "./statisticsDashboard.js?v=20261028-03";
import { createStatisticsPeriodFilter } from "./statisticsPeriodFilter.js?v=20261024-02";
let ROUTE_SOURCES = CONFIGURED_SOURCES;

const dashboardRoot = document.querySelector("#statistics-dashboard");
const periodFilterList = document.querySelector("#period-filter-list");
const selectAllPeriods = document.querySelector("#select-all-periods");
const playButton = document.querySelector("#statistics-play");
const timeSlider = document.querySelector("#statistics-time");
const timeReadout = document.querySelector("#statistics-time-readout");
const status = document.querySelector("#statistics-status");
const surveyDate = document.querySelector("#survey-date");

const surveyReference = new Date(`${PUBLIC_SURVEY_DATE}T18:00:00+09:00`);
const { start: timelineStart, end: timelineEnd } = getTimeRange(surveyReference);
const dashboard = createStatisticsDashboard({
  root: dashboardRoot,
});
const periodFilter = createStatisticsPeriodFilter({
  root: periodFilterList,
  allButton: selectAllPeriods,
  onChange: ({ segmentIndexes }) => {
    const latestSegment = Math.max(...segmentIndexes);
    timeSlider.value = String((latestSegment + 1) * 2 * 60 * 60 - 1);
    renderAt(Number(timeSlider.value));
  },
});

let memos = [];
let isPlaying = false;
let lastFrame = 0;
let animationFrame = 0;

surveyDate.textContent = `SURVEY · ${PUBLIC_SURVEY_DATE.replaceAll("-", "/")}`;
dashboard.setActive(true);
loadData();

playButton.addEventListener("click", togglePlayback);
timeSlider.addEventListener("input", () => {
  stopPlayback();
  renderAt(Number(timeSlider.value));
});

async function loadData() {
  const dataset = await loadRouteDataset(ROUTE_SOURCES);
  dataset.errors.forEach((error) => console.error(error));
  if (dataset.unmatchedSourceFilenames.length) {
    console.warn("Unconfigured API sources:", dataset.unmatchedSourceFilenames);
  }
  memos = dataset.memos;
  ROUTE_SOURCES = dataset.sources;
  status.hidden = false;
  if (dataset.source === "api-error") {
    status.textContent = "公開APIへ接続できませんでした";
  } else if (!memos.length) {
    status.textContent = dataset.unmatchedSourceFilenames.length
      ? "10月23日のデータ設定が未登録です"
      : "10月23日の公開データはまだ0件です";
  } else {
    const located = memos.filter((memo) => memo.hasLocation).length;
    const objects = memos.filter((memo) => !memo.isPeople).length;
    status.textContent = `観察${memos.length}件（人${memos.length - objects}・物${objects}） / 地図上${located}件・位置不明${memos.length - located}件${dataset.tracks.length ? '' : ' / 移動軌跡は未登録'}`;
    timeSlider.value = timeSlider.max;
  }
  renderAt(Number(timeSlider.value));
}

function renderAt(seconds) {
  const currentTime = timelineStart + seconds * 1000;
  const filteredMemos = memos.filter((memo) => periodFilter.matches(memo));
  timeReadout.textContent = formatTime(currentTime);
  dashboard.update({
    memos: filteredMemos,
    currentTime,
    rangeStartTime: timelineStart,
    timelineStart,
    timelineEnd,
  });
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }
  if (Number(timeSlider.value) >= Number(timeSlider.max)) timeSlider.value = "0";
  isPlaying = true;
  playButton.classList.add("is-playing");
  playButton.setAttribute("aria-pressed", "true");
  playButton.setAttribute("aria-label", "一時停止");
  lastFrame = performance.now();
  animationFrame = requestAnimationFrame(stepPlayback);
}

function stepPlayback(now) {
  if (!isPlaying) return;
  const elapsed = (now - lastFrame) * 120;
  lastFrame = now;
  const next = Math.min(Number(timeSlider.max), Number(timeSlider.value) + elapsed / 1000);
  timeSlider.value = String(next);
  renderAt(next);
  if (next >= Number(timeSlider.max)) stopPlayback();
  else animationFrame = requestAnimationFrame(stepPlayback);
}

function stopPlayback() {
  isPlaying = false;
  cancelAnimationFrame(animationFrame);
  playButton.classList.remove("is-playing");
  playButton.setAttribute("aria-pressed", "false");
  playButton.setAttribute("aria-label", "再生");
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(timestamp);
}

