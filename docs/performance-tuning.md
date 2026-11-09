# ルートヒストリー軽量化の引き継ぎ

## 範囲とデータ

- 担当区分: ルートヒストリー。共通の地図初期化とHTMLは、描画解像度とキャッシュ更新に必要な箇所のみ変更。
- 対象日: `2026-10-23`。公開APIで8軌跡・460観察メモを確認。
- API形式、対象日、件数、データ分類・保存済み英訳は変更していない。
- 今回の軽量化ではバックエンド・統計画面・CSSは編集していない。既存の未コミット変更は保持。
- ファイルの削除・移動、公開URL変更、コミット・プッシュは行っていない。

## 変更内容

- フィルター結果と所属判定をキャッシュし、同じ条件の全件判定を繰り返さない。
- 再生中の集計・DOM更新を最大25回/秒に制限。カメラ、描画、矢印・液体のアニメーションは継続し、終了位置は必ず更新する。
- カード一覧の入力と表示条件が同じなら並べ替え・DOM再生成を省略。言語・感情の視点変更時は更新する。
- アイコン画像を色・形・塗り状態ごとに共有し、画像サイズを256から128へ縮小。個別の透明度と人数別サイズは保持。
- 非表示中のアイコン更新と、変わっていないコンパスのDOM更新を省略。
- 行動の方向集計を、対象メモが変わったときだけ再計算。
- 感情の液体描画を密度のある範囲へ限定。空データでは液体を非表示にし、探索回数を64から48へ削減。
- 高DPI画面の3D描画解像度に上限を設定。感情モードは通常より低い上限とし、HTMLの文字解像度は変更しない。

## 変更ファイル

- `time-space-graph/index.html`: 起動JSのキャッシュ識別子。
- `time-space-graph/js/index.js`: キャッシュと更新間隔の連携、不要更新の省略。
- `time-space-graph/js/mapDisplay.js`: 初期描画の解像度上限。
- `time-space-graph/js/features/memoFilterCache.js`: フィルター結果の保持（新規）。
- `time-space-graph/js/features/playbackCadence.js`: 再生時の更新間隔管理（新規）。
- `time-space-graph/js/features/renderQuality.js`: 描画品質と密度範囲の計算（新規）。
- `time-space-graph/js/features/memoPanel.js`: カードの並べ替えと生成の省略。
- `time-space-graph/js/features/markers.js`: アイコン画像の共有。
- `time-space-graph/js/features/instruments.js`: コンパス更新の省略。
- `time-space-graph/js/features/activityFlow.js`: 方向集計の再利用。
- `time-space-graph/js/features/impressionFluid.js`: 液体描画の負荷削減。
- `time-space-graph/js/features/impressionVolume.js`: 液体JSのキャッシュ識別子。
- `tests/performanceCaches.test.mjs` / `tests/memoPanelPerformance.test.mjs`: 回帰テスト（新規）。
- `tests/benchmarkPlayback.mjs`: 実データによる任意の比較測定（新規）。

## 確認結果

- 自動テスト47件が成功。ルートヒストリー全JSの構文確認と差分空白検査を実施。
- 実データ460件で同一条件を1000回利用した比較: 条件判定460,000回から460回。両方式の結果件数は一致。
- 再測定時のCPU時間は372.86msから0.74ms。これは限定した処理の測定で、サイト全体の速度倍率やブラウザFPSではない。
- 30秒・1801フレームの再生模擬では601回のデータ更新となり、最終時刻21600秒に到達。
- ブラウザで年齢フィルター、行動再生と終端、感情表示・観察者/対象の切替・肯定的フィルター、カードのEnter選択と解除を確認。
- 1280x720、760x640で液体と地図が描画されることを確認。統計画面も460件を読み込み、エラー出力なし。
- 最終確認中に既存タブの再読み込みが初期化待ちのままになった。新規タブでは起動・実データ表示・操作が成功。再発時はモジュール/CDN/API通信の待ちを調査する。

## 注意点・次の確認

- 全端末でのFPS・GPU使用量は未測定。高DPI画面では3Dの輪郭が以前よりやや柔らかくなる可能性がある。
- 小画面の既存フッターは一部説明が横に収まりにくい。今回は軽量化に限定し、レイアウトは変更していない。
- メモ配列は読み込み後に分類・時刻を直接書き換えない前提。今後そのような編集を追加する場合はフィルターキャッシュも無効化すること。
- 統計担当: 今回は表示確認のみ。統計集計の軽量化は未実施。
- 共通担当: 対象日、API、保存済み感情・翻訳の対応を維持したまま、他端末で初期読み込みと高DPI表示を確認すること。

## 再確認コマンド

```powershell
node --test @((Get-ChildItem tests -Filter '*.test.mjs').FullName)
node tests/benchmarkPlayback.mjs
Get-ChildItem time-space-graph -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
git diff --check
```
