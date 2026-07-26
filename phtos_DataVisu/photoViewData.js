/*
 * 写真ごとの確定済み表示データです。
 *
 * /phtos_DataVisu/dev/ の「途中確定・コピー」で出力されたJSONから、
 * photos 配列の中身をこの配列へ貼り付けてください。
 *
 * ここに登録されていない写真は、写真のGPS位置・撮影方向と
 * PHOTO_VIEW_DEFAULTSを使った初期表示になります。
 */
export const PHOTO_VIEW_DATA = [
  {
    index: 1,
    id: "photo-1",
    position: { x: 73.1034, y: 11.2374, z: 83.8585 },
    rotationDegrees: { x: -39.8802, y: 124.3768, z: 0 },
    quaternion: { x: -0.159116, y: 0.831462, z: 0.301643, w: 0.438595 },
    fov: 68,
    photoOpacity: 0.42,
    photoScale: 1,
  },
  {
    index: 2,
    id: "photo-2",
    position: { x: 132.7314, y: 9.5412, z: 189.0586 },
    rotationDegrees: { x: -28.1499, y: 104.2076, z: 0 },
    quaternion: { x: -0.149376, y: 0.765434, z: 0.191908, w: 0.595793 },
    fov: 70,
    photoOpacity: 0.26,
    photoScale: 1,
  },
  {
    index: 3,
    id: "photo-3",
    position: { x: 78.1524, y: 10.0676, z: 89.0636 },
    rotationDegrees: { x: -38.479, y: -126.6626, z: 0 },
    quaternion: { x: 0.147898, y: 0.843708, z: 0.294463, w: -0.423763 },
    fov: 53,
    photoOpacity: 0.12,
    photoScale: 1,
  },
  {
    index: 4,
    id: "photo-4",
    position: { x: 80.2392, y: 8.1065, z: 88.8643 },
    rotationDegrees: { x: 15.7541, y: -106.3452, z: 0 },
    quaternion: { x: 0.082147, y: -0.792892, z: 0.109699, w: 0.59375 },
    fov: 100,
    photoOpacity: 0.61,
    photoScale: 1,
  },
  {
    index: 5,
    id: "photo-5",
    position: { x: 69.3973, y: 8.3642, z: 6.8399 },
    rotationDegrees: { x: -19.3111, y: 143.3756, z: 0 },
    quaternion: { x: -0.052698, y: 0.93591, z: 0.15923, w: 0.309744 },
    fov: 100,
    photoOpacity: 0.1,
    photoScale: 1,
  },
  {
    index: 6,
    id: "photo-6",
    position: { x: -18.4843, y: 12.5898, z: -80.8133 },
    rotationDegrees: { x: -13.2575, y: -157.5467, z: 0 },
    quaternion: { x: 0.022474, y: 0.974308, z: 0.113226, w: -0.193389 },
    fov: 42,
    photoOpacity: 1,
    photoScale: 1,
  },
  {
    index: 7,
    id: "photo-7",
    position: { x: -25.0113, y: 13.6463, z: -66.006 },
    rotationDegrees: { x: -18.1078, y: -84.3611, z: 0 },
    quaternion: { x: -0.116612, y: -0.663103, z: -0.105665, w: 0.7318 },
    fov: 53,
    photoOpacity: 0.77,
    photoScale: 1,
  },
  {
    index: 8,
    id: "photo-8",
    position: { x: -35.0614, y: 21.5548, z: -34.8904 },
    rotationDegrees: { x: -23.1197, y: 102.2826, z: 0 },
    quaternion: { x: -0.125726, y: 0.762901, z: 0.156044, w: 0.614675 },
    fov: 20,
    photoOpacity: 0.26,
    photoScale: 1,
  },
  {
    index: 9,
    id: "photo-9",
    position: { x: 81.1174, y: 7.4812, z: -89.6031 },
    rotationDegrees: { x: -6.3054, y: -90.551, z: 0 },
    quaternion: { x: -0.038701, y: -0.709423, z: -0.039075, w: 0.702634 },
    fov: 31,
    photoOpacity: 0.74,
    photoScale: 1,
  },
  {
    index: 10,
    id: "photo-10",
    position: { x: -37.7473, y: 9.5913, z: -29.5586 },
    rotationDegrees: { x: -32.8203, y: 39.5115, z: 0 },
    quaternion: { x: -0.265884, y: 0.324242, z: 0.095492, w: 0.902804 },
    fov: 23,
    photoOpacity: 0,
    photoScale: 1,
  },
  {
    index: 16,
    id: "photo-16",
    position: { x: -3.3905, y: 6.2136, z: 12.2335 },
    rotationDegrees: { x: -9.0606, y: -68.0229, z: 0 },
    quaternion: { x: -0.065474, y: -0.557611, z: -0.044182, w: 0.826336 },
    fov: 20,
    photoOpacity: 0.48,
    photoScale: 1,
  },
  {
    index: 17,
    id: "photo-17",
    position: { x: 80.0878, y: 8.1843, z: 154.2246 },
    rotationDegrees: { x: 8.5274, y: 174.8726, z: 0 },
    quaternion: { x: 0.003326, y: 0.996234, z: -0.074272, w: 0.044607 },
    fov: 62,
    photoOpacity: 0.28,
    photoScale: 1,
  },
  {
    index: 18,
    id: "photo-18",
    position: { x: -29.554, y: 16.5713, z: -65.975 },
    rotationDegrees: { x: -19.994, y: -70.4866, z: 0 },
    quaternion: { x: -0.141778, y: -0.568288, z: -0.100174, w: 0.804309 },
    fov: 20,
    photoOpacity: 0.77,
    photoScale: 1,
  },
  {
    index: 19,
    id: "photo-19",
    position: { x: -35.2441, y: 11.4315, z: -43.5174 },
    rotationDegrees: { x: -3.6646, y: -82.7313, z: 0 },
    quaternion: { x: -0.023997, y: -0.660524, z: -0.021131, w: 0.750124 },
    fov: 31,
    photoOpacity: 1,
    photoScale: 1,
  },
  {
    index: 20,
    id: "photo-20",
    position: { x: 87.591, y: 8.8063, z: 163.2718 },
    rotationDegrees: { x: 6.4671, y: 68.9886, z: 0 },
    quaternion: { x: 0.046489, y: 0.565422, z: -0.031944, w: 0.822871 },
    fov: 72,
    photoOpacity: 0.34,
    photoScale: 1,
  },
  {
    index: 21,
    id: "photo-21",
    position: { x: 27.6947, y: 8.1979, z: 44.6962 },
    rotationDegrees: { x: -1.7785, y: -45.877, z: 0 },
    quaternion: { x: -0.014292, y: -0.389696, z: -0.006049, w: 0.920813 },
    fov: 48,
    photoOpacity: 0,
    photoScale: 1,
  },
];

export const PHOTO_VIEW_DEFAULTS = Object.freeze({
  fov: 62,
  photoOpacity: 0.58,
  photoScale: 1,
  cameraHeight: 2.4,
});

const photoViewDataById = new Map(
  PHOTO_VIEW_DATA
    .filter(isCompletePhotoViewData)
    .map((record) => [record.id, record]),
);

export function getPhotoViewData(photoId) {
  return photoViewDataById.get(photoId) ?? null;
}

export function hasPhotoViewData(photoId) {
  return photoViewDataById.has(photoId);
}

function isCompletePhotoViewData(record) {
  const position = record?.position;
  const quaternion = record?.quaternion;
  return Boolean(
    record?.id
    && position
    && quaternion
    && [
      position.x,
      position.y,
      position.z,
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w,
    ].every(Number.isFinite),
  );
}
