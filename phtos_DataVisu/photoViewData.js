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
