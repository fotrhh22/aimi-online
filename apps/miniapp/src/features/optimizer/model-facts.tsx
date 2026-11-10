import { AAScoreChart } from "./aa-score-chart";
import React from "react";
import { estimateMedia } from "@aimi/recommender";
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
    ? `$${estimate.usd.toLocaleString("en-US", { maximumFractionDigits: 6 })} / ${model.media.kind === "image" ? "1장" : "설정한 영상 1개"} (비교 가정)`
    : "제작 조건별 과금 · 상세에서 확인";
}
function MediaFacts({ model }: { model: ModelRecord }) {
  const media = model.media!;
  const estimate = estimateMedia(model, media.kind);
  const v = media.video;
  return (
    <div className="model-detail-facts">
      <section className="notice model-fact-section">
        <h3>지원 출력·작업</h3>
        <p>
          {model.outputModalities?.join(" · ")} ·{" "}
          {media.operation === "edit"
            ? "편집 전용"
            : media.operation === "upscale"
              ? "업스케일 전용"
              : "생성"}
        </p>
        <p className="caption">{model.description}</p>
        <ul className="model-feature-tags">
          {featureLabels(model).map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </section>
      <section className="notice model-fact-section">
        <h3>제작 비용</h3>
        <p>{modelPriceLabel(model)}</p>
        <p className="caption">
          {estimate.usd !== null ? estimate.basis : estimate.reason}
        </p>
        {media.imageEndpoints.map((e, i) => (
          <div className="media-endpoint" key={i}>
            <h4>{e.provider_name}</h4>
            <dl className="model-fact-rows">
              {e.pricing.map((p, j) => (
                <div key={j}>
                  <dt>
                    {(
                      {
                        output_image: "이미지 출력",
                        input_image: "이미지 입력",
                        input_text: "텍스트 입력",
                        input_reference: "참조 이미지",
                      } as Record<string, string>
                    )[p.billable] ?? p.billable}
                    {p.variant ? ` · ${p.variant}` : ""}
                  </dt>
                  <dd>
                    ${p.cost_usd} / {p.unit}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        {v?.pricing_skus && (
          <dl className="model-fact-rows">
            {Object.entries(v.pricing_skus).map(([key, price]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  {key.startsWith("cents_") ? `${price} US¢` : `$${price}`}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {!media.imageEndpoints.length && !v && (
          <dl className="model-fact-rows">
            {Object.entries(media.rawPricing).map(([key, price]) => (
              <div key={key}>
                <dt>{key} (API 원본 단가)</dt>
                <dd>${price}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="caption">
          USD · 단위·설정에 따라 달라요. 토큰 단가를 장당·영상당 가격으로 바꾸지
          않아요. 예상비용을 계산하지 못한 항목은 무료가 아니에요.
        </p>
      </section>
      <section className="notice model-fact-section">
        <h3>제작 지원 조건</h3>
        {Object.entries(media.parameters).map(([key, p]) => (
          <p key={key}>
            {key}: {p.values?.join(" · ") ?? `${p.min ?? ""} ~ ${p.max ?? ""}`}
          </p>
        ))}
        {v && (
          <>
            <p>해상도: {v.supported_resolutions?.join(" · ") ?? "미확인"}</p>
            <p>
              길이: {v.supported_durations?.join(" · ") ?? "작업별 확인 필요"}초
            </p>
            <p>
              화면 비율: {v.supported_aspect_ratios?.join(" · ") ?? "미확인"}
            </p>
            <p>
              오디오 동시 생성: {v.generate_audio ? "지원" : "미확인·미지원"}
            </p>
          </>
        )}
        <p className="caption">
          엔드포인트마다 실제 허용 조건이 다를 수 있어요. AA 텍스트 종합
          점수·토큰 출력 속도를 생성 품질 지표로 사용하지 않아요.
        </p>
      </section>
      <p className="source-note">
        <a href={media.sourceUrl} target="_blank" rel="noreferrer">
          OpenRouter 모델·엔드포인트 자료
        </a>{" "}
        · {model.asOf.slice(0, 10)}
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
      <AAScoreChart profile={profile} />
      <p className="source-note">
        가격·지원 정보:{" "}
        <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">
          OpenRouter
        </a>
        {" · "}
        {model.asOf.slice(0, 10)}
        <br />
        성능·속도:{" "}
        <a
          href="https://artificialanalysis.ai"
          target="_blank"
          rel="noreferrer"
        >
          Artificial Analysis
        </a>
        {profile && (
          <>
            {" "}
            · {profile.asOf.slice(0, 10)} · 종합 지표 v{profile.indexVersion}
          </>
        )}
      </p>
    </div>
  );
}
