/**
 * ファイル概要: 画面サイズと端末性能に応じて描画解像度を調整する。
 */
export function getMapPixelRatio({ width, height, devicePixelRatio = 1, mode = "attribute" }) {
  const liquid = mode === "impression";
  const maxPixels = liquid ? 1400000 : 2400000;
  const area = Math.max(1, width * height);
  return Math.min(devicePixelRatio, liquid ? 1 : 1.5, Math.max(0.65, Math.sqrt(maxPixels / area)));
}

export function getDensityBounds(data, size, padding = 3) {
  let minX = size;
  let minZ = size;
  let maxX = -1;
  let maxZ = -1;
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const i = (z * size + x) * 4;
    if (!(data[i] || data[i + 1] || data[i + 2] || data[i + 3])) continue;
    minX = Math.min(minX, x);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxZ = Math.max(maxZ, z);
  }
  if (maxX < 0) return null;
  return {
    minX: Math.max(-0.5, (minX - padding) / size - 0.5),
    minZ: Math.max(-0.5, (minZ - padding) / size - 0.5),
    maxX: Math.min(0.5, (maxX + padding + 1) / size - 0.5),
    maxZ: Math.min(0.5, (maxZ + padding + 1) / size - 0.5),
  };
}
