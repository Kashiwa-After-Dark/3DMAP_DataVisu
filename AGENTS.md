# AGENTS.md

このファイルは、本リポジトリで作業する人とCodex向けの共通引き継ぎ事項である。作業前に本ファイルと `README.md` を必ず確認すること。

## プロジェクト

柏駅周辺の移動軌跡と観察データを、3D地図、スペースタイムキューブ、統計モードで表示するビルド不要の静的Webサイトである。

## 最重要事項

- 現在APIに登録され、画面確認に使用できるデータは春学期調査の `2026-07-07` データである。
- 春学期データは現在の成果物では使用しない。ただし、比較や今後の分析で利用する可能性があるため、削除しないこと。
- 今後サイトで使用する本番データは、`2026-10-23` の調査データである。
- 対象日は`2026-10-23`へ切り替え済みである。API公開前は空状態を表示し、春学期データへ自動で戻さないこと。両データを意図せず混在させないこと。
- データ切り替え時は、`backend/surveyConfig.js` の `PUBLIC_SURVEY_DATE` を変更する。
- APIが返す `sourceFilename` と `backend/surveyConfig.js` の `ROUTE_SOURCES` が一致しないデータは画面に表示されない。10月23日調査では2つの観察CSVを1つの論理ルートへまとめる。
- 10月23日調査の画面上の選択単位は担当者ではなく、`18–20`、`20–22`、`22–24`の時間帯とする。

## データ変更の禁止と承認

- ユーザーの明示的な依頼・承認なしに、元データやAPI・データベース内のデータを追加、更新、削除、上書き、再投入しない。誤りと思われる値や欠損も、勝手に補正・補完しない。
- 保護対象は、GPX・CSV・観察文・座標・時刻・人数・属性・行動・感情・場所コード・意味名・翻訳など、調査記録とその定義全般である。
- 対象日、API接続先、`sourceFilename` の対応、論理ルート、`PUBLIC_SURVEY_DATE`、`ROUTE_SOURCES`、分類・集計の定義も、許可なく切り替えたり変更したりしない。
- デザイン調整、可視化、軽量化、ファイル整理、コミット・マージ・プッシュの依頼は、データ変更の許可を意味しない。表示用の絞り込み・集計は元データと分離し、保存データへ書き戻さない。
- データや定義の変更が必要になった場合は、対象・変更理由・変更前後・件数や既存画面への影響を説明し、承認を得てから実施する。承認は指定された範囲だけに適用する。
- 変更後は対象日・件数・変更箇所を確認して報告する。承認がない場合は、読み取りと表示処理だけにとどめる。本書のデータ切り替え手順も、承認後にのみ実施する。

## API構成

サイトはGPXファイルを直接読み込まず、Supabase Edge Functionの公開APIから移動軌跡と観察メモを取得する。

| 項目 | 内容 |
| --- | --- |
| APIクライアント | `backend/publicRouteApi.js` |
| データ取得と画面用変換 | `backend/routeData.js` |
| 対象日 | `PUBLIC_SURVEY_DATE` |
| 論理ルート、表示名、対象CSV | `backend/surveyConfig.js` の `ROUTE_SOURCES` |
| API | Supabase Edge Function `public-route-history` |

公開サイトからは読み取り専用Edge Functionを呼び出す。Supabaseの秘密鍵やサービスロールキーをブラウザ側のHTML・CSS・JavaScriptへ書かないこと。API設定やデータ対応を変更した場合は、ルート件数、観察メモ件数、`sourceFilename`、ブラウザ表示を確認すること。

## 3人の担当

担当者名が決まるまでは、次の担当名をブランチ名、コミット、引き継ぎで使用する。

| 担当 | 主な作業 | 主な変更先 |
| --- | --- | --- |
| バックエンド・共通機能担当 | API、データ変換、設定、3Dモデル読み込み、複数モードに関わる機能 | `backend/`、`space-time-cube/js/screen-control/`、共通HTML・CSS |
| スペースタイムキューブ担当 | 軌跡表示、時間再生、タイムライン、時間帯選択、観察メモ、地図操作 | `space-time-cube/js/timeline/`、`data-display/`、`filters/`、各可視化フォルダ |
| 統計モード担当 | 集計、グラフ、ワードクラウド、統計画面の操作と表示 | `statistics/index.html`、`statistics/style.css`、`statistics/statistics.js` |

担当外のファイルを変更する必要がある場合は、変更理由と影響範囲を先に共有すること。特に `index.html`、`screen-control/settings.js`、`backend/routeData.js`、共通CSSは競合しやすいため、同時編集を避けること。

