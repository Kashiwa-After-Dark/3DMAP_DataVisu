/** Display-only route branches traced from the annotated top-down image. */
const STATION = [7.18, 1.92];
const LOWER_JUNCTION = [7.18, 0.59];
const UPPER_JUNCTION = [7.19, -1.73];
const WEST_JUNCTION = [0.88, -1.14];

// Each branch points away from the station. Shared sections occur only once.
export const TERRACE_2D_ROUTES = [
  [STATION, LOWER_JUNCTION, UPPER_JUNCTION],
  [UPPER_JUNCTION, [8.2, -2.8]],
  [UPPER_JUNCTION, [1.9, -1.73], WEST_JUNCTION],
  [LOWER_JUNCTION, [2.04, 0.59], WEST_JUNCTION],
  [WEST_JUNCTION, [-0.95, -1.14], [-3.48, -3.4], [-3.48, -4.35]],
];

export const LOCAL_ARROW_FRAMES = 5;
export const LOCAL_ARROW_FRAME_MS = 200;

export function localArrowPoses(a, b, direction) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 0.75) return [];
  const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
  const sign = direction === "to_station" ? -1 : 1;
  const count = Math.max(1, Math.round(length / 1.65));
  return Array.from({ length: count }, (_, i) => Array.from({ length: LOCAL_ARROW_FRAMES }, (_, frame) => {
    const along = (i + 0.5) * length / count + sign * (frame - 2) * 0.09;
    return { x: a[0] + dx * along - sign * dz * 0.1,
      z: a[1] + dz * along + sign * dx * 0.1, dx: sign * dx, dz: sign * dz };
  }));
}
