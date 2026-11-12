import { getModelCatalog } from "../../lib/api/catalog";
import { ModelFacts, modelPriceLabel } from "./model-facts";
import { sourceName } from "./model-copy";
import {
  recommend,
  catalogClassifications,
  supportsOutput,
  comparisonRequest,
  comparisonSummary,
  type CatalogClassification,
} from "@aimi/recommender";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  availabilityLabel,
  OUTPUT_LABELS,
  SUPPORTED_OUTPUT_KINDS,
  isSupportedOutputKind,
  type OutputKind,
  type MediaRequest,
} from "@aimi/contracts";
import type {
  AIJob,
  AIResult,
  ModelRecord,
  TaskProfile,
} from "@aimi/contracts";
import { useApp } from "../../app/context";
import { AIUseNotice, Button, Icon, Notice } from "../../ui/primitives";
import { request, errorText, RequestError } from "../../lib/api/client";
import { copy } from "../../lib/toss/bridge";
export function Optimizer() {
  const a = useApp(),
    [text, setText] = useState(""),
    [visitId] = useState(() => crypto.randomUUID()),
    [job, setJob] = useState<AIJob | null>(null),
    [tab, setTab] = useState<"improved" | "extended">("improved"),
    [editing, setEditing] = useState(false),
    [selectedTip, setSelectedTip] = useState<string | null>(null),
    [improved, setImproved] = useState(""),
    [extended, setExtended] = useState(""),
    [draft, setDraft] = useState(""),
    [waiting, setWaiting] = useState(false),
    [starting, setStarting] = useState(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () =>
      a.registerBackHandler("/optimizer", () => {
        if (editing) {
          setEditing(false);
          return true;
        }
        return false;
      }),
    [editing, a.registerBackHandler],
  );
  const apply = (j: AIJob) => {
    setJob(j);
    if (j.result) {
      setImproved(j.result.improvedText);
      setExtended(j.result.extendedExample);
    }
  };
  const poll = async (id: string) => {
    setWaiting(true);
    try {
      for (let i = 0; i < 90 && alive.current; i++) {
        const j = await request<AIJob>("/v1/optimizer/jobs/" + id);
        if (!alive.current) return;
        apply(j);
        if (j.status !== "running") {
          if (j.status === "failed")
            a.setToast(
              errorText(new RequestError(j.error ?? "AI_FAILED", 503)),
            );
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(2500, 700 + i * 200)),
        );
      }
      if (alive.current)
        a.setToast(
          "처리가 길어지고 있어요. 다시 열면 결과를 확인할 수 있어요.",
        );
    } catch (e) {
      if (alive.current) a.setToast(errorText(e));
    } finally {
      if (alive.current) setWaiting(false);
    }
  };
  const start = async () => {
    if (starting || waiting) return;
    setStarting(true);
    try {
      const result = await a.perform(
        () =>
          request<{ id: string }>("/v1/optimizer/jobs", "POST", {
            text,
            visitId,
          }),
        undefined,
        "background",
      );
      if (alive.current && result) void poll(result.id);
    } finally {
      if (alive.current) setStarting(false);
    }
  };
  const r = job?.result,
    current = tab === "improved" ? improved : extended;
  const visibleTips = r?.tips.filter((t) => current.includes(t.quote)) ?? [];
  const activeTip = visibleTips.find((t) => t.quote === selectedTip);
  const originalText =
    tab === "improved" ? r?.improvedText : r?.extendedExample;
  const changed = !!r && current !== originalText;
  useEffect(() => {
    setSelectedTip(null);
  }, [tab, current]);
  return (
    <>
      {!r ? (
        <>
          <h2>어떻게 질문할까요?</h2>
          <AIUseNotice />
          <textarea
            className="prompt-input"
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            placeholder="평소 쓰는 질문을 입력해주세요"
            aria-label="개선할 질문"
          />
          <p className="caption green">{text.length} / 4000자</p>
          <p>
            평소 쓰는 질문을 입력하세요.
            <br />
            기존 의도를 다듬은 개선안과
            <br />
            조건을 추가한 예시를 볼 수 있어요.
          </p>
          {job?.status === "failed" && (
            <Notice title="처리하지 못했어요">
              {errorText(new RequestError(job.error ?? "AI_FAILED", 503))}
            </Notice>
          )}
          <div className="fixed-cta">
            <Button
              disabled={text.trim().length < 2 || waiting}
              loading={waiting || starting}
              onClick={() => void start()}
            >
              {waiting ? "질문을 다듬고 있어요" : "개선안·예시 보기"}
            </Button>
          </div>
        </>
      ) : (
        <div className="optimizer-result-flow">
          <div className="text-tabs">
            <button
              aria-selected={tab === "improved"}
              onClick={() => {
                setTab("improved");
                setEditing(false);
              }}
            >
              개선안
            </button>
            <button
              aria-selected={tab === "extended"}
              onClick={() => {
                setTab("extended");
                setEditing(false);
              }}
            >
              확장안
            </button>
          </div>
          <h2 className="section-heading">
            {tab === "improved"
              ? "원문의 의도를 유지했어요"
              : "이렇게 더 구체화해보세요"}
          </h2>
          <div className="prompt-result">
            <small className="ai-result-label">
              {editing ||
              current !==
                (tab === "improved" ? r.improvedText : r.extendedExample)
                ? "AI 초안을 직접 수정한 질문이에요"
                : "AI가 작성한 질문이에요"}
            </small>
            {editing ? (
              <textarea
                aria-label="결과 문장 편집"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={7000}
              />
            ) : (
              <p>{current}</p>
            )}
            <div className="prompt-actions">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)}>취소</button>
                  <button
                    onClick={() => {
                      if (tab === "improved") setImproved(draft);
                      else setExtended(draft);
                      setEditing(false);
                    }}
                  >
                    저장
                  </button>
                </>
              ) : (
                <>
                  <button
                    aria-label="문장 편집"
                    onClick={() => {
                      setDraft(current);
                      setEditing(true);
                    }}
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    aria-label="문장 복사"
                    onClick={() =>
                      void a.perform(
                        () => copy(current),
                        "문장을 복사했어요.",
                        "none",
                      )
                    }
                  >
                    <Icon name="copy" />
                  </button>
                </>
              )}
            </div>
          </div>
          {!editing && visibleTips.length > 0 && (
            <section className="writing-tips" aria-label="구절별 작성 팁">
              <div className="writing-tip-chips">
                {visibleTips.map((t) => (
                  <button
                    key={t.quote}
                    aria-pressed={selectedTip === t.quote}
                    onClick={() =>
                      setSelectedTip(selectedTip === t.quote ? null : t.quote)
                    }
                  >
                    {t.quote}
                  </button>
                ))}
              </div>
              {activeTip && (
                <div className="writing-tip-detail" role="status">
                  <strong>작성 팁</strong>
                  <p>{activeTip.tip}</p>
                </div>
              )}
              <p className="caption">
                구절을 누르면 AI가 설명한 작성 팁을 볼 수 있어요.
              </p>
            </section>
          )}
          <div className="section">
            <div className="notice prompt-explanation">
              <strong>
                {tab === "improved" ? "이렇게 바꿨어요" : "선택적 확장 제안"}
              </strong>
              {changed && (
                <p className="caption">
                  아래 설명은 AI가 처음 작성한 문장 기준이에요.
                </p>
              )}
              {(tab === "improved" ? r.changes : r.addedAssumptions).length >
              0 ? (
                <ul className="prompt-change-list">
                  {(tab === "improved" ? r.changes : r.addedAssumptions).map(
                    (item, i) => (
                      <li key={i}>{item}</li>
                    ),
                  )}
                </ul>
              ) : (
                <p>
                  {tab === "improved"
                    ? "추가로 설명할 변경 사항이 없어요."
                    : "새로 추가한 조건이 없어요."}
                </p>
              )}
              {tab === "extended" && (
                <p className="caption">
                  추가한 조건은 제안이에요. 내 상황에 맞게 바꾸거나
                  삭제해주세요.
                </p>
              )}
            </div>
          </div>
          <p className="caption">
            AI에 입력할 질문이에요. 필요하면 직접 수정하세요.
            <br />
            수정한 최종 문장으로 모델을 추천해요.
          </p>
          {r.source === "development-fixture" && (
            <small className="sample-label">
              개발용 예시 응답 · 실제 Gemini 결과 아님
            </small>
          )}
          <div className="optimizer-result-actions">
            <div className="fixed-cta">
              <Button
                disabled={editing}
                onClick={() => {
                  sessionStorage.setItem("aimi.recommendation.input", current);
                  a.navigate("/recommendations");
                }}
              >
                모델 추천받기
              </Button>
            </div>
            <Button
              weak
              className="optimizer-restart-button"
              onClick={() => {
                setJob(null);
                sessionStorage.removeItem("aimi.optimizer.job");
              }}
            >
              다른 질문 다듬기
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
type Recommendation = {
  outputKind?: OutputKind;
  comparison?: MediaRequest;
  evidenceNote?: string;
  estimates?: Record<
    string,
    { usd: number | null; basis: string; provider?: string }
  >;
  status: string;
  models: ModelRecord[];
  tier: "Small" | "Medium" | "High";
  task: TaskProfile;
  source: string;
  snapshotSample: boolean;
  threshold: number | null;
};
export function Recommendations() {
  const a = useApp(),
    [text, setText] = useState(
      sessionStorage.getItem("aimi.recommendation.input") ?? "",
    ),
    [result, setResult] = useState<Recommendation | null>(null),
    [outputKind, setOutputKind] = useState<OutputKind>("text"),
    [mediaOptions, setMediaOptions] = useState<MediaRequest | undefined>(
      undefined,
    ),
    [visitId] = useState(() => crypto.randomUUID()),
    [resultText, setResultText] = useState(""),
    [tier, setTier] = useState<"Small" | "Medium" | "High">("Small"),
    [recommending, setRecommending] = useState(false),
    [recommendationError, setRecommendationError] = useState(false),
    [search, setSearch] = useState(""),
    [all, setAll] = useState<ModelRecord[]>([]),
    [catalogLoading, setCatalogLoading] = useState(true),
    [catalogError, setCatalogError] = useState(false),
    [catalogRevision, setCatalogRevision] = useState(0),
    [visibleCount, setVisibleCount] = useState(60),
    [openTier, setOpenTier] = useState<"Small" | "Medium" | "High" | null>(
      null,
    ),
    pending = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    if (a.path !== "/recommendations") return;
    const handed = sessionStorage.getItem("aimi.recommendation.input");
    if (handed !== null) {
      setText(handed);
      setResult(null);
      setResultText("");
      setOpenTier(null);
      sessionStorage.removeItem("aimi.recommendation.input");
    }
  }, [a.path]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(false);
    void getModelCatalog()
      .then((r) => {
        if (!cancelled) setAll(r.models);
      })
      .catch(() => {
        if (!cancelled) setCatalogError(true);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogRevision]);
  useEffect(() => {
    setVisibleCount(60);
  }, [search, tier, outputKind]);
  const run = async (requestedTier?: "Small" | "Medium" | "High") => {
    if (pending.current || text.trim().length < 2) return;
    pending.current = true;
    setRecommending(true);
    setRecommendationError(false);
    if (requestedTier) setTier(requestedTier);
    const input = text;
    try {
      const r = await a.perform(
        () =>
          request<Recommendation>("/v1/recommendations", "POST", {
            text: input,
            visitId,
            outputKind,
            ...(requestedTier ? { tier: requestedTier } : {}),
          }),
        undefined,
        "background",
      );
      if (!alive.current) return;
      if (r) {
        setResult(r);
        const proposed = r.outputKind ?? r.task.outputKind ?? "text";
        setOutputKind(isSupportedOutputKind(proposed) ? proposed : "text");
        setMediaOptions(r.comparison ?? r.task.media);
        setResultText(input);
        setTier(r.tier);
        setOpenTier(r.tier);
        setVisibleCount(60);
      } else setRecommendationError(true);
    } finally {
      pending.current = false;
      if (alive.current) setRecommending(false);
    }
  };
  const current =
    !recommending && resultText === text && result?.tier === tier
      ? result
      : null;
  const recommended = new Map((current?.models ?? []).map((m, i) => [m.id, i]));
  const catalog = useMemo(
    () => [
      ...new Map(
        [...all, ...(current?.models ?? [])].map((m) => [m.id, m]),
      ).values(),
    ],
    [all, current?.models],
  );
  const classifications = useMemo(
    () => catalogClassifications(catalog),
    [catalog],
  );
  const outputModels = catalog.filter((m) => supportsOutput(m, outputKind));
  const rows = outputModels
    .filter((m) => classifications.get(m.id)?.tier === tier)
    .filter((m) =>
      (m.name + " " + m.provider + " " + m.id)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (x, y) =>
        (recommended.get(x.id) ?? 999) - (recommended.get(y.id) ?? 999) ||
        x.name.localeCompare(y.name),
    );
  const compare = (
    kind: OutputKind,
    selectedTier: "Small" | "Medium" | "High",
    options?: MediaRequest,
  ) => {
    if (result && resultText === text) {
      const next = recommend(
        all,
        { ...result.task, outputKind: kind, media: options },
        selectedTier,
      );
      setResult({ ...result, ...next, tier: selectedTier, outputKind: kind });
    }
  };
  const changeOutput = (kind: OutputKind) => {
    setOutputKind(kind);
    setMediaOptions(undefined);
    setSearch("");
    setOpenTier(null);
    setResult(null);
    setResultText("");
    setRecommendationError(false);
  };
  const settings = comparisonRequest(outputKind, mediaOptions);
  return (
    <>
      <section className="output-selector" aria-label="출력 형태">
        <h2>어떤 결과물이 필요한가요?</h2>
        <p className="caption">
          출력 형태를 고른 뒤, 필요한 작업을 입력해주세요.
        </p>
        <div className="output-kind-tabs">
          {SUPPORTED_OUTPUT_KINDS.map((kind) => (
            <button
              key={kind}
              aria-pressed={kind === outputKind}
              disabled={recommending}
              onClick={() => changeOutput(kind)}
            >
              {OUTPUT_LABELS[kind]}{" "}
              <small>
                {catalog.filter((m) => supportsOutput(m, kind)).length}
              </small>
            </button>
          ))}
        </div>
      </section>
      <AIUseNotice />
      <div className="recommendation-input">
        <input
          aria-label="추천받을 업무"
          value={text}
          maxLength={4000}
          disabled={recommending}
          placeholder={
            {
              text: "어떤 글이나 답변이 필요한가요?",
              image: "어떤 이미지를 만들고 싶나요?",
              video: "어떤 영상을 만들고 싶나요?",
            }[outputKind as "text" | "image" | "video"]
          }
          onChange={(e) => setText(e.target.value)}
        />
        <button
          aria-label="모델 추천 실행"
          disabled={text.trim().length < 2 || recommending}
          onClick={() => void run()}
        >
          {recommending ? (
            <span className="recommendation-spinner" aria-hidden="true" />
          ) : (
            "→"
          )}
        </button>
      </div>
      <p className="caption green" role="status" aria-live="polite">
        {recommending
          ? "업무를 분석하고 모델을 추천하고 있어요."
          : recommendationError
            ? "추천하지 못했어요. 다시 시도해주세요."
            : current
              ? "업무 분석을 마쳤어요."
              : "사용할 업무를 입력하면 맞는 등급과 모델을 비교해요."}
      </p>
      {current && (
        <section
          className="recommendation-explanation"
          aria-label="AI 추천 설명"
        >
          <h2>
            {current.source === "gemini" ? "AI 제안" : "개발 예시 제안"} ·{" "}
            {OUTPUT_LABELS[current.task.outputKind ?? "text"]} ·{" "}
            {current.task.suggestedTier}
          </h2>
          {current.task.taskSummary && (
            <p className="recommendation-task-summary">
              {current.task.taskSummary}
            </p>
          )}
          {current.tier !== current.task.suggestedTier && (
            <p className="caption">현재 선택: {current.tier}</p>
          )}
          <details
            className="recommendation-details"
            key={`${resultText}:${current.task.outputKind}:${current.task.suggestedTier}`}
          >
            <summary>추천 이유·비교 안내</summary>
            <div className="recommendation-details-body">
              <p>{current.task.reason}</p>
              {current.evidenceNote && (
                <p className="caption">{current.evidenceNote}</p>
              )}
              {current.task.unknowns.length > 0 && (
                <p className="caption">
                  확인할 정보: {current.task.unknowns.join(" · ")}
                </p>
              )}
              <p className="caption">
                조건을 충족한 후보 중 예상비용순으로 최대 3개를 추천해요.
              </p>
            </div>
          </details>
        </section>
      )}
      {current?.status !== "UNSUPPORTED_OUTPUT" && (
        <>
          <section className="output-comparison-context">
            <h2>{OUTPUT_LABELS[outputKind]} 모델 비교</h2>
            {current &&
              current.task.outputKind &&
              current.task.outputKind !== outputKind && (
                <p className="caption">
                  AI는 {OUTPUT_LABELS[current.task.outputKind]} 출력을
                  제안했어요. 현재는 직접 선택한 {OUTPUT_LABELS[outputKind]}{" "}
                  모델을 비교해요.
                </p>
              )}
            {current && (outputKind === "image" || outputKind === "video") && (
              <p className="caption media-comparison-summary">
                비교 기준: {comparisonSummary(outputKind, mediaOptions)}
                <span>
                  요청에 없는 조건은 비용 비교용 기본값이에요. 바꾸려면 요청에
                  적어주세요.
                </span>
              </p>
            )}
            {!["text", "image", "video"].includes(outputKind) && (
              <p className="caption">
                이 분야는 모델 목록과 공개 단가를 탐색할 수 있어요. 분야별
                품질·과금 조건 검수 전 자동 비용 추천은 제공하지 않아요.
              </p>
            )}
          </section>
          <div className="tier-list" aria-label="추천 등급">
            {(["Small", "Medium", "High"] as const).map((value, i) => (
              <React.Fragment key={value}>
                <button
                  aria-expanded={openTier === value}
                  aria-pressed={tier === value}
                  disabled={recommending}
                  onClick={() => {
                    setTier(value);
                    setOpenTier(openTier === value ? null : value);
                    setSearch("");
                    if (result && resultText === text) {
                      compare(outputKind, value, mediaOptions);
                    }
                  }}
                >
                  <strong>{value}</strong>
                  <small>{["경량·효율형", "균형형", "고성능형"][i]}</small>
                  <span className="tier-model-count">
                    {
                      outputModels.filter(
                        (m) => classifications.get(m.id)?.tier === value,
                      ).length
                    }
                    개 <Icon name={openTier === value ? "down" : "forward"} />
                  </span>
                </button>
                {openTier === value && (
                  <section
                    className="model-panel"
                    aria-label={`${tier} 모델 비교`}
                    aria-busy={recommending || catalogLoading}
                  >
                    <div className="model-panel-heading">
                      <h3>{tier} 모델</h3>
                      <span>{rows.length}개</span>
                    </div>
                    <p className="caption model-panel-summary">
                      {recommending
                        ? "추천 모델을 고르고 있어요."
                        : current
                          ? `${tier} 모델을 모두 표시해요. 추천 모델은 연한 색으로 표시해요.`
                          : "업무에 맞는 추천 모델은 연한 색으로 표시해요."}
                    </p>
                    <input
                      aria-label="모델명·제공사 검색"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="모델명·제공사 검색"
                    />
                    {catalogLoading && (
                      <p role="status" className="caption">
                        모델 목록을 불러오고 있어요.
                      </p>
                    )}
                    {catalogError && (
                      <div className="catalog-error">
                        <p>모델 목록을 불러오지 못했어요.</p>
                        <button
                          className="text-link"
                          onClick={() => setCatalogRevision((v) => v + 1)}
                        >
                          다시 불러오기
                        </button>
                      </div>
                    )}
                    <div
                      className="model-list model-panel-list"
                      role="region"
                      aria-label="모델 목록"
                      tabIndex={0}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        if (
                          el.scrollTop + el.clientHeight >=
                          el.scrollHeight - 100
                        )
                          setVisibleCount((n) => Math.min(rows.length, n + 60));
                      }}
                    >
                      {rows.slice(0, visibleCount).map((m) => (
                        <button
                          key={m.id}
                          className={recommended.has(m.id) ? "recommended" : ""}
                          onClick={() => {
                            a.navigate("/models/" + encodeURIComponent(m.id));
                          }}
                        >
                          <strong>
                            {m.name}
                            <small className="model-evidence">
                              {classifications.get(m.id)?.tier}
                            </small>
                            <small className="model-card-price">
                              {modelPriceLabel(m, settings)}
                              {availabilityLabel(m.availability) && (
                                <span className="model-availability">
                                  {availabilityLabel(m.availability)}
                                </span>
                              )}
                            </small>
                          </strong>
                          <span>
                            {m.provider}
                            {recommended.has(m.id) && <b> 추천</b>} ›
                          </span>
                        </button>
                      ))}
                      {!catalogLoading && !catalogError && !rows.length && (
                        <p className="caption">
                          검색 조건에 맞는 모델이 없어요.
                        </p>
                      )}
                      {visibleCount < rows.length && (
                        <button
                          className="model-load-more"
                          onClick={() =>
                            setVisibleCount((n) =>
                              Math.min(rows.length, n + 60),
                            )
                          }
                        >
                          모델 더 보기 · {rows.length - visibleCount}개
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
      {current && current.status !== "ok" && (
        <Notice
          title={
            current.status === "UNSUPPORTED_OUTPUT"
              ? "현재 지원하지 않는 출력이에요"
              : current.status === "INSUFFICIENT_EVIDENCE"
                ? "추천 근거를 더 준비하고 있어요"
                : "조건에 맞는 추천 모델이 없어요"
          }
        >
          {current.status === "UNSUPPORTED_OUTPUT"
            ? "현재 텍스트·이미지·영상 모델만 제공해요. 음악·음성·대화형 오디오 등의 요청을 다른 분야 모델로 대신 추천하지 않아요."
            : current.task.taskType === "coding"
              ? "AA Coding Index 제공이 중단돼 코드 업무의 검증된 추천에 필요한 평가 자료가 없어요. 종합 점수를 코드 점수로 대신 쓰지 않아요. 모델 목록은 계속 볼 수 있어요."
              : outputKind !== "text"
                ? "선택한 출력 형태·모델군·제작 설정에서 동일 조건 비용을 비교할 수 있는 후보가 없어요. 설정을 바꾸거나 목록의 상세 자료를 확인해주세요."
                : "개별 제품군 정책과 품질 자료가 확인된 모델만 추천해요. 임시 배치 모델도 목록에서 볼 수 있어요."}
        </Notice>
      )}
    </>
  );
}
export function ModelDetails() {
  const a = useApp(),
    id = decodeURIComponent(a.path.slice("/models/".length));
  const [model, setModel] = useState<
    (ModelRecord & { catalogClassification?: CatalogClassification }) | null
  >(null);
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0),
    [profileId, setProfileId] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    setModel(null);
    setLoading(true);
    setFailed(false);
    setProfileId(undefined);
    // Always use the current selected catalogue; old session cache may contain removed models.
    void getModelCatalog()
      .then((result) => {
        if (cancelled) return;
        const found = result.models.find((m) => m.id === id);
        setModel(
          found
            ? {
                ...found,
                catalogClassification: catalogClassifications(
                  result.models,
                ).get(id),
              }
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, revision]);
  if (loading) return <p role="status">모델 정보를 불러오고 있어요.</p>;
  if (!model)
    return (
      <>
        <p role="status">
          {failed
            ? "모델 정보를 불러오지 못했어요."
            : "현재 목록에 없는 모델이에요."}
        </p>
        {failed && (
          <Button onClick={() => setRevision((n) => n + 1)}>
            다시 불러오기
          </Button>
        )}
        <Button weak onClick={a.back}>
          이전 화면으로
        </Button>
      </>
    );
  const group = model.catalogClassification;
  return (
    <>
      <h2 className="green">{model.name}</h2>
      <p className="caption">{model.provider}</p>
      {availabilityLabel(model.availability) && (
        <Notice title="모델 제공 상태">
          {availabilityLabel(model.availability)}
        </Notice>
      )}
      {group && (
        <div className="model-group-label">
          <strong>
            {group.tier} ·{" "}
            {
              { Small: "경량형", Medium: "균형형", High: "고성능형" }[
                group.tier
              ]
            }
          </strong>
          {group.basis === "provisional" && <span>제품군 분류 검토 중</span>}
          {group.reviewStatus === "prior-policy-retained" && (
            <span>분류 근거 보강 중</span>
          )}
          {group.sourceUrl && (
            <span className="caption">
              분류 출처: {sourceName(group.sourceUrl)}
            </span>
          )}
        </div>
      )}
      <ModelFacts
        model={model}
        profileId={profileId}
        onProfileChange={setProfileId}
      />
    </>
  );
}