## ディレクトリと所有範囲

| 場所 | 役割 | 主担当 |
| --- | --- | --- |
| `3Dmodel/` | 3D都市モデル | バックエンド・共通機能担当 |
| `space-time-cube/index.html` | サイト画面の共通構造 | 変更前に3人で共有 |
| `space-time-cube/style.css` | スペースタイムキューブ画面全体の見た目 | スペースタイムキューブ担当 |
| `space-time-cube/js/screen-control/` | 起動、設定、3D・2D地図、カメラ | バックエンド・共通機能担当 |
| `space-time-cube/js/hint-mode/` | ヒントモード | スペースタイムキューブ担当 |
| `space-time-cube/js/language-mode/` | 日本語・英語切り替え | スペースタイムキューブ担当 |
| `space-time-cube/js/header-footer/` | ヘッダー、フッター、パネル収納 | スペースタイムキューブ担当 |
| `space-time-cube/js/timeline/` | タイムライン、時間帯、再生操作 | スペースタイムキューブ担当 |
| `space-time-cube/js/data-display/` | カードデッキ、観察メモ、マーカー | スペースタイムキューブ担当 |
| `space-time-cube/js/filters/` | 属性・感情・行動の絞り込み | スペースタイムキューブ担当 |
| `space-time-cube/js/movement-visualization/` | ルート、移動、滞在、駅方向の可視化 | スペースタイムキューブ担当 |
| `space-time-cube/js/impression-visualization/` | 感情・印象の3D可視化 | スペースタイムキューブ担当 |
| `statistics/` | 統計画面のHTML、CSS、JavaScript各1ファイル | 統計モード担当 |
| `terrace-visualization/index.html` | テラス画面の構造 | バックエンド・共通機能担当 |
| `terrace-visualization/style.css` | テラス画面全体の見た目 | バックエンド・共通機能担当 |
| `terrace-visualization/js/` | テラス画面の機能別処理 | バックエンド・共通機能担当 |
| `backend/publicRouteApi.js` | 公開API呼び出し | バックエンド・共通機能担当 |
| `backend/routeData.js` | APIデータの画面用変換 | バックエンド・共通機能担当 |
| `backend/surveyConfig.js` | 対象日と論理ルート設定 | バックエンド・共通機能担当 |
| `space-time-cube/js/screen-control/map-display.js` | 3Dマップ初期化 | バックエンド・共通機能担当 |

統計モードだけで使用する処理は `statistics/` に置く。スペースタイムキューブだけで使用する処理は、役割に合わせて `space-time-cube/js/` 内の分類フォルダへ置く。両画面が使うデータ取得・変換は`backend/`に置く。

## ディレクトリ構成とファイル役割の早見表

各HTML・CSS・JavaScript・テストファイルの先頭にも、そのファイルの役割を `ファイル概要` として記載している。編集先に迷った場合は、次の箇条書きから対象フォルダを選び、ファイル先頭の説明を確認すること。

### ルートと共通データ

- `index.html`: 公開サイトの入口であり、各画面への遷移を担当する。
- `3Dmodel/Kashiwa_3Dmap.glb`: スペースタイムキューブとテラス可視化で使用する3D都市モデルである。
- `backend/publicRouteApi.js`: Supabaseの読み取り専用公開APIを呼び出す。
- `backend/routeData.js`: APIレスポンスを各画面で扱うルート・観察データへ変換する。
- `backend/surveyConfig.js`: 対象日、論理ルート、対象CSVを定義する。承認なしに変更しない。
- `backend/profiles.js`: APIデータソースと表示用プロフィールの対応を管理する。
- `backend/activityClassifier.js`: 観察文から行動を分類する。
- `backend/impressionClassifier.js`: 観察文または保存済み判定から印象を分類する。
- `backend/storedEmotion.js`: データベースで確認済みの感情分類を読み取る。
- `backend/translatedMemo.js`: 保存済み英訳と日本語原文を表示言語に応じて選ぶ。
- `backend/visualEncoding.js`: 属性や行動の色・形を共通定義する。

### スペースタイムキューブ

