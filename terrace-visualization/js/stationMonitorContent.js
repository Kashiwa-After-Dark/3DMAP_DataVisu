/** ファイル概要: 保存済みの調査日情報と表示中の観察記録からモニター表示文を作る。 */
export function monitorContent(data, records = [], period = "all") {
  const label = ["18–20", "20–22", "22–24"][Number(period)];
  const temperatures = data?.weather.hours.map((row) => row.temperature) || [];
  const rain = data?.weather.hours.map((row) => row.precipitation) || [];
  return {
    date: data?.date || "日付未登録",
    period: period === "all" ? "18–24時" : `${label || "対象"}時`,
    weather: temperatures.length ? `気温 ${Math.min(...temperatures).toFixed(1)}–${Math.max(...temperatures).toFixed(1)}℃` : "天候資料なし",
    rain: rain.length ? `各時刻の降水量 ${Math.min(...rain).toFixed(1)}–${Math.max(...rain).toFixed(1)}mm` : "降水資料なし",
    weatherNote: data ? `${data.weather.station} · 18–24時の参考記録` : "天候資料なし",
    operations: data?.operation.map((row) => `${row.name}：${row.text}`) || ["運行資料なし"],
    count: records.length,
  };
}
