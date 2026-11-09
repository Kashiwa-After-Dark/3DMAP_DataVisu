// Historical context is a dated snapshot, not a live railway/weather feed.
const OCTOBER_23 = Object.freeze({
  date: "2026-10-23",
  station: { lat: 35.8623276, lon: 139.9710664 },
  mapSource: "https://www.openstreetmap.org/node/3012068710",
  operation: [
    { name: "JR常磐線快速・常磐線", text: "16–21時：遅延証明なし。21時〜終電：5〜10分の遅延。", source: "https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=jobanline_rapidservice", label: "JR公式履歴" },
    { name: "JR常磐線各駅停車", text: "全時間帯：遅延証明なし。", source: "https://traininfo.jreast.co.jp/train_info/line.aspx?gid=1&lineid=jobanline_local", label: "JR公式履歴" },
    { name: "東武アーバンパークライン", text: "10時〜終電：遅延証明なし（提供資料）。", source: "https://www.tobu.co.jp/railway/useful/delay/detail/11/2026-10-23/1/", label: "東武公式ページ" },
  ],
  operationNote: "路線全体の記録で、柏駅の個別列車の遅れではありません。証明なしは完全な定時運行を保証しません。東武の値は提供資料に基づき、公式本文の再確認は未完了です。",
  weather: {
    station: "我孫子アメダス（柏駅の近隣観測所）",
    source: "https://www.data.jma.go.jp/stats/etrn/view/hourly_a1.php?block_no=0376&day=23&month=10&prec_no=45&view=a2s&year=2026",
    hours: [
      { hour: 18, temperature: 15.9, precipitation: 0.0, wind: 0.3 },
      { hour: 19, temperature: 16.2, precipitation: 0.0, wind: 0.7 },
      { hour: 20, temperature: 15.8, precipitation: 0.0, wind: 0.8 },
      { hour: 21, temperature: 16.2, precipitation: 0.0, wind: 1.2 },
      { hour: 22, temperature: 16.2, precipitation: 0.0, wind: 1.1 },
      { hour: 23, temperature: 16.3, precipitation: 0.0, wind: 1.4 },
      { hour: 24, temperature: 16.4, precipitation: 0.0, wind: 0.8 },
    ],
  },
});

export function getStationContext(date) {
  return date === OCTOBER_23.date ? OCTOBER_23 : null;
}
