# 柏駅タイムスペースグラフ

柏駅周辺の移動軌跡と観察データを、3D地図と時間軸で表示する静的Webサイトである。

## 公開ページ

- トップ: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/>
- タイムスペースグラフ: <https://kashiwa-after-dark.github.io/3DMAP_DataVisu/time-space-graph/>

## ディレクトリ構成

```text
3DMAP_DataVisu/
├── 3Dmodel/                 # サイトで表示する3Dモデル
│   └── Kashiwa_3Dmap.glb
├── time-space-graph/        # タイムスペースグラフのサイト一式
│   ├── index.html
│   ├── css/                 # 画面デザイン
│   ├── js/                  # 地図、時間軸、フィルターなど
│   │   └── features/        # 機能ごとのJavaScript
│   └── statistics/          # 統計モード専用JavaScript
├── index.html               # サイト入口
├── README.md                # この説明
└── AGENTS.md                # Codexへの引き継ぎ
```

## 各フォルダの役割

| 場所 | 内容 |
| --- | --- |
| `3Dmodel/` | 通常表示で使用する3D都市モデルを置く。 |
| `time-space-graph/` | サイトのHTML、CSS、JavaScriptをすべて置く。 |
| `time-space-graph/js/features/` | 地図操作、フィルター、タイムラインなどを機能別に置く。 |
| `time-space-graph/statistics/` | 統計モードだけで使用する処理を置く。 |

## 主な機能

- Three.jsによる柏駅周辺の3D表示
- 3D表示と2D表示の切り替え
- 時間軸に沿った移動軌跡の再生
- 観察メモの表示と絞り込み
- 年齢層、性別、人数などの統計表示
- 行動分類とワードクラウド

現在、写真とGPXファイルはリポジトリに保存していない。移動軌跡と観察データは公開APIから取得し、`time-space-graph/js/config.js` の `GPX_FILES` には担当者・表示レーンなどのメタデータだけを置く。

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
