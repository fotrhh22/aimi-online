import React from "react";
import type { Attempt, Keyword } from "@aimi/contracts";
export function feedbackLabel(a: Attempt) {
  if (a.passed || a.feedbackStatus === "complete")
    return "모든 키워드를 맞혔어요";
  if (a.feedbackStatus === "partial") return "맞았지만 더 찾으세요";
  if (a.feedbackStatus === "none") return "키워드가 아예 포함 안 돼요";
  if (a.feedbackStatus === "mixed") return "포함되지 않은 키워드가 있어요";
  return "이전 규칙의 도전 결과예요";
}
export function AttemptResults({
  attempts,
  keywords,
}: {
  attempts: Attempt[];
  keywords: Keyword[];
}) {
  const labels = new Map(keywords.map((k) => [k.id, k.label]));
  return (
    <section
      className="challenge-attempt-results"
      aria-label="조합별 도전 결과"
    >
      <h2>도전 결과</h2>
      <div className="attempt-result-list">
        {attempts.map((a, i) => (
          <article
            className="attempt-result-card"
            id={"challenge-attempt-" + a.id}
            key={a.id}
          >
            <header>
              <h3>{a.attemptNumber ?? i + 1}차 도전</h3>
              <span className="caption">{a.cost}예산 사용</span>
            </header>
            <div className="attempt-result-columns">
              <section className="attempt-sentence">
                <h4>선택한 조합 문장</h4>
                <p>{a.sentence}</p>
              </section>
              <section className="attempt-assessment">
                <strong>{feedbackLabel(a)}</strong>
                <p className="attempt-match-rate">일치율 {a.score}%</p>
                {a.matchedKeywordIds ? (
                  <>
                    <h4>맞은 키워드</h4>
                    <div className="attempt-keywords">
                      {a.matchedKeywordIds.length ? (
                        a.matchedKeywordIds.map((id) => (
                          <span className="is-match" key={id}>
                            {labels.get(id) ?? "이전 키워드"}
                          </span>
                        ))
                      ) : (
                        <span className="caption">아직 없어요</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="caption">
                    이전 결과에는 개별 판정 기록이 없어요.
                  </p>
                )}
                {!!a.incorrectKeywordIds?.length && (
                  <>
                    <h4>포함되지 않은 키워드</h4>
                    <div className="attempt-keywords">
                      {a.incorrectKeywordIds.map((id) => (
                        <span className="is-mismatch" key={id}>
                          {labels.get(id) ?? "이전 키워드"}
                        </span>
                      ))}
                    </div>
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
