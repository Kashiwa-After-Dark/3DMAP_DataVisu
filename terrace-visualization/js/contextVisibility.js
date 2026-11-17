/**
 * ファイル概要: デッキを遮る周辺建物側の視点を、モデル座標の水平方向から判定する。
 */
export function shouldHideBuilding(camera, deck, building, hidden = false) {
  const cx = camera.x - deck.x;
  const cz = camera.z - deck.z;
  const px = building.x - deck.x;
  const pz = building.z - deck.z;
  const length = Math.hypot(cx, cz) * Math.hypot(px, pz);
  if (!Number.isFinite(length) || length < 1e-8) return false;
  const alignment = (cx * px + cz * pz) / length;
  // Different enter/exit thresholds prevent flicker while orbit damping settles.
  return alignment > (hidden ? 0.02 : 0.15);
}
