# 柏駅スペースタイムキューブ

柏駅周辺の移動軌跡と観察データを、3D地図と時間軸で表示する静的Webサイトである。

## 公開ページ

- トップ: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/>
- スペースタイムキューブ: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/space-time-cube/>
- 統計画面: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/statistics/>
- テラス可視化: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/terrace-visualization/>

## ディレクトリ構成

```text
3DMAP_DataVisu/
├── 3Dmodel/                 # サイトで表示する3Dモデル
│   └── Kashiwa_3Dmap.glb
├── backend/                 # 公開API、対象日、ルート設定、データ変換
├── space-time-cube/          # スペースタイムキューブのサイト一式
│   ├── index.html
│   ├── style.css            # 画面デザイン
│   └── js/                   # 役割ごとに分けたJavaScript
│       ├── screen-control/   # 起動、設定、3D・2D地図
│       ├── hint-mode/        # ヒント表示
│       ├── language-mode/    # 日本語・英語切り替え
│       ├── header-footer/    # 上下の操作バー
│       ├── timeline/         # タイムライン全般
│       ├── data-display/     # カードデッキ、観察メモ、マーカー
│       ├── filters/          # 属性・感情・行動の絞り込み
│       ├── movement-visualization/   # ルート、移動、滞在
│       ├── impression-visualization/ # 感情・印象の3D表現
│       └── shared/           # 共通の表示処理
├── statistics/              # 独立した統計画面
│   ├── index.html
│   ├── style.css
│   └── statistics.js
├── terrace-visualization/   # テラス専用画面
│   ├── index.html
│   ├── style.css
│   └── js/                  # テラス画面の機能別JavaScript
├── index.html               # サイト入口
├── README.md                # この説明
└── AGENTS.md                # Codexへの引き継ぎ
```

## 各フォルダの役割

| 場所 | 内容 |
| --- | --- |
| `3Dmodel/` | 通常表示で使用する3D都市モデルを置く。 |
| `backend/` | 公開APIへの通信、対象日・ルート設定、画面用データ変換を置く。 |
| `space-time-cube/` | スペースタイムキューブ画面のHTML、CSS、JavaScriptを置く。 |
| `space-time-cube/js/` | 画面の処理を、編集目的が分かる10分類で置く。 |
| `statistics/` | 統計画面を `index.html`、`style.css`、`statistics.js` の3ファイルで管理する。 |
| `terrace-visualization/` | テラス専用画面と、その機能別JavaScriptを置く。 |

## スペースタイムキューブのJavaScript

`JS` はJSONではなくJavaScriptの略である。まず変更したい機能のフォルダを選び、その中の同名ファイルだけを編集する。

| 分類フォルダ | 主に編集するファイル | 役割 |
| --- | --- | --- |
| `js/screen-control/` | `app.js`、`settings.js`、`map-display.js` | 画面起動、全機能の連携、設定、3D地図を管理する。2D地図、カメラ、表示品質もここである。 |
| `js/hint-mode/` | `hint-mode.js` | 操作ヒントの表示と非表示を管理する。 |
| `js/language-mode/` | `language-mode.js`、`observation-translations.js` | 日本語・英語の切り替えと観察文の画面用翻訳を管理する。 |
| `js/header-footer/` | `toolbar-menus.js`、`taskbar-visibility.js`、`panel-storage.js` | ヘッダー、フッター、ツールメニュー、パネル収納を管理する。 |
| `js/timeline/` | `time-period-filter.js`、`timeline-range.js` | 時間帯選択、再生範囲、キーボード操作、時計、再生速度を管理する。 |
| `js/data-display/` | `memo-panel.js`、`markers.js` | カードデッキ、観察メモ、分類表示、観察点、選択状態を管理する。 |
| `js/filters/` | `filter-panel.js`、`filter-display-mode.js` | 絞り込み画面と属性・感情・行動の表示モードをまとめる。 |
| `js/filters/attributes/` | `attribute-filter.js`、`assignee-filter.js` | 年齢、グループ、性別、人数、担当データ、キーワードで絞り込む。 |
| `js/filters/emotions/` | `emotion-filter.js` | 感情・印象で絞り込む。 |
| `js/filters/activities/` | `activity-filter.js` | 行動分類で絞り込む。 |
| `js/movement-visualization/` | `activity-flow.js`、`average-route-model.js` など | 代表ルート、移動再生、滞在、駅方向、フロー矢印などの計算と描画を行う。 |
| `js/impression-visualization/` | `impression-volume.js`、`impression-density.js` など | 感情・印象の密度、3Dボリューム、流体表現を計算・描画する。 |
| `js/shared/` | `formatters.js` | 時刻、色、図形など複数機能で使う表示処理を置く。 |

`movement-visualization/` と `impression-visualization/` は、ユーザー指定の分類だけでは収まらない専門的な描画処理を分けた追加分類である。計算処理を巨大な1ファイルへまとめると編集箇所がかえって分かりにくくなるため、用途ごとの小さなファイルを維持している。

## 主な機能

- Three.jsによる柏駅周辺の3D表示
- 3D表示と2D表示の切り替え
- 時間軸に沿った移動軌跡の再生
- 観察メモの表示と絞り込み
- 年齢層、性別、人数などの統計表示
- 行動分類とワードクラウド

現在、写真とGPXファイルはリポジトリに保存していない。移動軌跡と観察データは公開APIから取得し、`backend/surveyConfig.js` に対象日と論理ルートのメタデータを置く。`2026-10-23`調査は、複数の観察CSVを1つのルートとして表示し、担当者ではなく18–20時、20–22時、22–24時で絞り込む。

## ローカル起動

リポジトリのルートで次を実行する。

```powershell
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開く。

## 使用技術

- HTML
- CSS
- JavaScript ES Modules
- Three.js `0.166.1`
- Supabase Edge Functionによる公開データ取得

ビルドやnpmインストールは不要である。
