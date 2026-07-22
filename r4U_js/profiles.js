import { DEFAULT_CATEGORY } from "../src/config.js";

export function getMemoProfile(text) {
  const normalized = text
    .normalize("NFKC")
    .toUpperCase()
    .replace(/(^|[^A-Z])YW(?=$|[^A-Z])/g, "$1YF")
    .replace(/(^|[^A-Z])([HUYAS])\s*-\s*CP(?=$|[^A-Z])/g, "$1$2CP");
  const matches = [];
  const tokenPattern = /(^|[^A-Z])((?:[HUYAS](?:M|F|X|CP))|CP|FM|MX|UN)(?:\s*[- ]?\s*(\d+(?:\.\d+)*))?(?=$|[^A-Z])/g;
  let match;

  while ((match = tokenPattern.exec(normalized))) {
    const count = match[3]
      ? match[3].split(".").reduce((total, value) => total + Number(value), 0)
      : null;
    matches.push({ symbol: match[2], count });
  }

  if (!matches.length) {
    const ageOnly = normalized.match(/(?:^|[^A-Z])([HUYAS])\s*[- ]?\s*(\d+)(?=$|[^A-Z])/);
    if (ageOnly) matches.push({ symbol: `${ageOnly[1]}X`, count: Number(ageOnly[2]) });
  }

  if (!matches.length) {
    return {
      category: DEFAULT_CATEGORY,
      symbol: "UN",
      gender: "U",
      count: null,
      isPeople: false,
    };
  }

  const categories = new Set(matches.map(({ symbol }) => getSymbolCategory(symbol)));
  const genders = new Set(matches.map(({ symbol }) => getSymbolGender(symbol)).filter((value) => value !== "U"));
  const category = categories.size === 1 ? [...categories][0] : "MX";
  const gender = genders.size === 1 ? [...genders][0] : "X";
  const genderCounts = [...normalized.matchAll(/(?:女性|男性)\s*(\d+)\s*人/g)]
    .map((result) => Number(result[1]));
  const narrativeCount = genderCounts.length > 1
    ? genderCounts.reduce((total, value) => total + value, 0)
    : Number(normalized.match(/(\d+)\s*人/)?.[1]) || null;
  const inferredCount = matches.reduce(
    (total, item) => total + (item.count ?? (/CP$/.test(item.symbol) ? 2 : 1)),
    0,
  );
  const hasMissingCount = matches.some((item) => item.count === null);
  const count = narrativeCount && (hasMissingCount || matches.length > 1)
    ? narrativeCount
    : inferredCount;
  const symbol = matches.length === 1
    ? matches[0].symbol
    : category.length === 1
      ? `${category}${gender}`
      : category;

  return { category, symbol, gender, count, isPeople: true };
}

export function formatProfileBadge(memo, category) {
  if (!memo.isPeople) return category.label;
  const genderLabels = { M: "男性", F: "女性", X: "混合", U: "不明" };
  return `${memo.symbol} · ${genderLabels[memo.gender]} · ${memo.count}人`;
}

function getSymbolCategory(symbol) {
  return ["CP", "FM", "MX", "UN"].includes(symbol) ? symbol : symbol[0];
}

function getSymbolGender(symbol) {
  return symbol.length === 2 && ["M", "F", "X"].includes(symbol[1]) ? symbol[1] : "X";
}
