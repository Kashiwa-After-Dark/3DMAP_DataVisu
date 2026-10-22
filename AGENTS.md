# AGENTS.md

このファイルは、本リポジトリで作業する人とCodex向けの共通引き継ぎ事項である。作業前に本ファイルと `README.md` を必ず確認すること。

## プロジェクト

柏駅周辺の移動軌跡と観察データを、3D地図、ルートヒストリー、統計モードで表示するビルド不要の静的Webサイトである。

## 最重要事項

- 現在APIに登録され、画面確認に使用できるデータは春学期調査の `2026-07-07` データである。
- 春学期データは現在の成果物では使用しない。ただし、比較や今後の分析で利用する可能性があるため、削除しないこと。
- 今後サイトで使用する本番データは、`2026-10-23` の調査データである。
- 10月23日データがAPIで公開されるまでは、春学期データを動作確認用として扱う。両データを意図せず混在させないこと。
- データ切り替え時は、`time-space-graph/js/publicRouteApi.js` の `PUBLIC_SURVEY_DATE` を `2026-10-23` に変更する。
- APIが返す `sourceFilename` と `time-space-graph/js/config.js` の `GPX_FILES` が一致しないデータは画面に表示されない。日付変更だけで完了とせず、担当者メタデータも必ず確認すること。

## API構成

サイトはGPXファイルを直接読み込まず、Supabase Edge Functionの公開APIから移動軌跡と観察メモを取得する。

| 項目 | 内容 |
| --- | --- |
| APIクライアント | `time-space-graph/js/publicRouteApi.js` |
| データ取得と画面用変換 | `time-space-graph/js/gpxData.js` |
| 対象日 | `PUBLIC_SURVEY_DATE` |
| 担当者、表示名、レーン | `time-space-graph/js/config.js` の `GPX_FILES` |
| API | Supabase Edge Function `public-route-history` |

公開サイトからは読み取り専用Edge Functionを呼び出す。Supabaseの秘密鍵やサービスロールキーをブラウザ側のHTML・CSS・JavaScriptへ書かないこと。API設定やデータ対応を変更した場合は、ルート件数、観察メモ件数、`sourceFilename`、ブラウザ表示を確認すること。

## 3人の担当

担当者名が決まるまでは、次の担当名をブランチ名、コミット、引き継ぎで使用する。

| 担当 | 主な作業 | 主な変更先 |
| --- | --- | --- |
| バックエンド・共通機能担当 | API、データ変換、設定、3Dモデル読み込み、複数モードに関わる機能 | `publicRouteApi.js`、`gpxData.js`、`config.js`、`mapDisplay.js`、共通HTML・CSS |
| ルートヒストリー担当 | 軌跡表示、時間再生、タイムライン、担当者選択、観察メモ、地図操作 | `time-space-graph/js/index.js`、`time-space-graph/js/features/` |
| 統計モード担当 | 集計、グラフ、ワードクラウド、統計画面の操作と表示 | `time-space-graph/statistics/` |

担当外のファイルを変更する必要がある場合は、変更理由と影響範囲を先に共有すること。特に `index.html`、`config.js`、`gpxData.js`、共通CSSは競合しやすいため、同時編集を避けること。

## ディレクトリと所有範囲

| 場所 | 役割 | 主担当 |
| --- | --- | --- |
| `3Dmodel/` | 3D都市モデル | バックエンド・共通機能担当 |
| `time-space-graph/index.html` | サイト画面の共通構造 | 変更前に3人で共有 |
| `time-space-graph/css/` | サイト全体の見た目 | 機能の主担当。共通部分は共有 |
| `time-space-graph/js/index.js` | ルートヒストリー全体の起動と連携 | ルートヒストリー担当 |
| `time-space-graph/js/features/` | ルート、時間軸、フィルターなど | ルートヒストリー担当 |
| `time-space-graph/statistics/` | 統計モード専用処理 | 統計モード担当 |
| `time-space-graph/js/publicRouteApi.js` | 公開API呼び出し | バックエンド・共通機能担当 |
| `time-space-graph/js/gpxData.js` | APIデータの画面用変換 | バックエンド・共通機能担当 |
| `time-space-graph/js/config.js` | 対象データの表示設定 | バックエンド・共通機能担当 |
| `time-space-graph/js/mapDisplay.js` | 3Dマップ初期化 | バックエンド・共通機能担当 |

統計モードだけで使用する処理は `statistics/` に置く。ルートヒストリーだけで使用する処理は `js/features/` に置く。新しいトップレベルフォルダは、明確な役割がない限り作らない。

## データ切り替え手順

10月23日データを利用可能になったら、次の順番で切り替える。

1. APIへ `date=2026-10-23` を指定し、ルートと観察メモが返ることを確認する。
2. APIレスポンスの全 `sourceFilename` を確認する。
3. `config.js` の `GPX_FILES` を10月23日の担当者、表示名、レーンに合わせる。
4. `publicRouteApi.js` の `PUBLIC_SURVEY_DATE` を `2026-10-23` に変更する。
5. キャッシュ対策の `?v=...` を関連ファイルだけ更新する。
6. ルートヒストリーと統計モードの両方で、表示件数と担当者を確認する。
7. 春学期データをAPIやデータベースから削除していないことを確認する。

## Codex作業開始時

1. `git status --short` と `git branch --show-current` で既存変更とブランチを確認する。
2. 本ファイルの担当表から、自分の作業範囲を確認する。
3. ユーザーや他のCodexが作成した未コミット変更を許可なく戻さない。
4. 変更対象と、そのファイルを参照するHTMLやJavaScriptを確認する。
5. 他担当と重なるファイルがある場合は、編集前にユーザーへ伝える。

## 共同開発ルール

- 1つの作業では1つの目的だけを扱い、担当外の整理やリファクタリングを混ぜない。
- コミットメッセージには、`API`、`ルートヒストリー`、`統計` のいずれを変更したか分かる表現を入れる。
- APIレスポンス形式を変更する場合は、ルートヒストリー担当と統計モード担当へ影響を共有する。
- `sourceFilename`、担当者名、レーン、対象日は、推測で変更しない。APIの実データを確認する。
- 写真、GPX、生成物、秘密情報をリポジトリへ追加しない。
- 他担当の変更を含むブランチで作業する場合も、その変更を勝手に削除・修正しない。

## ローカル確認

リポジトリのルートで次を実行する。

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

最低限、次を確認する。

1. APIエラーとブラウザコンソールエラーがない。
2. 対象日、ルート件数、観察メモ件数、担当者が想定どおりである。
3. 3Dモデルが404になっていない。
4. ルート表示、時間再生、フィルターが動作する。
5. 統計モードへ切り替えられ、集計が表示される。

## Codex作業終了時

最終報告と次のCodexへの引き継ぎには、次を記載する。

- 担当区分と実施した作業
- 変更したファイル
- 使用したデータの日付
- APIレスポンス形式や件数の変更
- 実施した確認
- 未確認事項と既知の問題
- 他担当が次に確認すべき箇所
- 削除、移動、公開URL変更の有無

作業途中で終了する場合は、完了済み、未完了、次に行う操作を具体的に残すこと。
