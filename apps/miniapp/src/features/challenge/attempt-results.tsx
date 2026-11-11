import { SentenceCard } from "./sentence-card";
import React from "react";
import {
  composeKeywordSentence,
  type Attempt,
  type Keyword,
} from "@aimi/contracts";
export function feedbackLabel(a: Attempt) {
  if (a.passed || a.feedbackStatus === "complete")
    return "모든 키워드를 맞혔어요";
  if (a.feedbackStatus === "partial") return "맞는 단어를 더 찾아보세요";
  if (a.feedbackStatus === "none") return "아직 맞는 단어가 없어요";
  if (a.feedbackStatus === "mixed") return "다시 확인할 단어가 있어요";
  return "이전 규칙의 챌린지 결과예요";
}
export function AttemptResults({
  attempts,
  keywords,
  heading = true,
}: {
  attempts: Attempt[];
  keywords: Keyword[];
  heading?: boolean;
}) {
  const labels = new Map(keywords.map((k) => [k.id, k.label]));
  return (
    <section
      className="challenge-attempt-results"
      aria-label="조합별 챌린지 결과"
    >
      {heading && <h2>챌린지 결과</h2>}
      <div className="attempt-result-list">
        {attempts.map((a, i) => (
          <article
            className="attempt-result-card"
            id={"challenge-attempt-" + a.id}
            key={a.id}
          >
            <header>
              <h3>{a.attemptNumber ?? i + 1}번째 시도</h3>
              <span className="caption">{a.cost}예산 사용</span>
            </header>
            <div className="attempt-result-columns">
              <SentenceCard
                title="이번 문장"
                className="attempt-sentence"
                heading="h4"
              >
                {a.keywordIds.every((id) => keywords.some((k) => k.id === id))
                  ? composeKeywordSentence(
                      a.keywordIds.map((id) =>
                        keywords.find((k) => k.id === id)!,
                      ),
                    )
                  : a.sentence}
              </SentenceCard>
              <section className="attempt-assessment">
                <p className="attempt-match-rate">일치율 {a.score}%</p>
                {a.matchedKeywordIds ? (
                  <>
                    <h4>맞은 키워드</h4>
                    <p className="attempt-keywords-text">
                      {a.matchedKeywordIds.length
                        ? a.matchedKeywordIds
                            .map((id) => labels.get(id) ?? "이전 키워드")
                            .join(" · ")
                        : "아직 없어요"}
                    </p>
                  </>
                ) : (
                  <p className="caption">
                    이전 결과에는 개별 판정 기록이 없어요.
                  </p>
                )}
                {!!a.incorrectKeywordIds?.length && (
                  <>
                    <h4>다시 확인할 키워드</h4>
                    <p className="attempt-keywords-text is-mismatch">
                      {a.incorrectKeywordIds
                        .map((id) => labels.get(id) ?? "이전 키워드")
                        .join(" · ")}
                    </p>
                  </>
                )}
              </section>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Both screens expand history in place, without navigation or duplicate round headers. */
export function PreviousCombinations({
  attempts,
  keywords,
}: {
  attempts: Attempt[];
  keywords: Keyword[];
}) {
  if (!attempts.length) return null;
  return (
    <details className="challenge-previous-results">
      <summary>이전 조합 {attempts.length}회 보기</summary>
      <AttemptResults heading={false} attempts={attempts} keywords={keywords} />
    </details>
  );
}
