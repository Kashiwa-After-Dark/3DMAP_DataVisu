/** ファイル概要: 重要なデッキ範囲を、右側の操作部品と重ならない真上視点へ収める。 */
export function focused2dFrame(size, width, height, rightInset, padding = 1.07) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const margin = Math.min(28, w * 0.05, h * 0.05);
  const reserve = Math.max(0, Math.min(w * 0.45, rightInset));
  const availableWidth = Math.max(1, w - reserve - margin * 2);
  const availableHeight = Math.max(1, h - margin * 2);
  const scale = Math.max(Math.max(1, size.x) * padding / availableWidth, Math.max(1, size.z) * padding / availableHeight);
  const centerX = (w - reserve) / 2;
  return { left: -centerX * scale, right: (w - centerX) * scale, top: h * scale / 2, bottom: -h * scale / 2 };
}

export function terrace2dDetailFrame(size, width, height, rightInset) {
  const frame = focused2dFrame(size, width, height, rightInset);
  // Wide screens can crop the outer walkways; narrow screens retain the full fit.
  const room = Math.max(0, Math.min(1, (width - 600) / 450, (width / Math.max(1, height) - 1) / 0.35));
  const zoom = 1 + room * 0.32;
  const offsetY = (frame.top - frame.bottom) / zoom * room * 0.075;
  return { left: frame.left / zoom, right: frame.right / zoom, top: frame.top / zoom + offsetY, bottom: frame.bottom / zoom + offsetY };
}
