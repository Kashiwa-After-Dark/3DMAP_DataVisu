const GITHUB_REPOSITORY = "Kashiwa-After-Dark/3DMAP_DataVisu";
const GITHUB_BRANCH = "r4U_dv";
const DATA_FILE_PATH = "photo-visualization/js/photoViewData.js";
const PUBLIC_SITE_URL = "https://kashiwa-after-dark.github.io/3DMAP_DataVisu/photo-visualization/";
const TOKEN_SESSION_KEY = "kashiwa-github-publish-token";

const tokenInput = document.querySelector("#github-access-token");
const publishButton = document.querySelector("#publish-calibration");
const publishStatus = document.querySelector("#github-publish-status");

let latestCalibration = null;
let latestKnownRecords = null;
let publishing = false;

window.addEventListener("photo-calibration-summary", (event) => {
  latestCalibration = event.detail ?? null;
  latestKnownRecords ??= latestCalibration?.existingPhotoViewData ?? [];
  publishButton.disabled = !latestCalibration?.payload?.photos?.length;
  if (
    latestCalibration?.payload?.partial === false
    && sessionStorage.getItem(TOKEN_SESSION_KEY)
  ) {
    publishCalibration();
  }
});

publishButton?.addEventListener("click", publishCalibration);

if (sessionStorage.getItem(TOKEN_SESSION_KEY)) {
  tokenInput.placeholder = "このタブに保存済み";
}

async function publishCalibration() {
  if (publishing) return;
  const enteredToken = tokenInput.value.trim();
  const token = enteredToken || sessionStorage.getItem(TOKEN_SESSION_KEY);
  if (!token) {
    setPublishStatus("GitHub access tokenを入力してください。", "error");
    tokenInput.focus();
    return;
  }
  if (!latestCalibration?.payload?.photos?.length) {
    setPublishStatus("反映する調整結果がありません。", "error");
    return;
  }

  publishing = true;
  publishButton.disabled = true;
  publishButton.textContent = "GitHubへ保存中…";
  setPublishStatus("設定ファイルを更新しています。");

  try {
    const currentFile = await githubRequest(
      `/repos/${GITHUB_REPOSITORY}/contents/${DATA_FILE_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
      token,
    );
    const mergedRecords = mergePhotoViewData(
      latestKnownRecords,
      latestCalibration.payload.photos,
    );
    const source = buildPhotoViewDataSource(mergedRecords);

    await githubRequest(
      `/repos/${GITHUB_REPOSITORY}/contents/${DATA_FILE_PATH}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `写真視点データを更新（${latestCalibration.payload.photos.length}件）`,
          content: encodeBase64(source),
          sha: currentFile.sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    latestKnownRecords = mergedRecords;
    tokenInput.value = "";
    tokenInput.placeholder = "このタブに保存済み";
    publishButton.textContent = "反映しました";
    setPublishStatus(
      `保存しました。公開サイトへの反映には1〜2分ほどかかります：${PUBLIC_SITE_URL}`,
      "success",
    );
  } catch (error) {
    publishButton.disabled = false;
    publishButton.textContent = "公開サイトへ反映";
    setPublishStatus(error.message || "GitHubへの保存に失敗しました。", "error");
  } finally {
    publishing = false;
  }
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (response.ok) return response.json();

  let message = `GitHubへの保存に失敗しました（${response.status}）。`;
  try {
    const body = await response.json();
    if (body.message === "Bad credentials") {
      message = "トークンを確認してください。認証できませんでした。";
    } else if (response.status === 403) {
      message = "このトークンにはRepository contentsの書き込み権限がありません。";
    } else if (response.status === 409) {
      message = "別の更新と重なりました。ページを再読み込みして、もう一度お試しください。";
    } else if (body.message) {
      message = `GitHubへの保存に失敗しました：${body.message}`;
    }
  } catch {
    // GitHubからJSON以外の応答が返った場合は、上の一般的な案内を使用します。
  }
  throw new Error(message);
}

function mergePhotoViewData(existingRecords = [], updatedRecords = []) {
  const recordsById = new Map(existingRecords.map((record) => [record.id, record]));
  for (const record of updatedRecords) {
    if (record?.id) recordsById.set(record.id, record);
  }
  return [...recordsById.values()].sort((left, right) => left.index - right.index);
}

function buildPhotoViewDataSource(records) {
  return `/*
 * 写真ごとの確定済み表示データです。
 *
 * /photo-visualization/dev/ の「公開サイトへ反映」から自動更新されます。
 * ここに登録されていない写真は、公開用ページには表示されません。
 */
export const PHOTO_VIEW_DATA = ${JSON.stringify(records, null, 2)};

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
`;
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function setPublishStatus(message, state = "") {
  publishStatus.textContent = message;
  publishStatus.classList.toggle("is-error", state === "error");
  publishStatus.classList.toggle("is-success", state === "success");
}
