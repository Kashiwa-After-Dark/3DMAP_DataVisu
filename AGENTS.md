# AGENTS.md

このファイルは、本リポジトリで作業するCodex向けの共通引き継ぎ事項である。
作業前に `README.md` と `docs/ARCHITECTURE.md` も確認すること。

## プロジェクト概要

柏駅周辺の調査データを扱う、ビルド不要の静的Webアプリである。

- `route-history/`: GPXの移動軌跡、観察メモ、時間変化を可視化する。
- `photo-visualization/`: 夜間写真と3D都市モデルを重ねて表示する。
- `shared/`: 両サイトで共有する3Dマップ初期化と設定を置く。
- `assets/`: 3Dモデル、GPX、公開用写真を置く。

ルートの `index.html` は `route-history/` へ転送する。
旧URL互換のため、`phtos_DataVisu/` は `photo-visualization/` への転送ページとして残している。

## 作業開始時

1. `git status --short` で既存変更を確認する。
2. ユーザーや他のCodexが作成した未コミット変更を、許可なく戻さない。
3. 変更対象のHTML、JavaScript、CSSと、その参照元を先に確認する。
4. 担当者名ではなく、サイトまたは機能単位のディレクトリへ配置する。

## 変更先の判断

| 変更内容 | 主な変更先 |
| --- | --- |
| ルート、タイムライン、統計、フィルター | `route-history/` |
| 写真一覧、写真重ね合わせ、視点調整 | `photo-visualization/` |
| カメラ、モデル読み込み、座標変換 | `shared/js/mapDisplay.js` |
| GPX一覧、色、時刻、座標設定 | `shared/js/config.js` |
| GPXファイル | `assets/data/gpx/RH01_0707/` |
| 写真ファイル | `assets/photos/selected/re_photos01/` |
| 3Dモデル | `assets/models/` |

機能固有の処理を `shared/` に入れないこと。両サイトで実際に共有する処理だけを置く。

## データ更新時の注意

- GPXの追加・削除時は `shared/js/config.js` の `GPX_FILES` も更新する。
- 写真の追加・削除時は `photo-visualization/js/photos.js` と実ファイルを一致させる。
- 通常マップは `Kashiwa_3Dmap.glb` を使用する。
- 写真表示は `kashiwa_Blosm.glb` を優先し、失敗時に `kashiwa_Blosm.fbx` を使用する。
- 公開URLを変更する場合は、ルート転送、旧URL転送、README内のURLも確認する。
- HTMLの `?v=...` はGitHub Pagesとブラウザのキャッシュ対策である。関連ファイルを変更した場合だけ更新する。

## ローカル確認

リポジトリのルートでローカルサーバーを起動する。

```powershell
python -m http.server 8000
```

確認先は次のとおりである。

- `http://localhost:8000/`
- `http://localhost:8000/route-history/`
- `http://localhost:8000/photo-visualization/`
- `http://localhost:8000/photo-visualization/dev/`

最低限、次を確認する。

1. ブラウザコンソールに読み込みエラーがない。
2. 3Dモデル、GPX、写真が404になっていない。
3. ルートヒストリーの再生、表示切り替え、フィルターが動く。
4. 写真一覧、写真切り替え、公開用と開発用のモード差が保たれている。
5. 変更したJavaScriptに構文エラーがない。

```powershell
Get-ChildItem route-history,photo-visualization,shared -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

## リポジトリ管理

- `.tmp/`、`.codex-*-build/`、`pptx-output/` は生成物であり、コミットしない。
- README掲載画像は `docs/images/` に置く。
- 成果物の文書やスライドを残す場合は、用途を確認してから `docs/` 配下へ整理する。
- 重いバイナリを追加する前に、既存ファイルとの重複と実際の参照有無を確認する。
- 無関係な整形、改名、リファクタリングを同じ変更へ混ぜない。

## 作業終了時の引き継ぎ

最終報告には次を含める。

- 変更した機能とファイル
- 実施した確認
- 未確認事項または既知の問題
- 削除、移動、公開URL変更の有無

作業途中で終了する場合は、完了済み・未完了・次に確認すべき箇所を明記する。
