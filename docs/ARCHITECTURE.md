# アーキテクチャ

## 全体構成

本プロジェクトは、2つの可視化サイトと共通処理から構成される静的Webアプリである。npmによるビルド工程はなく、各HTMLからES Modulesを直接読み込む。

```text
index.html
  └─ route-history/
       ├─ GPX移動軌跡
       ├─ 観察メモ
       ├─ タイムライン
       ├─ フィルター
       └─ 統計表示

photo-visualization/
  ├─ 公開用写真ViewFinder
  └─ dev/ 写真視点調整

shared/
  ├─ 3Dシーンとモデル読み込み
  ├─ 座標変換
  └─ 共通設定
```

## ページ構成

| URL | 入口 | 役割 |
| --- | --- | --- |
| `/` | `index.html` | `/route-history/` へ転送する。 |
| `/route-history/` | `route-history/index.html` | 移動・観察データを時間軸付きで可視化する。 |
| `/photo-visualization/` | `photo-visualization/index.html` | 写真と3Dモデルを比較する。 |
| `/photo-visualization/dev/` | `photo-visualization/dev/index.html` | 写真ごとのカメラ視点を調整する。 |
| `/phtos_DataVisu/` | `phtos_DataVisu/index.html` | 旧URLから写真サイトへ転送する。 |

## ルートヒストリー

`route-history/js/index.js` が画面全体を統括する。GPX読み込み、時間範囲、軌跡、観察マーカー、タイムライン、フィルター、統計表示を各機能モジュールへ接続する。

```text
route-history/
├── index.html
├── css/
│   ├── style.css
│   └── smart-city-trial.css
└── js/
    ├── index.js
    ├── gpxData.js
    ├── formatters.js
    └── features/
```

`features/` は、フィルター、表示切り替え、統計、パネル、ヒントなどの画面機能を機能単位で分割した場所である。

## 写真可視化

`photo-visualization/js/viewFinder.js` が公開用と開発用の両画面を統括する。`body` の `data-viewer-mode` により動作を切り替える。

```text
photo-visualization/
├── index.html
├── css/viewFinder.css
├── js/
│   ├── viewFinder.js
│   ├── photos.js
│   ├── photoViewData.js
│   └── 表示演出用モジュール
└── dev/
    ├── index.html
    ├── dev.js
    ├── dev.css
    └── githubPublisher.js
```

`photoViewData.js` は調整済みのカメラ位置・回転・FOVなどを保持する。開発画面からGitHubへ保存する機能は `githubPublisher.js` が担当する。

## 共通3D処理

`shared/js/mapDisplay.js` は、次の処理を両サイトへ提供する。

- Three.jsのシーン、レンダラー、カメラ、ライトの生成
- `OrbitControls` の初期化
- GLB、FBXモデルの読み込み
- 緯度・経度とThree.js座標の相互変換
- 通常モデルと写真比較用モデルの切り替え

`shared/js/config.js` は、座標原点、表示色、時間範囲、GPX一覧などを管理する。

## データフロー

```text
GPXファイル
  └─ shared/js/config.jsで対象を定義
      └─ route-history/js/gpxData.jsで解析
          ├─ 移動軌跡
          └─ 観察メモ・属性

写真ファイル
  └─ photo-visualization/js/photos.jsで一覧化
      ├─ 撮影時刻とGPXから位置を推定
      └─ photoViewData.jsの視点設定で3Dモデルと重ねる

3Dモデル
  └─ shared/js/mapDisplay.jsで読み込み
      ├─ Kashiwa_3Dmap.glb: 通常表示
      └─ kashiwa_Blosm.glb: 写真比較表示
          └─ 読み込み失敗時はkashiwa_Blosm.fbx
```

## 配置ルール

- 一つのサイトだけで使う処理は、そのサイトのディレクトリへ置く。
- 両サイトで使う処理のみ `shared/` へ置く。
- 担当者別のディレクトリは作らず、機能単位で分割する。
- 公開データは `assets/`、説明用画像は `docs/images/` に置く。
- 一時生成物はリポジトリへ追加しない。

## 公開とキャッシュ

GitHub Pagesで静的ファイルを公開する。JavaScriptとCSSのURL末尾にある `?v=...` はキャッシュ更新用である。ファイル移動やURL変更時は、HTMLの参照、JavaScriptのimport、READMEの公開URL、旧URL転送をまとめて確認する。
