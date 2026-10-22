# AGENTS.md

このファイルは、本リポジトリで作業するCodex向けの引き継ぎ事項である。作業前に `README.md` も確認すること。

## プロジェクト

柏駅周辺の移動・観察データを3D地図と時間軸で表示する、ビルド不要の静的Webサイトである。

## 最初に確認すること

1. `git status --short` で既存変更を確認する。
2. ユーザーや他のCodexの変更を許可なく戻さない。
3. 変更対象と、そのファイルを参照するHTMLやJavaScriptを確認する。

## 変更先

| 変更内容 | 変更先 |
| --- | --- |
| 3Dモデル | `3Dmodel/` |
| サイト全体 | `time-space-graph/` |
| 通常機能 | `time-space-graph/js/features/` |
| 統計モード | `time-space-graph/statistics/` |
| 色、座標、データ一覧 | `time-space-graph/js/config.js` |
| 3Dマップ初期化 | `time-space-graph/js/mapDisplay.js` |
| 公開API設定 | `time-space-graph/js/publicRouteApi.js` |

統計モードだけで使用する処理は `statistics/` に置く。新しいトップレベルフォルダは、明確な役割がない限り作らない。

## 現在のデータ状態

- 写真データは置いていない。
- GPXファイルは置いていない。
- `GPX_FILES` にはAPIデータを画面へ対応付けるメタデータだけを置く。
- 3Dモデルは `Kashiwa_3Dmap.glb` のみである。

## ローカル確認

```powershell
python -m http.server 8000
```

確認先は次のとおりである。

- `http://localhost:8000/`
- `http://localhost:8000/time-space-graph/`

JavaScriptの構文を確認する。

```powershell
Get-ChildItem time-space-graph -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

ブラウザコンソールのエラー、3Dモデルの404、表示切り替え、統計モードを確認する。

## 作業終了時

変更ファイル、確認内容、未確認事項、削除やURL変更の有無を報告する。
