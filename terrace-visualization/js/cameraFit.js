/**
 * ファイル概要: テラス周辺が画面内へ収まるカメラ距離と投影範囲を計算する。
 */
export function fitDistance(radius, verticalFov, aspect, padding = 1.12) {
  const vertical = verticalFov * Math.PI / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return Math.max(1, radius) / Math.sin(Math.min(vertical, horizontal) / 2) * padding;
}

export function orthographicSpan(size, aspect, padding = 1.2) {
  const height = Math.max(size.z, size.x / aspect, 1) * padding;
  return { width: height * aspect, height };
}
