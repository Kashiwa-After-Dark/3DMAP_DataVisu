/** ファイル概要: 重要なデッキ範囲を、右側の操作部品と重ならない真上視点へ収める。 */
export function focused2dFrame(size, width, height, rightInset, padding = 1.14) {
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
