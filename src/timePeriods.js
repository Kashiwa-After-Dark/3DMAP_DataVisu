export const TIME_PERIODS = Object.freeze([
  Object.freeze({ id: "18-20", label: "18–20", startHour: 18, endHour: 20 }),
  Object.freeze({ id: "20-22", label: "20–22", startHour: 20, endHour: 22 }),
  Object.freeze({ id: "22-24", label: "22–24", startHour: 22, endHour: 24 }),
]);

export function getTimePeriod(periodId) {
  return TIME_PERIODS.find((period) => period.id === periodId) ?? TIME_PERIODS[0];
}
