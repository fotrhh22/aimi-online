import React from "react";
import { AA_SCORE_FIELDS, type AAProfile } from "@aimi/contracts";

/** Fixed display axis, not a success percentage or a per-model auto-normalization. */
export function aaBarHeight(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : null;
}
export function AAScoreChart({ profile }: { profile?: AAProfile }) {
  const hasScores = AA_SCORE_FIELDS.some(
    ({ key }) => aaBarHeight(profile?.evaluations[key]) !== null,
  );
  if (!hasScores) return null;
  return (
    <section
      className="notice model-fact-section"
      aria-labelledby="aa-scores-title"
    >
      <h3 id="aa-scores-title">AA 성능</h3>
      <p className="caption aa-score-help">
        높을수록 해당 지표의 평가 결과가 좋아요. 점수는 정답률이나 성공 확률이
        아니에요.
      </p>
      <figure className="aa-score-figure">
        <figcaption className="caption">
          표시 눈금 0–100 · 좌우로 밀어 7개 지표를 확인해요.
        </figcaption>
        <div
          className="aa-score-scroll"
          role="region"
          aria-label="AA 성능 7개 지표 그래프 · 좌우 스크롤"
          tabIndex={0}
        >
          <div className="aa-score-plot">
            <div className="aa-score-axis" aria-hidden="true">
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>
            <ol className="aa-score-bars" aria-label="AA 지표별 점수">
              {AA_SCORE_FIELDS.map(({ key, label }) => {
                const value = profile?.evaluations[key],
                  height = aaBarHeight(value);
                const display =
                  height === null
                    ? "평가 자료 없음"
                    : value!.toLocaleString("ko-KR", {
                        maximumFractionDigits: 2,
                      });
                return (
                  <li
                    key={key}
                    aria-label={label + ": " + display}
                    data-score-missing={height === null ? "true" : undefined}
                  >
                    <span className="aa-score-value" aria-hidden="true">
                      {height === null ? "자료 없음" : display}
                    </span>
                    <div className="aa-score-track" aria-hidden="true">
                      {height !== null && (
                        <span
                          className={
                            "aa-score-bar" +
                            (key === "intelligence" ? " is-overall" : "")
                          }
                          style={{ height: height + "%" }}
                        />
                      )}
                      {height === null && (
                        <span className="aa-score-missing-mark">—</span>
                      )}
                    </div>
                    <span className="aa-score-label" aria-hidden="true">
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </figure>
      <p className="caption">
        같은 지표·버전·측정 설정의 모델끼리 비교하세요. 분야별 지표는 평가
        구성과 가중치가 달라요. 자료 없음은 0점이 아니에요.
      </p>
      <p className="caption">출처: Artificial Analysis 평가 방법</p>
    </section>
  );
}
