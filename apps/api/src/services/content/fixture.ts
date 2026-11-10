import { dailyProgramForDate } from "./daily-program.js";
import {
  seoulDate,
  EXPANSION_CATALOG,
  shopPrice,
  type CatalogItem,
  type Keyword,
} from "@aimi/contracts";
export const CONTENT_VERSION = "pdf-apples-v1";
const BASE_CATALOG: Omit<CatalogItem, "price">[] = [
  {
    id: "seed",
    name: "새싹이",
    kind: "character",
    asset: "seed",
  },
  {
    id: "bunny",
    name: "분홍 토끼",
    kind: "character",
    asset: "bunny",
  },
  {
    id: "bear",
    name: "작은 곰",
    kind: "character",
    asset: "bear",
  },
  {
    id: "cloud",
    name: "구름이",
    kind: "character",
    asset: "cloud",
  },
  {
    id: "plant",
    name: "작은 화분",
    kind: "item",
    asset: "plant",
  },
  {
    id: "fence",
    name: "나무 울타리",
    kind: "item",
    asset: "fence",
  },
  {
    id: "flower",
    name: "분홍 꽃",
    kind: "item",
    asset: "flower",
  },
  {
    id: "bench",
    name: "나무 벤치",
    kind: "item",
    asset: "bench",
  },
  ...EXPANSION_CATALOG,
];
export const CATALOG: CatalogItem[] = BASE_CATALOG.map((item) => ({
  ...item,
  price: shopPrice(item.id),
}));
export const SLOT_NAMES: Record<string, string> = {
  "front-left": "왼쪽 앞마당",
  back: "뒤쪽 경계",
  "front-right": "오른쪽 앞마당",
  "back-right": "오른쪽 뒤",
};
export const KEYWORDS: Keyword[] = [
  ["apple", "사과", "subject", "apple"],
  ["photo", "사진", "style", "photo"],
  ["two", "두 개", "count", "two"],
  ["city", "도시", "background", "city"],
  ["red", "빨간색", "color", "red"],
  ["cartoon", "만화", "style", "cartoon"],
  ["sidebyside", "나란히", "relation", "sidebyside"],
  ["white", "흰 배경", "background", "white"],
  ["cat", "고양이", "subject", "cat"],
  ["one", "한 개", "count", "one"],
  ["above", "위에서", "view", "above"],
  ["pear", "배", "subject", "pear"],
  ["watercolor", "수채화", "style", "watercolor"],
  ["forest", "숲", "background", "forest"],
  ["floating", "공중에", "relation", "floating"],
  ["blue", "파란색", "color", "blue"],
  ["plate", "접시 위", "relation", "plate"],
  ["strawberry", "딸기", "subject", "strawberry"],
  ["side", "옆에서", "view", "side"],
  ["orange", "귤", "subject", "orange"],
  ["overlap", "겹쳐짐", "relation", "overlap"],
  ["beach", "해변", "background", "beach"],
  ["three", "세 개", "count", "three"],
  ["black", "검정 배경", "background", "black"],
  ["wood", "원목 탁자", "relation", "wood"],
  ["left", "왼쪽에", "position", "left"],
  ["close", "가까이", "distance", "close"],
  ["vase", "화병", "subject", "vase"],
  ["green", "초록색", "color", "green"],
  ["right", "오른쪽에", "position", "right"],
].map(([id, label, group, value]) => ({ id, label, group, value, cost: 5 }));
export function contentForDate(date = seoulDate()) {
  const index =
    (Math.floor(Date.parse(date + "T00:00:00Z") / 86400_000) + 1) % 3;
  const presets = [
    {
      title: "사과 두 개 · 수채화",
      expected: {
        subject: "apple",
        count: "two",
        color: "red",
        background: "white",
        view: "above",
        style: "watercolor",
      },
    },
    {
      title: "초록 사과 한 개 · 수채화",
      expected: {
        subject: "apple",
        count: "one",
        color: "green",
        background: "white",
        view: "above",
        style: "watercolor",
      },
    },
    {
      title: "파란 배 세 개 · 만화",
      expected: {
        subject: "pear",
        count: "three",
        color: "blue",
        background: "black",
        view: "side",
        style: "cartoon",
      },
    },
  ];
  const preset = presets[index];
  return {
    ...dailyProgramForDate(date),
    ...preset,
    version: CONTENT_VERSION + "-" + index,
    target:
      "/content/challenges.svg#" + Object.values(preset.expected).join("-"),
  };
}
export function evaluateChallenge(
  ids: string[],
  model: "low" | "high",
  date = seoulDate(),
) {
  const { expected: conditions, version } = contentForDate(date);
  const expected: Record<string, string> = conditions;
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !KEYWORDS.some((k) => k.id === id))
  )
    throw new Error("INVALID_KEYWORDS");
  const selected = ids.map((id) => KEYWORDS.find((k) => k.id === id)!);
  const profile = Object.fromEntries(selected.map((k) => [k.group, k.value]));
  const conflict = selected.some((k, i) =>
    selected.slice(i + 1).some((v) => v.group === k.group),
  );
  const weights: Record<string, number> = {
    subject: 25,
    count: 20,
    color: 15,
    background: 15,
    view: 10,
    style: 15,
  };
  const feedback = Object.entries(expected)
    .filter(([g, v]) => profile[g] !== v)
    .map(
      ([g]) =>
        ({
          subject: "대상",
          count: "개수",
          color: "색상",
          background: "배경",
          view: "시점",
          style: "표현 방식",
        })[g] + " 조건을 확인해보세요.",
    );
  if (conflict) feedback.push("서로 충돌하는 조건을 함께 골랐어요.");
  const score = Math.max(
    0,
    Object.entries(weights).reduce(
      (n, [g, w]) => n + (profile[g] === expected[g] ? w : 0),
      0,
    ) - (conflict ? 20 : 0),
  );
  const threshold = model === "low" ? 85 : 70;
  // V1 published image profiles are deliberately bounded and exhaustively pre-rendered.
  // Uncovered profiles are a SYSTEM error, never a normal failed attempt.
  const supported =
    !conflict &&
    selected.every((k) => k.group in expected) &&
    Object.entries(profile).every(([g, v]) =>
      (
        ({
          subject: ["apple", "pear"],
          count: ["one", "two", "three"],
          color: ["red", "blue", "green"],
          background: ["white", "black"],
          view: ["above", "side"],
          style: ["watercolor", "photo", "cartoon"],
        })[g] ?? []
      ).includes(v),
    );
  const values = [
    "subject",
    "count",
    "color",
    "background",
    "view",
    "style",
  ].map((g) => profile[g] ?? "none");
  const image = supported
    ? "/content/challenges.svg#" + values.join("-")
    : null;
  return {
    version,
    score,
    threshold,
    passed:
      profile.subject === expected.subject && !conflict && score >= threshold,
    feedback,
    profile,
    image,
    cost: selected.length * 5 + (model === "low" ? 12 : 40),
    sentence: selected.map((k) => k.label).join(" · ") + " 조건으로 표현해줘.",
  };
}