- `space-time-cube/index.html`: 画面構造と操作部品を定義する。
- `space-time-cube/style.css`: 画面全体の配置、色、レスポンシブ表示を定義する。
- `js/screen-control/app.js`: 画面を起動し、全機能と描画更新を連携する。
- `js/screen-control/settings.js`: 座標、色、時間軸、カメラの画面設定を定義する。
- `js/screen-control/map-display.js`: Three.jsと3D都市モデルを初期化する。
- `js/screen-control/map-2d.js`: 2D表示用のカメラと操作を管理する。
- `js/screen-control/camera.js`: 3Dカメラの移動・ズーム範囲を制限する。
- `js/screen-control/view-mode.js`: 3D表示と2D表示を切り替える。
- `js/screen-control/render-quality.js`: 端末に応じて描画解像度を調整する。
- `js/hint-mode/hint-mode.js`: 画面内の操作ヒントを表示する。
- `js/language-mode/language-mode.js`: 日本語・英語表示を切り替える。
- `js/language-mode/observation-translations.js`: UIと観察内容の英語表示文を管理する。
- `js/header-footer/toolbar-menus.js`: ヘッダーのメニューを開閉する。
- `js/header-footer/taskbar-visibility.js`: ヘッダーとフッターの表示状態を管理する。
- `js/header-footer/panel-storage.js`: カードデッキなどの収納状態を管理する。
- `js/timeline/time-period-filter.js`: 3つの調査時間帯を選択する。
- `js/timeline/timeline-range.js`: タイムラインの目盛り、表示範囲、再生範囲を管理する。
- `js/timeline/timeline-keyboard.js`: キーボードによる時間操作を管理する。
- `js/timeline/instruments.js`: 時計、方角、再生速度を表示する。
- `js/timeline/playback-cadence.js`: 再生中の重い画面更新を抑える。
- `js/data-display/memo-panel.js`: カードデッキへ観察メモを表示する。
- `js/data-display/memo-scroller.js`: 選択したカードまでスクロールする。
- `js/data-display/memo-top-down-view.js`: メモ選択時の真上カメラを管理する。
- `js/data-display/memo-filter-cache.js`: 絞り込み結果を再利用する。
- `js/data-display/markers.js`: 観察点と時間軸ラベルを3D空間へ配置する。
- `js/data-display/coordinate-connector.js`: 観察点とカード情報を線で結ぶ。
- `js/data-display/route-selection.js`: 選択中のルートを強調する。
- `js/data-display/place-selection.js`: 場所・レーンの選択状態を管理する。
- `js/filters/filter-panel.js`: 絞り込みUIと3分類の判定をまとめる。
- `js/filters/filter-display-mode.js`: 属性・感情・行動の色分けを切り替える。
- `js/filters/attributes/attribute-filter.js`: 年齢、グループ、性別、人数、ソース、キーワードで絞り込む。
- `js/filters/attributes/assignee-filter.js`: 担当・データソースの選択UIを管理する。
- `js/filters/emotions/emotion-filter.js`: 感情・印象で絞り込む。
- `js/filters/activities/activity-filter.js`: 行動分類で絞り込む。
- `js/movement-visualization/activity-flow.js`: 移動・滞在・駅方向の可視化全体を連携する。
- `js/movement-visualization/average-route-model.js`、`continuous-average-route.js`、`specified-activity-route.js`: 代表ルートと分析用ルートを計算する。
- `js/movement-visualization/activity-playback-position.js`、`activity-playback-head.js`: 再生時刻の位置を計算・表示する。
- `js/movement-visualization/activity-presentation.js`、`activity-trip-geometry.js`、`activity-trips.js`: 移動データを整理し、人の移動アニメーションを作る。
- `js/movement-visualization/flow-arrows.js`、`flow-arrow-motion.js`: 駅方向の人数を矢印で表示・再生する。
- `js/movement-visualization/route-activity-density.js`、`route-activity-line.js`、`route-direction-color.js`: ルート上の行動密度と方向色を計算・描画する。
- `js/movement-visualization/staying-activity-model.js`、`staying-activity-points.js`: 滞在地点を判定・描画する。
- `js/movement-visualization/station-direction-model.js`、`station-direction-summary.js`、`station-flow-view.js`: 柏駅へ向かう・離れる流れを集計・表示する。
- `js/movement-visualization/activity-layer-filter.js`: 移動と滞在の表示レイヤーを切り替える。
- `js/movement-visualization/kashiwa-road-reference.js`: 柏駅周辺の道路基準座標を保持する。
- `js/impression-visualization/emotion-perspective.js`: 観察者と観察対象の感情を分けて判定する。
- `js/impression-visualization/impression-density.js`、`impression-fluid.js`: 印象密度を計算し、流体状に描画する。
- `js/impression-visualization/impression-volume-model.js`、`impression-volume.js`: 時間帯別の印象件数を集計し、3D表示する。
- `js/shared/formatters.js`: 時刻、色、図形の共通表示処理を提供する。

