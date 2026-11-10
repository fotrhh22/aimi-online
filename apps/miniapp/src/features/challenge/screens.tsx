import React, { useState, useEffect } from "react";
import {
  ECONOMY_POLICY,
  PUZZLE_ATTEMPT_COST,
  type Attempt,
} from "@aimi/contracts";
import { useApp } from "../../app/context";
import { Button, ChallengeArt, Modal, Stats } from "../../ui/primitives";
import { request } from "../../lib/api/client";
function HighlightedPrompt({
  prompt,
  highlights,
}: {
  prompt: string;
  highlights: { start_utf16: number; end_utf16: number }[];
}) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const h of [...highlights].sort(
    (a, b) => a.start_utf16 - b.start_utf16,
  )) {
    if (h.start_utf16 < cursor || h.end_utf16 > prompt.length) continue;
    parts.push(
      prompt.slice(cursor, h.start_utf16),
      <mark key={h.start_utf16}>
        {prompt.slice(h.start_utf16, h.end_utf16)}
      </mark>,
    );
    cursor = h.end_utf16;
  }
  parts.push(prompt.slice(cursor));
  return <p>{parts}</p>;
}
export function Challenge() {
  const a = useApp(),
    s = a.data!,
    content = a.content!,
    puzzle = content.ruleVersion?.startsWith("aimi-keyword-set-v") ?? false,
    combination = a.path.startsWith("/challenge/combination"),
    draftKey = "aimi.challenge." + s.daily.date + "." + content.version;
  const [ids, setIds] = useState<string[]>(() => {
      try {
        return JSON.parse(sessionStorage.getItem(draftKey) ?? "[]");
      } catch {
        return [];
      }
    }),
    [model, setModel] = useState<"low" | "high">("low"),
    [zoom, setZoom] = useState(false),
    [gallery, setGallery] = useState<
      { id: string; target: string; model: string }[] | null
    >(null),
    [result, setResult] = useState<Attempt | null>(null),
    [moving, setMoving] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? "[]");
      setIds(
        Array.isArray(saved)
          ? saved.filter((id) => content.keywords.some((k) => k.id === id))
          : [],
      );
    } catch {
      setIds([]);
    }
    setModel("low");
    setResult(null);
  }, [draftKey]);
  useEffect(() => {
    sessionStorage.setItem(draftKey, JSON.stringify(ids));
  }, [ids, draftKey]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("result");
    if (id)
      void a
        .perform(() =>
          request<Attempt>("/v1/attempts/" + encodeURIComponent(id)),
        )
        .then((r) => {
          if (r) setResult(r);
        });
  }, []);
  const selected = ids
    .map((id) => content.keywords.find((k) => k.id === id))
    .filter((k) => Boolean(k));
  const cost = puzzle
    ? PUZZLE_ATTEMPT_COST
    : selected.reduce((n, k) => n + k!.cost, 0) + (model === "low" ? 12 : 40);
  const attemptsLeft =
    s.challengeRemaining ?? Math.max(0, 5 - s.daily.attemptsUsed);
  const closed =
    s.daily.success ||
    s.daily.challengeClosed === true ||
    (!puzzle && s.daily.attemptsUsed >= 5);
  function move(index: number, by: number) {
    const dest = index + by;
    if (dest < 0 || dest >= ids.length) return;
    const next = [...ids];
    [next[index], next[dest]] = [next[dest], next[index]];
    setIds(next);
  }
  const submit = async () => {
    const r = await a.perform(() =>
      request<Attempt>("/v1/challenge/attempts", "POST", {
        keywordIds: ids,
        ...(puzzle ? {} : { model }),
        date: s.daily.date,
        contentVersion: content.version,
      }),
    );
    if (r) setResult(r);
  };
  const reset = () => {
    setIds([]);
    setModel("low");
    setResult(null);
    a.navigate("/challenge");
  };
  return (
    <>
      {content.reviewStatus === "unreviewed" && (
        <p className="caption sample-label">
          생성 이미지 검수 전 개발 미리보기 · 정답 후보는 확정 전이에요.
        </p>
      )}
      {content.reviewStatus === "unreviewed" && (
        <button
          className="text-link"
          onClick={() =>
            void a
              .perform(() =>
                request<{
                  images: { id: string; target: string; model: string }[];
                }>("/v1/content/previews"),
              )
              .then((r) => {
                if (r) setGallery(r.images);
              })
          }
        >
          10일 이미지 모아보기 ›
        </button>
      )}
      {!combination ? (
        <>
          <div className="target-summary">
            <ChallengeArt src={content.target} />
            <div>
              <strong>{content.title}</strong>
              <button className="text-link" onClick={() => setZoom(true)}>
                목표 확대 ›
              </button>
            </div>
          </div>
          <h2 className="section-heading">필요한 단어를 골라보세요</h2>
          <p className="caption">
            누르면 선택되고, 다시 누르면 해제돼요.
            {puzzle && " 순서는 채점에 영향을 주지 않아요."}
          </p>
          {puzzle && content.answerCount !== undefined && (
            <p className="caption green">
              정답 단어 {content.answerCount}개 · 남은 도전 {attemptsLeft}회
            </p>
          )}
          <div className="keywords">
            {content.keywords.map((k) => (
              <button
                key={k.id}
                aria-pressed={ids.includes(k.id)}
                onClick={() =>
                  setIds(
                    ids.includes(k.id)
                      ? ids.filter((id) => id !== k.id)
                      : [...ids, k.id],
                  )
                }
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="caption green">{ids.length}개 선택됨</p>
          <div className="fixed-cta">
            <Button
              disabled={!ids.length || s.daily.success || closed}
              onClick={() => a.navigate("/challenge/combination")}
            >
              {s.daily.success
                ? "오늘 챌린지 성공"
                : closed
                  ? "오늘 도전 종료"
                  : "조합 확인 ›"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="between">
            <strong>예산 {s.budget}</strong>
            <button className="text-link" onClick={() => setZoom(true)}>
              목표 다시 보기 ›
            </button>
          </div>
          <div className="selected-keywords">
            {selected.map((k, i) => (
              <span
                key={k!.id}
                className="keyword-chip"
                draggable
                onDragStart={() => setMoving(k!.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (moving) {
                    const from = ids.indexOf(moving),
                      to = i,
                      next = [...ids];
                    next.splice(from, 1);
                    next.splice(to, 0, moving);
                    setIds(next);
                    setMoving(null);
                  }
                }}
              >
                <button
                  onClick={() => setIds(ids.filter((id) => id !== k!.id))}
                  aria-label={k!.label + " 해제"}
                >
                  {k!.label} ×
                </button>
                <span className="reorder-controls">
                  <button
                    aria-label={k!.label + " 앞으로"}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ‹
                  </button>
                  <button
                    aria-label={k!.label + " 뒤로"}
                    disabled={i === selected.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ›
                  </button>
                </span>
              </span>
            ))}
          </div>
          <p className="caption">선택 {ids.length}개 · 순서 변경 · ×로 해제</p>
          <div className="notice section">
            <strong>자동 조합 문장</strong>
            <p>
              {selected.map((k) => k!.label).join(" · ")} 조건으로 표현해줘.
            </p>
          </div>
          {!puzzle && (
            <>
              <h2 className="section-heading">모델 선택</h2>
              <div className="model-options">
                {(["low", "high"] as const).map((m) => (
                  <button
                    key={m}
                    aria-pressed={model === m}
                    onClick={() => setModel(m)}
                  >
                    <strong>
                      {m === "low" ? "저성능 · 12" : "고성능 · 40"} 예산
                    </strong>
                    <small>
                      {puzzle
                        ? "정답 단어를 모두 맞히면 성공"
                        : `통과 ${m === "low" ? 85 : 70}점`}
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
          <h2 className="section-heading">
            사용 {cost} / 남음 {Math.max(0, s.budget - cost)}
          </h2>
          <p className="caption">
            {puzzle
              ? `제출 1회 ${PUZZLE_ATTEMPT_COST}예산 · 키워드 수와 무관 · 남은 도전 ${attemptsLeft}회`
              : `키워드 ${cost - (model === "low" ? 12 : 40)} + 모델 ${model === "low" ? 12 : 40}`}
          </p>
          <div className="fixed-cta">
            <Button
              loading={a.busy}
              disabled={
                cost > s.budget || !ids.length || s.daily.success || closed
              }
              onClick={() => void submit()}
            >
              {s.daily.success ? "오늘 챌린지 성공" : cost + " 예산으로 도전"}
            </Button>
          </div>
        </>
      )}
      {gallery && (
        <Modal title="10일 이미지 미리보기" onClose={() => setGallery(null)}>
          <p className="caption">
            검수 전 생성 이미지예요. 오늘의 문제나 진행 기록은 바뀌지 않아요.
          </p>
          <div className="challenge-preview-gallery">
            {gallery.map((g) => (
              <figure key={g.id}>
                <ChallengeArt src={g.target} />
                <figcaption>{g.id.replace("day-", "Day ")}</figcaption>
                <p className="caption">{g.model}</p>
              </figure>
            ))}
          </div>
        </Modal>
      )}
      {zoom && (
        <Modal title="오늘의 목표" onClose={() => setZoom(false)}>
          <ChallengeArt src={content.target} />
          <p>{content.title}</p>
          <div className="dialog-actions">
            <Button onClick={() => setZoom(false)}>확인</Button>
          </div>
        </Modal>
      )}
      {result && puzzle && (
        <Modal
          className="challenge-result puzzle-feedback"
          title={
            result.passed
              ? "챌린지 성공!"
              : result.remaining === 0
                ? "챌린지 실패"
                : result.incorrectKeywordIds?.length === 0 &&
                    (result.missingKeywordCount ?? 0) > 0
                  ? "개수가 부족해요"
                  : result.attemptNumber === 1
                    ? "정답 개수를 알려드릴게요"
                    : "선택한 오답을 확인해보세요"
          }
          onClose={() => {
            setResult(null);
            a.navigate("/mission", { replace: true });
          }}
        >
          {result.passed || result.remaining === 0 ? (
            <>
              {result.reveal && (
                <div className="puzzle-reveal">
                  <strong>정답</strong>
                  <p>
                    {result.reveal.answerKeywordIds
                      .map(
                        (id) =>
                          content.keywords.find((k) => k.id === id)?.label ??
                          id,
                      )
                      .join(" · ")}
                  </p>
                  <strong>원문</strong>
                  <HighlightedPrompt
                    prompt={result.reveal.prompt}
                    highlights={result.reveal.highlights}
                  />
                  <strong>작성 팁</strong>
                  {result.reveal.tips.map((t, i) => (
                    <div key={i}>
                      <strong>{t.title}</strong>
                      <p>{t.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p>정답 단어는 {result.answerCount}개예요.</p>
              <p className="caption">일치율 {result.score}%</p>
              {result.incorrectKeywordIds && (
                <div className="notice">
                  {result.incorrectKeywordIds.length ? (
                    <>
                      <strong>선택한 오답</strong>
                      <p>
                        {result.incorrectKeywordIds
                          .map(
                            (id) =>
                              content.keywords.find((k) => k.id === id)
                                ?.label ?? id,
                          )
                          .join(" · ")}
                      </p>
                    </>
                  ) : (
                    <p>개수가 부족해요</p>
                  )}
                  {(result.missingKeywordCount ?? 0) > 0 && (
                    <p className="caption">
                      정답 단어 {result.missingKeywordCount}개를 더 찾아보세요.
                    </p>
                  )}
                </div>
              )}
              <p className="caption">
                이번 시도 {result.cost}예산 사용 · 남은 예산{" "}
                {Math.max(0, result.budget - result.cost)} · 추가 도전{" "}
                {result.remaining}회
              </p>
            </>
          )}
          <div
            className={
              result.passed || result.remaining === 0
                ? "dialog-actions"
                : "dialog-actions puzzle-feedback-actions"
            }
          >
            {!result.passed && result.remaining > 0 && (
              <Button onClick={reset}>다시 시도하기</Button>
            )}
            <Button
              weak={!result.passed && result.remaining > 0}
              onClick={() => {
                setResult(null);
                a.navigate("/mission", { replace: true });
              }}
            >
              나가기
            </Button>
          </div>
        </Modal>
      )}
      {result && !puzzle && (
        <Modal
          className="result-modal challenge-result"
          title={result.passed ? "챌린지 성공!" : "조금만 더 다듬어봐요"}
          onClose={() => {
            setResult(null);
            if (result.passed || result.remaining === 0) a.navigate("/mission");
          }}
        >
          <div className="result-images">
            <div>
              <ChallengeArt src={content.target} />
              <small>목표</small>
            </div>
            {!puzzle && (
              <div>
                <ChallengeArt src={result.image} />
                <small>결과</small>
              </div>
            )}
          </div>
          <h3>
            {puzzle
              ? `일치율 ${result.score}%`
              : `${result.score}점 · 통과 기준 ${result.threshold}점`}
          </h3>
          <p className="caption">
            {result.passed
              ? "선택한 조건이 목표를 충족했어요."
              : puzzle
                ? "선택한 단어를 목표 이미지와 다시 비교해보세요."
                : result.feedback.join(" ")}
          </p>
          {puzzle && result.answerCount !== undefined && !result.passed && (
            <p className="caption">정답 단어 {result.answerCount}개</p>
          )}
          {puzzle && result.incorrectKeywordIds && !result.passed && (
            <div className="notice">
              <strong>이번 선택의 오답</strong>
              <p>
                {result.incorrectKeywordIds.length
                  ? result.incorrectKeywordIds
                      .map(
                        (id) =>
                          content.keywords.find((k) => k.id === id)?.label ??
                          id,
                      )
                      .join(" · ")
                  : "선택한 단어는 모두 맞아요."}
              </p>
              <p className="caption">
                빠뜨린 정답 {result.missingKeywordCount}개
              </p>
            </div>
          )}
          {result.reveal && (
            <div className="notice puzzle-reveal">
              <strong>정답과 작성 예시</strong>
              <p>
                {result.reveal.answerKeywordIds
                  .map(
                    (id) =>
                      content.keywords.find((k) => k.id === id)?.label ?? id,
                  )
                  .join(" · ")}
              </p>
              <HighlightedPrompt
                prompt={result.reveal.prompt}
                highlights={result.reveal.highlights}
              />
              {result.reveal.tips.map((t, i) => (
                <div key={i}>
                  <strong>{t.title}</strong>
                  <p>{t.text}</p>
                </div>
              ))}
              <p className="caption">
                생성 모델: {result.reveal.modelId} · 검수 전 초안
              </p>
            </div>
          )}
          <div className="notice">
            {result.passed ? (
              <>
                <strong>성공 보상 +{result.ep} EP</strong>
                <p className="caption">
                  기본 {ECONOMY_POLICY.challengeBase} + 남은 예산에 따른 보너스
                </p>
              </>
            ) : (
              <p className="caption">
                재시도하면 키워드·모델 선택이 초기화돼요.
                <br />
                예산은 복구돼요. 남은 도전 {result.remaining} / 5회
              </p>
            )}
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                if (result.passed || result.remaining === 0) {
                  setResult(null);
                  a.navigate("/mission");
                } else reset();
              }}
            >
              {result.passed
                ? "확인"
                : result.remaining
                  ? "재시도하기 · " + result.remaining + "회 남음"
                  : "오늘의 미션으로"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
