# 柏駅タイムスペースグラフ

柏駅周辺の移動軌跡と観察データを、3D地図と時間軸で表示する静的Webサイトである。

## 公開ページ

- トップ: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/>
- タイムスペースグラフ: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/time-space-graph/>
- 統計画面: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/statistics-mode/>

## ディレクトリ構成

```text
3DMAP_DataVisu/
├── 3Dmodel/                 # サイトで表示する3Dモデル
│   └── Kashiwa_3Dmap.glb
├── backend/                 # 公開API、対象日、ルート設定、データ変換
├── time-space-graph/        # タイムスペースグラフのサイト一式
│   ├── index.html
│   ├── css/                 # 画面デザイン
│   └── js/                  # 地図、時間軸、フィルターなど
│       └── features/        # 機能ごとのJavaScript
├── statistics-mode/         # 独立した統計画面
│   ├── index.html
│   ├── css/
│   └── js/
├── index.html               # サイト入口
├── README.md                # この説明
└── AGENTS.md                # Codexへの引き継ぎ
```

## 各フォルダの役割

| 場所 | 内容 |
| --- | --- |
| `3Dmodel/` | 通常表示で使用する3D都市モデルを置く。 |
| `backend/` | 公開APIへの通信、対象日・ルート設定、画面用データ変換を置く。 |
| `time-space-graph/` | サイトのHTML、CSS、JavaScriptをすべて置く。 |
| `time-space-graph/js/features/` | 地図操作、フィルター、タイムラインなどを機能別に置く。 |
| `statistics-mode/` | 統計専用のHTML、CSS、JavaScriptを置く。 |

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
