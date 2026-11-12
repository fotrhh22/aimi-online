import { SentenceCard } from "./sentence-card";
import { ModelAttribution } from "./model-attribution";
import { PendingRewardButton } from "./reward-popup";
import {
  challengeStage,
  selectChallengeResult,
  matchingChallengeAttempt,
} from "./view-state";
import { AttemptResults, PreviousCombinations } from "./attempt-results";
import React, { useState, useEffect } from "react";
import {
  ECONOMY_POLICY,
  PUZZLE_ATTEMPT_COST,
  PUZZLE_COUNT_HINT_COST,
  composeKeywordSentence,
  sortSentenceKeywords,
  type Attempt,
} from "@aimi/contracts";
import { useApp } from "../../app/context";
import {
  AIUseNotice,
  Button,
  ChallengeArt,
  Icon,
  Modal,
  Stats,
} from "../../ui/primitives";
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
  return <p className="challenge-highlighted-prompt">{parts}</p>;
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
    [hintConfirm, setHintConfirm] = useState(false),
    [introOpen, setIntroOpen] = useState(false),
    [gallery, setGallery] = useState<
      { id: string; target: string; model: string }[] | null
    >(null),
    [result, setResult] = useState<Attempt | null>(null),
    [resultError, setResultError] = useState(false);
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
  const requestedResultId = /^\/challenge\/(result|answer)\//.test(a.path)
    ? decodeURIComponent(a.path.split("/")[3].split("?")[0])
    : new URLSearchParams(a.path.split("?")[1] ?? "").get("result");
  useEffect(() => {
    if (
      !requestedResultId ||
      s.challengeAttempts?.some((r) => r.id === requestedResultId)
    )
      return;
    let cancelled = false;
    setResultError(false);
    void request<Attempt>(
      "/v1/attempts/" + encodeURIComponent(requestedResultId),
    )
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setResultError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requestedResultId]);
  const selected = sortSentenceKeywords(
    ids
      .map((id) => content.keywords.find((k) => k.id === id))
      .filter((k): k is NonNullable<typeof k> => Boolean(k)),
  );
  const cost = puzzle
    ? PUZZLE_ATTEMPT_COST
    : selected.reduce((n, k) => n + k!.cost, 0) + (model === "low" ? 12 : 40);
  const attemptsLeft = puzzle
    ? s.daily.success || s.daily.challengeClosed
      ? 0
      : Math.floor(s.budget / PUZZLE_ATTEMPT_COST)
    : (s.challengeRemaining ?? Math.max(0, 5 - s.daily.attemptsUsed));
  const closed =
    s.daily.success ||
    s.daily.challengeClosed === true ||
    (!puzzle && s.daily.attemptsUsed >= 5);
  const history = [
    ...new Map(
      [...(s.challengeAttempts ?? []), ...(result ? [result] : [])].map((r) => [
        r.id,
        r,
      ]),
    ).values(),
  ].sort((a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0));
  const stage = puzzle
    ? challengeStage(a.path, closed)
    : combination
      ? "combination"
      : "selection";
  const introKey = draftKey + ".intro-seen";
  useEffect(() => {
    if (
      puzzle &&
      stage === "selection" &&
      !closed &&
      !sessionStorage.getItem(introKey)
    ) {
      setIntroOpen(true);
    }
  }, [puzzle, stage, closed, introKey]);
  const dismissIntro = () => {
    sessionStorage.setItem(introKey, "true");
    setIntroOpen(false);
  };
  const { current: shownAttempt, previous: previousAttempts } =
    selectChallengeResult(history, requestedResultId);
  const terminalAttempt = [...history].reverse().find((r) => r.reveal);
  const submittedAttempt = matchingChallengeAttempt(history, ids);
  const submittedSelection = Boolean(submittedAttempt);
  const buyCountHint = () =>
    a.perform(
      () =>
        request<{ answerCount: number; cost: number }>(
          "/v1/challenge/count-hint",
          "POST",
          { date: s.daily.date, contentVersion: content.version },
        ),
      undefined,
      "all",
    );
  const submit = async () => {
    const origin = a.path;
    const r = await a.perform(
      () =>
        request<Attempt>("/v1/challenge/attempts", "POST", {
          keywordIds: ids,
          ...(puzzle ? {} : { model }),
          date: s.daily.date,
          contentVersion: content.version,
        }),
      undefined,
      "all",
    );
    if (r && a.isCurrentPath(origin)) {
      setResult(r);
      if (puzzle)
        a.navigate("/challenge/result/" + encodeURIComponent(r.id), {
          replace: true,
        });
    }
  };
  const resultHistory = shownAttempt ? (
    <AttemptResults
      attempts={[shownAttempt]}
      keywords={content.keywords}
      heading={false}
    />
  ) : null;
  const countHint =
    puzzle && !closed ? (
      content.answerCount !== undefined ? (
        <span className="challenge-count-hint purchased" role="status">
          정답 키워드<strong>{content.answerCount}개</strong>
        </span>
      ) : (
        <button
          className="challenge-count-hint"
          disabled={
            a.busy || s.budget < PUZZLE_COUNT_HINT_COST + PUZZLE_ATTEMPT_COST
          }
          aria-label={`정답 키워드 개수 보기, ${PUZZLE_COUNT_HINT_COST}예산 사용`}
          title="구매 후 시도할 30예산이 남아야 해요."
          onClick={() => setHintConfirm(true)}
        >
          <span className="challenge-hint-label">
            <Icon name="hint" />
            {a.busy ? "처리 중…" : "개수 힌트"}
          </span>
          <small>예산 {PUZZLE_COUNT_HINT_COST} 소모</small>
        </button>
      )
    ) : null;
  const reset = () => {
    setIds([]);
    setModel("low");
    setResult(null);
    a.navigate("/challenge");
  };
  return (
    <>
      {introOpen && puzzle && stage === "selection" && !closed && (
        <Modal title="그림 속 단어 찾기" onClose={dismissIntro}>
          <p>그림을 설명하는 단어를 모두 골라 프롬프트를 맞춰보세요.</p>
          <p className="caption">
            시도 {PUZZLE_ATTEMPT_COST}예산 · 개수 힌트 {PUZZLE_COUNT_HINT_COST}
            예산 사용
          </p>
          <div className="dialog-actions">
            <Button onClick={dismissIntro}>알겠어요</Button>
          </div>
        </Modal>
      )}
      {hintConfirm && (
        <Modal
          title="정답 개수 힌트"
          dismissible={!a.busy}
          onClose={() => setHintConfirm(false)}
        >
          <p>
            {PUZZLE_COUNT_HINT_COST}예산을 사용하면 정답 단어 개수를 알려드려요.
            오늘은 다시 구매하지 않아도 볼 수 있어요.
          </p>
          <p className="caption">
            구매 후 남을 예산 {Math.max(0, s.budget - PUZZLE_COUNT_HINT_COST)} ·
            시도 가능{" "}
            {Math.floor(
              Math.max(0, s.budget - PUZZLE_COUNT_HINT_COST) /
                PUZZLE_ATTEMPT_COST,
            )}
            회
          </p>
          <div className="dialog-actions hint-purchase-actions">
            <Button weak onClick={() => setHintConfirm(false)}>
              닫기
            </Button>
            <Button
              loading={a.busy}
              disabled={
                a.busy ||
                closed ||
                s.budget < PUZZLE_COUNT_HINT_COST + PUZZLE_ATTEMPT_COST
              }
              onClick={async () => {
                const purchased = await buyCountHint();
                if (purchased) setHintConfirm(false);
              }}
            >
              힌트 보기
            </Button>
          </div>
        </Modal>
      )}
      {puzzle && (stage === "selection" || stage === "combination") && (
        <div className="challenge-round-meta">
          <strong>{s.daily.attemptsUsed + 1}번째 시도</strong>
          <span>
            예산 {s.budget} · 남은 시도 {attemptsLeft}회
          </span>
        </div>
      )}
      {puzzle &&
      (stage === "result" || stage === "answer") ? null : !combination ? (
        <>
          <div className="challenge-selection-target">
            <ChallengeArt src={content.target} />
          </div>
          <AIUseNotice image />
          <p className="challenge-selection-description">
            목표 이미지를 설명하는 정답 단어를 모두 골라보세요.
            대상·개수·색상·배경·그림체가 단서예요.
          </p>
          <div className="challenge-keyword-heading">
            <div>
              <h2>필요한 단어를 골라보세요</h2>
              <p className="caption">누르면 선택되고, 다시 누르면 해제돼요.</p>
            </div>
            {countHint}
          </div>
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
                  ? "오늘 챌린지 종료"
                  : "조합 확인 ›"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="challenge-combination-target">
            <ChallengeArt src={content.target} />
          </div>
          <section
            className="challenge-selected-summary"
            aria-label="선택한 키워드"
          >
            <h2>
              선택한 키워드 <span className="caption">{selected.length}개</span>
            </h2>
            <div className="challenge-selected-labels">
              {selected.map((k) => (
                <span key={k.id}>{k.label}</span>
              ))}
            </div>
          </section>
          <SentenceCard title="조합 문장" className="challenge-prompt">
            {puzzle
              ? composeKeywordSentence(selected)
              : selected.map((k) => k.label).join(" · ") +
                " 조건으로 표현해줘."}
          </SentenceCard>
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
          <p className="caption">
            {submittedSelection
              ? "이미 확인한 조합이에요. 아래에서 결과를 펼쳐보거나 단어를 바꿔보세요."
              : `1회 ${cost}예산 · 이후 ${Math.max(0, s.budget - cost)}예산`}
          </p>
          <PreviousCombinations
            attempts={history}
            keywords={content.keywords}
          />
          <div className="fixed-cta">
            <Button
              loading={a.busy}
              disabled={
                a.busy ||
                (!submittedAttempt &&
                  (cost > s.budget || !ids.length || closed))
              }
              onClick={() =>
                submittedAttempt ? a.navigate("/challenge") : void submit()
              }
            >
              {submittedAttempt ? "키워드 다시 고르기" : "프롬프트 맞추기"}
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
          {content.reviewStatus === "unreviewed" && (
            <>
              <p className="caption">검수 전 미리보기 이미지예요.</p>
              <button
                className="text-link"
                onClick={() => {
                  setZoom(false);
                  void request<{
                    images: { id: string; target: string; model: string }[];
                  }>("/v1/content/previews")
                    .then((r) => setGallery(r.images))
                    .catch(() => a.setToast("이미지를 불러오지 못했어요."));
                }}
              >
                10일 이미지 모아보기 ›
              </button>
            </>
          )}
          <div className="dialog-actions">
            <Button onClick={() => setZoom(false)}>확인</Button>
          </div>
        </Modal>
      )}
      {puzzle && stage === "result" && (
        <>
          {shownAttempt && (
            <section className="challenge-outcome" role="status">
              <h2>
                {shownAttempt.passed
                  ? "성공했어요!"
                  : closed
                    ? "아쉽게 실패했어요"
                    : "아직 정답이 아니에요"}
              </h2>
              <p>
                {shownAttempt.passed
                  ? "목표 이미지의 키워드를 모두 맞혔어요."
                  : closed
                    ? "오늘의 챌린지를 마쳤어요. 해설에서 정답과 작성 팁을 확인해보세요."
                    : "선택한 키워드를 확인하고 다시 시도해보세요."}
              </p>
            </section>
          )}
          {shownAttempt && (
            <figure className="challenge-result-image">
              <ChallengeArt src={shownAttempt.image || content.target} />
              <figcaption>목표 이미지</figcaption>
            </figure>
          )}
          {shownAttempt ? (
            resultHistory
          ) : (
            <p role="status">
              {resultError
                ? "결과를 불러오지 못했어요. 미션에서 다시 확인해주세요."
                : "결과를 불러오고 있어요."}
            </p>
          )}
          {!closed && shownAttempt && (
            <p className="caption">
              남은 예산 {s.budget} · 추가 시도 {attemptsLeft}회
            </p>
          )}
          <PreviousCombinations
            attempts={previousAttempts}
            keywords={content.keywords}
          />
        </>
      )}
      {puzzle && stage === "answer" && closed && shownAttempt?.reveal && (
        <section className="puzzle-reveal puzzle-terminal challenge-answer-content">
          <h2>{s.daily.success ? "최종 결과: 성공" : "최종 결과: 실패"}</h2>
          <PendingRewardButton />
          <figure className="challenge-result-image">
            <ChallengeArt src={shownAttempt.image || content.target} />
            <figcaption>목표 이미지</figcaption>
          </figure>
          <strong>정답</strong>
          <p>
            {shownAttempt.reveal.answerKeywordIds
              .map(
                (id) => content.keywords.find((k) => k.id === id)?.label ?? id,
              )
              .join(" · ")}
          </p>
          <strong>정답 프롬프트</strong>
          <HighlightedPrompt
            prompt={shownAttempt.reveal.prompt}
            highlights={shownAttempt.reveal.highlights}
          />
          {shownAttempt.reveal.generationPrompt && (
            <details className="challenge-generation-record">
              <summary>실제 생성에 사용한 프롬프트</summary>
              {shownAttempt.reveal.generationPromptFormat && (
                <p className="caption">
                  작성 형식 · {shownAttempt.reveal.generationPromptFormat}
                </p>
              )}
              <p>{shownAttempt.reveal.generationPrompt}</p>
              <p className="caption">
                정답 프롬프트는 그림에서 확인한 조건으로 정리한 예시예요. 생성
                요청과 결과가 다른 부분은 작성 포인트에서 설명해요.
              </p>
            </details>
          )}
          <strong>오늘의 작성 포인트</strong>
          <small className="ai-result-label">
            AI와 함께 정리한 학습 해설이에요.
          </small>
          {shownAttempt.reveal.tips
            .filter((t) => t.kind !== "model")
            .map((t, i) => (
              <section className="challenge-learning-tip" key={i}>
                <strong>{t.title}</strong>
                <p>{t.text}</p>
              </section>
            ))}
          {shownAttempt.reveal.tips.some((t) => t.kind === "model") && (
            <strong>모델 참고 팁</strong>
          )}
          {shownAttempt.reveal.tips
            .filter((t) => t.kind === "model")
            .map((t, i) => (
              <section className="challenge-learning-tip" key={i}>
                <strong>{t.title}</strong>
                <p>{t.text}</p>
                {t.sourceLabel && (
                  <p className="caption challenge-tip-source">
                    출처: {t.sourceLabel}
                  </p>
                )}
              </section>
            ))}
          {shownAttempt.reveal.modelId && (
            <ModelAttribution modelId={shownAttempt.reveal.modelId} />
          )}
        </section>
      )}
      {puzzle && stage === "answer" && (
        <>
          {(!closed || !shownAttempt?.reveal) && (
            <p role="status">
              {resultError
                ? "정답을 불러오지 못했어요."
                : !closed
                  ? "정답은 챌린지가 끝난 뒤 확인할 수 있어요."
                  : shownAttempt
                    ? "이 챌린지에는 공개된 정답이 없어요."
                    : "정답을 불러오고 있어요."}
            </p>
          )}
          <div className="fixed-cta">
            <Button onClick={() => a.navigate("/", { replace: true })}>
              홈으로 가기
            </Button>
          </div>
        </>
      )}
      {puzzle && stage === "result" && (
        <div className="challenge-result-actions">
          {closed && terminalAttempt?.reveal && (
            <Button
              onClick={() =>
                a.navigate(
                  "/challenge/answer/" + encodeURIComponent(terminalAttempt.id),
                )
              }
            >
              해설 보러가기
            </Button>
          )}
          {!closed && shownAttempt && (
            <Button onClick={() => a.navigate("/mission", { replace: true })}>
              다시 시도하기
            </Button>
          )}
        </div>
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
                예산은 복구돼요. 남은 시도 {result.remaining} / 5회
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
