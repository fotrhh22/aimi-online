import {
  compactNumbers,
  imageRateCopy,
  mediaIntroduction,
  parameterCopy,
  videoRateCopy,
} from "./model-copy";
import { AAScoreChart } from "./aa-score-chart";
import React from "react";
import { estimateMedia, comparisonSummary } from "@aimi/recommender";
import {
  type AAProfile,
  type ModelRecord,
  type MediaRequest,
} from "@aimi/contracts";

export function displayAAProfile(
  model: ModelRecord,
  id?: string,
): AAProfile | undefined {
  return (
    model.aaProfiles?.find((p) => p.id === (id ?? model.defaultAAProfileId)) ??
    model.aaProfiles?.[0]
  );
}
export function pricePerMillion(value: number) {
  return (
    "$" +
    (value * 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 6 })
  );
}
export function modelPriceLabel(
  model: ModelRecord,
  options?: MediaRequest,
): string {
  if (!model.media)
    return `입력 ${pricePerMillion(model.inputPrice)} · 출력 ${pricePerMillion(model.outputPrice)} / 100만 토큰`;
  const estimate = estimateMedia(model, model.media.kind, options);
  return estimate.usd !== null
    ? `$${estimate.usd.toLocaleString("en-US", { maximumFractionDigits: 6 })} / ${model.media.kind === "image" ? "1장" : "설정한 영상 1개"} (예시 조건)`
    : "제작 조건별 과금 · 상세에서 확인";
}
function MediaFacts({ model }: { model: ModelRecord }) {
  const media = model.media!;
  const estimate = estimateMedia(model, media.kind);
  const v = media.video;
  const support = Object.keys(media.parameters).length
    ? media.parameters
    : ((
        media.imageEndpoints.find(
          (e) => e.provider_name === estimate.provider,
        ) ?? media.imageEndpoints[0]
      )?.supported_parameters ?? {});
  const parameters = Object.entries(support)
    .map(([key, p]) => parameterCopy(key, p))
    .filter((p) => p !== null);
  return (
    <div className="model-detail-facts">
      <section className="notice model-fact-section">
        <h3>어떤 작업에 쓰나요?</h3>
        <p>{mediaIntroduction(model)}</p>
        <p className="caption">
          만드는 결과: {media.kind === "video" ? "영상" : "이미지"} ·{" "}
          {media.operation === "edit"
            ? "기존 결과 수정"
            : media.operation === "upscale"
              ? "해상도 높이기"
              : "새로 만들기"}
        </p>
      </section>
      <section className="notice model-fact-section">
        <h3>제작 비용</h3>
        <p className="model-estimated-price">
          {estimate.usd !== null
            ? modelPriceLabel(model)
            : "제작 조건에 따라 비용이 달라요"}
        </p>
        <p className="caption">
          {estimate.usd !== null
            ? `예시 조건: ${comparisonSummary(media.kind)}${media.kind === "video" ? " · 소리 생성 미요청" : ""}`
            : "공개된 단가만으로 이 조건의 총비용을 계산하기 어려워요."}
        </p>
        <details className="model-price-details">
          <summary>세부 요금 보기</summary>
          {media.imageEndpoints.map((e, i) => (
            <div className="media-endpoint" key={i}>
              <h4>{e.provider_name} 제공 요금</h4>
              <dl className="model-fact-rows">
                {e.pricing.map((p, j) => {
                  const row = imageRateCopy(p);
                  return (
                    <div key={j}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
          {v?.pricing_skus && (
            <dl className="model-fact-rows">
              {Object.entries(v.pricing_skus).map(([key, price]) => {
                const row = videoRateCopy(key, price);
                return row ? (
                  <div key={key}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ) : null;
              })}
            </dl>
          )}
          {!media.imageEndpoints.length && !v && (
            <p className="caption">확인된 제작 단가가 아직 없어요.</p>
          )}
        </details>
        <p className="caption">
          미국 달러 기준의 참고 가격이에요. 제작 조건·제공사에 따라 실제 비용은
          달라질 수 있어요.
        </p>
      </section>
      <section className="notice model-fact-section">
        <h3>만들 수 있는 조건</h3>
        <dl className="model-fact-rows">
          {parameters.map((p) => (
            <div
              key={p.label}
              className={
                media.kind === "image" && p.label === "화면 비율"
                  ? "model-aspect-ratios"
                  : undefined
              }
            >
              <dt>{p.label}</dt>
              <dd
                tabIndex={
                  media.kind === "image" && p.label === "화면 비율"
                    ? 0
                    : undefined
                }
              >
                {p.value}
              </dd>
            </div>
          ))}
          {v && (
            <>
              <div>
                <dt>해상도</dt>
                <dd>{v.supported_resolutions?.join(" · ") || "정보 없음"}</dd>
              </div>
              <div>
                <dt>영상 길이</dt>
                <dd>{compactNumbers(v.supported_durations, "초")}</dd>
              </div>
              <div>
                <dt>화면 비율</dt>
                <dd>{v.supported_aspect_ratios?.join(" · ") || "정보 없음"}</dd>
              </div>
              <div>
                <dt>소리 함께 만들기</dt>
                <dd>
                  {v.generate_audio === true
                    ? "지원"
                    : v.generate_audio === false
                      ? "지원하지 않음"
                      : "확인된 정보 없음"}
                </dd>
              </div>
            </>
          )}
          {!v && !parameters.length && (
            <div>
              <dt>제작 설정</dt>
              <dd>제공사별 확인 필요</dd>
            </div>
          )}
        </dl>
        <p className="caption">
          제공사에 따라 선택 가능한 조건이 다를 수 있어요.
        </p>
      </section>
      <p className="source-note">
        출처: OpenRouter 모델·제공사 자료 · {model.asOf.slice(0, 10)}
      </p>
    </div>
  );
}
export function featureLabels(model: ModelRecord): string[] {
  const modalities = model.inputModalities ?? model.capabilities;
  return [
    ...(modalities.includes("text") ? ["텍스트"] : []),
    ...(modalities.includes("image") ? ["이미지 이해"] : []),
    ...(modalities.includes("audio") ? ["음성 입력"] : []),
    ...(modalities.includes("video") ? ["영상 입력"] : []),
    ...(modalities.includes("file") ? ["파일 입력"] : []),
    ...(model.capabilities.includes("tools") ? ["도구 사용"] : []),
    ...(model.capabilities.includes("json") ? ["구조화 출력"] : []),
  ];
}
const valueOrMissing = (value: number | null | undefined, suffix = "") =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + suffix
    : "평가 자료 없음";

export function ModelFacts({
  model,
  profileId,
  onProfileChange,
}: {
  model: ModelRecord;
  profileId?: string;
  onProfileChange?: (id: string) => void;
}) {
  if (model.media) return <MediaFacts model={model} />;
  const profile = displayAAProfile(model, profileId);
  return (
    <div className="model-detail-facts">
      <section
        className="notice model-fact-section"
        aria-labelledby="model-price-title"
      >
        <h3 id="model-price-title">사용 비용</h3>
        <dl className="model-fact-rows">
          <div>
            <dt>입력 100만 토큰당</dt>
            <dd>{pricePerMillion(model.inputPrice)}</dd>
          </div>
          <div>
            <dt>출력 100만 토큰당</dt>
            <dd>{pricePerMillion(model.outputPrice)}</dd>
          </div>
        </dl>
        <p className="caption">USD 기준 · 수집 시점의 참고 가격이에요.</p>
      </section>
      <section
        className="notice model-fact-section"
        aria-labelledby="model-capability-title"
      >
        <h3 id="model-capability-title">지원 기능과 길이</h3>
        <ul className="model-feature-tags" aria-label="지원 기능">
          {featureLabels(model).map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <dl className="model-fact-rows">
          <div>
            <dt>처리 가능한 길이</dt>
            <dd>{model.context.toLocaleString("ko-KR")}토큰</dd>
          </div>
        </dl>
        <p className="caption">입력·출력 합계 한도예요. 글자 수와는 달라요.</p>
      </section>
      {profile && (
        <section
          className="notice model-fact-section"
          aria-labelledby="aa-profile-title"
        >
          <h3 id="aa-profile-title">AA 측정 조건</h3>
          {model.aaProfiles && model.aaProfiles.length > 1 ? (
            <label className="model-profile-label">
              측정 모델·설정
              <select
                value={profile?.id ?? ""}
                onChange={(event) => onProfileChange?.(event.target.value)}
              >
                {model.aaProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="model-measurement-name">
              {profile?.name ?? "측정 조건 미확인"}
            </p>
          )}
          <p className="caption">
            {profile?.mappingStatus === "reviewed"
              ? "이 모델과 연결을 확인한 측정 자료예요."
              : "관련 모델의 참고 측정값이에요. 현재 제공 설정과의 연결은 검수 중이에요."}
          </p>
          <dl className="model-fact-rows">
            <div>
              <dt>출력 속도</dt>
              <dd>{valueOrMissing(profile?.speed, " 토큰/초")}</dd>
            </div>
          </dl>
          <p className="caption">
            선택한 측정 조건의 중앙값이에요. 실제 속도는 달라질 수 있어요.
          </p>
        </section>
      )}
      <AAScoreChart profile={profile} />
      <p className="source-note">
        출처: OpenRouter 가격·지원 정보 · {model.asOf.slice(0, 10)}
        {profile && (
          <>
            <br />
            출처: Artificial Analysis 성능·속도 · {profile.asOf.slice(0, 10)} ·
            종합 지표 v{profile.indexVersion}
          </>
        )}
      </p>
    </div>
  );
}