### 統計モード

- `statistics/index.html`: 統計画面の構造と表示領域を定義する。
- `statistics/style.css`: 統計画面とグラフの見た目を定義する。
- `statistics/statistics.js`: データ取得、集計、グラフ、ワードクラウド、画面操作を一括管理する。

### テラス可視化

- `terrace-visualization/index.html`: テラス画面の構造と操作部品を定義する。
- `terrace-visualization/style.css`: 地図、観察一覧、集計パネルの見た目を定義する。
- `terrace-visualization/js/index.js`: テラス画面を起動し、各機能を連携する。
- `terrace-visualization/js/config.js`: 対象日、対象ソース、3DモデルURLを定義する。
- `terrace-visualization/js/observationData.js`: 公開APIから観察データを読み込む。
- `terrace-visualization/js/observationModel.js`: 観察データをテラス画面用に抽出・正規化する。
- `terrace-visualization/js/mapView.js`、`model.js`、`cameraFit.js`、`geoProjection.js`: 3D地図、モデル、カメラ、座標変換を管理する。
- `terrace-visualization/js/observationMarkers.js`、`observationPanel.js`: 観察地点と観察一覧を表示する。
- `terrace-visualization/js/placeSummaryModel.js`、`placeSummary.js`: 場所コード別の観察内容を集計・表示する。
- `terrace-visualization/js/stationContextData.js`、`stationContext.js`: 調査日の天候と鉄道状況を保持・表示する。
- `terrace-visualization/js/toolbar.js`: 時間帯、場所、表示切り替え操作を管理する。

### テスト

- `tests/`: スペースタイムキューブ、共通データ処理、テラス可視化の仕様を自動確認する。
- `terrace-visualization/tests/modelAsset.test.mjs`: 3Dモデル参照先とファイルの存在を確認する。
- テストファイルの先頭に、何を確認するテストかを `ファイル概要` として記載している。

## データ切り替え手順

10月23日データを利用可能になったら、次の順番で切り替える。

1. APIへ `date=2026-10-23` を指定し、ルートと観察メモが返ることを確認する。
2. APIレスポンスの全 `sourceFilename` を確認する。
3. `backend/surveyConfig.js` の `ROUTE_SOURCES` を10月23日の論理ルートと対象CSVに合わせる。
4. `backend/surveyConfig.js` の `PUBLIC_SURVEY_DATE` を `2026-10-23` に変更する。
5. キャッシュ対策の `?v=...` を関連ファイルだけ更新する。
6. スペースタイムキューブと統計モードの両方で、表示件数と3つの時間帯選択を確認する。
7. 春学期データをAPIやデータベースから削除していないことを確認する。

## Codex作業開始時

1. `git status --short` と `git branch --show-current` で既存変更とブランチを確認する。
2. 本ファイルの担当表から、自分の作業範囲を確認する。
3. ユーザーや他のCodexが作成した未コミット変更を許可なく戻さない。
4. 変更対象と、そのファイルを参照するHTMLやJavaScriptを確認する。
5. 他担当と重なるファイルがある場合は、編集前にユーザーへ伝える。

## 共同開発ルール

- 2026-11-11以降、この作業ではテラス専用画面 `terrace-visualization/` を対象とする。ユーザーから新たな明示的指示がない限り、スペースタイムキューブ `space-time-cube/` と統計画面 `statistics/` は編集・移動・削除しない。
- 1つの作業では1つの目的だけを扱い、担当外の整理やリファクタリングを混ぜない。
- コミットメッセージには、`API`、`スペースタイムキューブ`、`統計` のいずれを変更したか分かる表現を入れる。
- APIレスポンス形式を変更する場合は、スペースタイムキューブ担当と統計モード担当へ影響を共有する。
- `sourceFilename`、論理ルート、対象日は、推測で変更しない。APIの実データを確認する。
- 写真、GPX、生成物、秘密情報をリポジトリへ追加しない。
- 他担当の変更を含むブランチで作業する場合も、その変更を勝手に削除・修正しない。

## ローカル確認

リポジトリのルートで次を実行する。

```powershell
python -m http.server 8000
```

確認先は次のとおりである。

- `http://localhost:8000/`
- `http://localhost:8000/space-time-cube/`

JavaScriptの構文を確認する。

```powershell
Get-ChildItem "space-time-cube" -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

最低限、次を確認する。

1. APIエラーとブラウザコンソールエラーがない。
2. 対象日、論理ルート数、観察メモ件数、時間帯が想定どおりである。
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
