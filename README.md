# 3DMAP Data Visualization

柏駅周辺の3Dマップ、移動・観察データ、写真を組み合わせて表示する可視化サイトです。
ゼミ紹介サイトとは分離し、このリポジトリには可視化に必要なコードと公開用素材だけを置きます。

## 写真表示

- GitHub Pages: `https://kashiwa-after-dark.github.io/3DMAP_DataVisu/phtos_DataVisu`
- ViewFinder表示の処理: `phtos_DataVisu/viewFinder.js`
- 通常の全体表示では `Kashiwa_3Dmap.glb` を使用
- `PHOTO VIEW` または地図上の白い写真ポイントを選ぶと `kashiwa_Blosm.fbx` に切り替え
- 写真の透明度と表示倍率（25〜300%）を動かし、3Dモデルと撮影時の景色を重ねて比較
- 左右ボタン／矢印キーで写真移動、Escキーで全体地図へ復帰
- GPSがない写真の撮影地点は撮影時刻とGPX軌跡から補完
- `視点調整を開始`から31枚を順番に位置合わせし、最後に座標・回転角のJSONをコピー可能

## ディレクトリ

- `src/` — 共通部分と可視化の中心となるJavaScript
- `r4U_js/` — r4U担当のJavaScript
- `Yoh_js/` — Yoh担当のJavaScript
- `styles/` — サイトのスタイル
- `assets/models/` — 3Dモデル
- `assets/data/` — 公開用に整形したGPXやJSON
- `assets/photos/selected/` — 可視化に使用する選定済み写真

元写真、写真処理、GPX整形は `-3DMAP_DataPipeline` で管理します。Pipelineから受け取った公開可能な成果物だけを `assets/` に配置します。

## ローカル表示

ES Modulesと3Dモデルを読み込むため、`index.html` を直接開かず、ローカルWebサーバー経由で表示してください。
