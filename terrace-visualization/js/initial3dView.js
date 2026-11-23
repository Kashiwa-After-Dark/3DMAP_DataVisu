/** ファイル概要: 参考画像に合わせ、広場と建物正面を大きく映す3Dの開始構図を計算する。 */
export function initial3dView(center, size, aspect) {
  const span = Math.max(1, size.x);
  const distance = span * 0.60 * Math.max(1, 1.75 / Math.max(0.1, aspect));
  const direction = { x: 0.035, y: 0.9, z: 1 };
  const length = Math.hypot(direction.x, direction.y, direction.z);
  return {
    target: {
      x: center.x + size.x * 0.075,
      y: center.y + span * 0.015,
      z: center.z + size.z * 0.08,
    },
    offset: { x: distance * direction.x / length, y: distance * direction.y / length, z: distance / length },
  };
}
