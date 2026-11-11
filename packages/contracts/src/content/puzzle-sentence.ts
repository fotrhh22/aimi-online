/** Compose only selected labels; never consult the answer key or original prompt. */
export function composeKeywordSentence(
  words: { label: string; sentenceClause?: string }[],
) {
  if (!words.length) return "키워드를 선택하면 조합 문장이 완성돼요.";
  return (
    words
      .map((w) => w.sentenceClause ?? `‘${w.label}’ 조건을 반영하고`)
      .join(", ") + " 이미지를 만들어줘."
  );
}
