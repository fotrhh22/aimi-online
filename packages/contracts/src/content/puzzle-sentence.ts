type SentenceWord = {
  label: string;
  sentenceClause?: string;
  sentenceFragment?: string;
  sentenceOrder?: number;
};
const roles = ["배경", "색상", "대상", "개수", "배치", "시점", "표현 방식"];
function role(w: SentenceWord) {
  return (
    roles.find((r) =>
      w.sentenceClause?.startsWith(
        r + (r === "개수" || r === "배치" ? "는" : "은"),
      ),
    ) ?? "기타"
  );
}
/** Public selected-word metadata only. Never reads an answer key or original prompt. */
export function sortSentenceKeywords<T extends SentenceWord>(words: T[]): T[] {
  return [...words].sort((a, b) => {
    const rank = (w: SentenceWord) => {
      const n = roles.indexOf(role(w));
      return n < 0 ? roles.length : n;
    };
    if (a.sentenceFragment || b.sentenceFragment)
      return (
        (a.sentenceOrder ?? 999) - (b.sentenceOrder ?? 999) ||
        a.label.localeCompare(b.label, "ko")
      );
    return rank(a) - rank(b) || a.label.localeCompare(b.label, "ko");
  });
}
function particle(text: string, vowel: string, consonant: string) {
  const c = text.charCodeAt(text.length - 1);
  return (
    text +
    (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? consonant : vowel)
  );
}
export function composeKeywordSentence(words: SentenceWord[]) {
  if (!words.length) return "키워드를 선택하면 조합 문장이 완성돼요.";
  const sorted = sortSentenceKeywords(words);
  if (sorted.some((w) => w.sentenceFragment))
    return sorted
      .map((w) => w.sentenceFragment ?? `‘${w.label}’ 조건도 반영해줘.`)
      .join(" ");
  const values = (r: string) =>
    sorted.filter((w) => role(w) === r).map((w) => w.label);
  const join = (r: string) => values(r).join(", ");
  const background = join("배경"),
    color = join("색상"),
    subject = join("대상"),
    count = join("개수"),
    placement = join("배치"),
    view = join("시점"),
    style = join("표현 방식");
  const scene = [
    background && `${background}에서`,
    color,
    subject || (count || color || placement ? "대상" : ""),
    count,
  ]
    .filter(Boolean)
    .join(" ");
  const main = scene
    ? `${particle(scene, "를", "을")} ${placement ? `${placement} 배치해` : "표현해"}줘.`
    : "이미지를 만들어줘.";
  const details = [
    view && `${view} 바라본 모습으로 그려줘.`,
    style && `${style} 스타일로 표현해줘.`,
    values("기타").length &&
      `${values("기타")
        .map((v) => `‘${v}’`)
        .join(", ")} 조건도 반영해줘.`,
  ].filter(Boolean);
  return [main, ...details].join(" ");
}
