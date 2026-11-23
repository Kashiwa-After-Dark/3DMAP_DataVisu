/**
 * ファイル概要: ユーザー提供の人物イラストを定義し、表示専用に観察の行動・着座・属性と対応させる。
 */
import { isTerraceProtest } from "./protestObservation.js";

const sequence = (folder) => Object.freeze(Array.from({ length: 8 }, (_, i) => `../assets/people/${folder}/frame-${String(i + 1).padStart(2, "0")}.png`));
const still = (folder) => Object.freeze([`../assets/people/${folder}/illustration-v1.png`]);

export const PEOPLE_ILLUSTRATIONS = Object.freeze({
  protest: Object.freeze({
    label: "抗議活動（代表イラスト）",
    frames: Object.freeze(["../assets/people/protest/v4-sprite-sheet.png"]),
    tiles: Object.freeze([[0, 1], [1, 1], [0, 0], [1, 1]]),
    fps: 2.5, aspect: 1.5,
  }),
  skate: Object.freeze({ label: "スケボー", frames: sequence("skate"), fps: 6, aspect: 1 }),
  walk: Object.freeze({ label: "歩行（代表イラスト）", frames: sequence("walk"), fps: 8, aspect: 1 }),
  "jk-dance": Object.freeze({ label: "女子高校生・撮影／ダンス", frames: sequence("jk-dance"), fps: 5, aspect: 1 }),
  "bench-jk": Object.freeze({ label: "女子高校生グループ・着座", frames: still("bench-jk"), fps: 0, aspect: 1410 / 1116 }),
  "bench-couple": Object.freeze({ label: "カップル・着座（代表イラスト）", frames: still("bench-couple"), fps: 0, aspect: 1312 / 1199 }),
  "bench-dk": Object.freeze({ label: "男子高校生グループ・着座", frames: still("bench-dk"), fps: 0, aspect: 1536 / 1024 }),
});

export function illustrationForRecord(record, code) {
  if (isTerraceProtest(record, code)) return "protest";
  const activity = record.activity || "";
  const motions = (record.motion || "").split("|").map((value) => value.trim());
  const group = record.groupType;
  if (!record.isObject && (group === "couple" || group === "CP")
    && motions.some((motion) => ["sitting", "standing", "staying", "stationary"].includes(motion))
    && !motions.some((motion) => ["walking", "running", "cycling"].includes(motion))
    && !["to_station", "from_station", "crossing"].includes(record.direction)) return "bench-couple";
  if (/スケボー|スケートボード/u.test(activity) && !/見て|見学|していない|してない/u.test(activity)) return "skate";
  const highSchool = record.age === "high_school";
  const sitting = motions.includes("sitting");
  const multiple = Number(record.count) >= 2;
  if (code === "TR-05" && sitting) {
    if (highSchool && record.gender === "female" && (group === "GG" || multiple)) return "bench-jk";
    if (highSchool && record.gender === "male" && (group === "BG" || multiple)) return "bench-dk";
  }
  if (code === "TR-06" && /TikTok|ダンス|踊/iu.test(activity) && highSchool && record.gender === "female" && (group === "GG" || multiple)) return "jk-dance";
  return null;
}
