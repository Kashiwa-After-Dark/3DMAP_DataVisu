const FUNCTION_WORDS = new Set([
  "が", "を", "に", "へ", "と", "で", "や", "の", "も", "は", "から", "まで", "より", "だけ",
  "ほど", "など", "って", "て", "で", "たり", "だり", "し", "ながら", "ので", "のに", "けど",
  "けれど", "そして", "しかし", "また", "または", "および", "でも", "だから", "ため", "よう",
  "です", "ます", "でした", "ました", "だ", "だった", "である", "ない", "たい", "れる", "られる",
  "せる", "させる", "そう", "らしい", "ようだ", "いる", "ある", "いた", "する", "した", "して",
  "これ", "それ", "あれ", "この", "その", "あの", "ここ", "そこ", "ところ", "もの", "こと", "さん",
]);

const ENGLISH_FUNCTION_WORDS = new Set([
  "the", "and", "or", "but", "for", "with", "from", "into", "onto", "over", "under", "outside",
  "inside", "this", "that", "these", "those", "there", "here", "just", "very", "more", "most",
  "was", "were", "are", "is", "been", "being", "have", "has", "had", "will", "would", "can", "could",
]);

const DATA_CODE = /^(?:[huyas]|cp|fm|mx|un|am|af|ym|yf|um|uf|ax|yx)[-_.]?\d*(?:[._-]\d+)*$/iu;
const I_ADJECTIVE = /(?:しい|ない|たい|っぽい|多い|多か(?:った|なく|れば)?|少ない|少なか(?:った|なく|れば)?|良い|良か(?:った|なく|れば)?|よい|よか(?:った|なく|れば)?|悪い|悪か(?:った|なく|れば)?|高い|高か(?:った|なく|れば)?|低い|低か(?:った|なく|れば)?|大きい|大きか(?:った|なく|れば)?|小さい|小さか(?:った|なく|れば)?|近い|近か(?:った|なく|れば)?|遠い|遠か(?:った|なく|れば)?)$/u;
const WORD_BOUNDARIES = new Set([
  "が", "を", "に", "へ", "と", "で", "や", "の", "も", "は", "から", "まで", "より", "だけ",
  "ほど", "など", "ので", "のに", "けど", "けれど", "そして", "しかし", "また", "または", "および",
  "でも", "だから", "な",
]);
const VERB_ENDING = /(?:していた|している|してる|された|される|させる|られる|っていた|っている|ってる|ていた|ている|てる|った|って|いた|れる|せる|する|した|して|て|く|ぐ|す|つ|ぬ|ぶ|む|る|う)$/u;
const ENGLISH_VERB = /(?:ing|ed|ize|ise)$/iu;
const POSITIVE_WORDS = /(?:笑顔|笑い|幸せ|安心|活気|賑わい|にぎわい|交流|会話|団らん|遊び|祭り|快適|人気|好評|happy|enjoy|fun|smile)/iu;
const NEGATIVE_WORDS = /(?:事故|危険|不安|恐怖|喧嘩|けんか|混雑|渋滞|騒音|迷惑|ごみ|ゴミ|酔客|泥酔|孤独|疲労|泣き|犯罪|捕ま|壊れ|汚れ|danger|accident|noise|crowd|trash)/iu;

export function extractContentWords(text) {
  const segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("ja", { granularity: "word" })
    : null;
  const tokens = segmenter ? joinJapaneseSegments(segmenter.segment(text)) : text.split(/\s+/u);

  return tokens
    .map((token) => token.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "").trim())
    .map(stripNominalAuxiliary)
    .filter(isNounVerbOrAdjectivalNoun);
}

export function extractContentTerms(text) {
  return extractContentWords(text).map((label) => {
    const partOfSpeech = isVerbExpression(label) ? "verb" : "noun";
    return {
      label,
      partOfSpeech,
      sentiment: partOfSpeech === "noun" ? getNounSentiment(label) : "action",
    };
  });
}

function isVerbExpression(word) {
  return VERB_ENDING.test(word) || ENGLISH_VERB.test(word);
}

function getNounSentiment(word) {
  if (POSITIVE_WORDS.test(word)) return "positive";
  if (NEGATIVE_WORDS.test(word)) return "negative";
  return "neutral";
}

function stripNominalAuxiliary(word) {
  return word.replace(/(?<=[\p{Script=Han}\p{Script=Katakana}ー])(?:だった|でした|です|だ)$/u, "");
}

function joinJapaneseSegments(segments) {
  const words = [];
  let current = "";
  const flush = () => {
    if (current) words.push(current);
    current = "";
  };

  for (const part of segments) {
    const token = part.segment.trim();
    if (!part.isWordLike || !token) {
      flush();
      continue;
    }
    if (WORD_BOUNDARIES.has(token)) {
      flush();
      continue;
    }
    const isLatinWord = /^[a-z]+$/iu.test(token);
    const currentIsLatin = /^[a-z]+$/iu.test(current);
    if (current && isLatinWord !== currentIsLatin) flush();
    if (current && isVerbExpression(current) && /^[\p{Script=Han}\p{Script=Katakana}ー]/u.test(token)) flush();
    current += token;
  }
  flush();
  return words;
}

function isNounVerbOrAdjectivalNoun(word) {
  if (!word || word.length < 2) return false;
  const normalized = word.toLocaleLowerCase("ja");
  if (FUNCTION_WORDS.has(normalized) || ENGLISH_FUNCTION_WORDS.has(normalized)) return false;
  if (/^\d+(?:\.\d+)?$/u.test(normalized) || DATA_CODE.test(normalized)) return false;
  if (I_ADJECTIVE.test(normalized)) return false;

  if (/^[a-z][a-z'-]+$/iu.test(normalized)) return normalized.length >= 3;
  if (/^[\p{Script=Hiragana}]+$/u.test(normalized)) return false;
  return /[\p{Script=Han}\p{Script=Katakana}ー]/u.test(normalized);
}
