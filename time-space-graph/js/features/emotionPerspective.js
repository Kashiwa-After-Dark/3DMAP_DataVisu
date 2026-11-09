import { IMPRESSION_TYPES } from "../../../backend/impressionClassifier.js?v=20261029-db1";
import {storedEmotionId} from '../../../backend/storedEmotion.js?v=20261029-db1';

export const EMOTION_PERSPECTIVES = Object.freeze([
  { id: "observer", label: "観察者の感情" },
  { id: "subject", label: "観察対象の感情" },
]);

const RULES = {
  observer: [
    ["negative", /(?:邪魔(?:だ|な|$|\s)|うるさい|うるさく|こわい|怖い|不快|心配にな|嫌|迷惑|臭い|通りにくい|通りたくない|絡まれたくない|耳痛い|歩き[づず]らい|感じ悪い|気持ち悪い|危ない|あぶない|ダサい)/u],
    ["positive", /(?:かわいい|可愛い|かっこいい|良かった|良いなと思|羨ましい|いい雰囲気|良い雰囲気|いい匂い|うまい|楽しい|嬉しい)/u],
    ["neutral", /(?:特になし|何も感じない|普通だと思|同感)/u],
  ],
  subject: [
    ["negative", /(?:楽しくなさそう|つまらなそう|悲しそう|寂しそう|寒そう|暑そう|疲れ(?:て)?そう|だるそう|大変そう|忙しそう|暇そう|迷ってそう|悩んでいる|泣いて|冷めてそう|不安そう|怖がって)/u],
    ["positive", /(?:楽しそう|たのしそう|嬉しそう|幸せそう|喜んで|笑顔|笑って|居心地良さそう|楽そう)/u],
    ["neutral", /(?:落ち着いて|落ち着い[て]?る|リラックスして|穏やかそう|真顔|無表情)/u],
  ],
};

export function getPerspectiveImpressionType(memo, perspective = "observer") {
  const stored=storedEmotionId(memo,perspective);
  if(stored!==null)return IMPRESSION_TYPES.find(type=>type.id===stored);
  // These are conservative text-based views of one mixed API field, not reported emotions.
  const text = String(memo.impression || "").trim();
  const id = (RULES[perspective] || RULES.observer).find(([, pattern]) => pattern.test(text))?.[0] || "unknown";
  return IMPRESSION_TYPES.find((type) => type.id === id);
}
