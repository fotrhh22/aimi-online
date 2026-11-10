import type { OutputKind, MediaRequest, MediaInfo } from "@aimi/contracts";
export type MediaModel = {
  id: string;
  name: string;
  asOf: string;
  productTier?: "Small" | "Medium" | "High";
  outputModalities?: string[];
  inputModalities?: string[];
  capabilities: string[];
  media?: MediaInfo;
};
export function supportsOutput(
  model: Pick<MediaModel, "outputModalities" | "media">,
  kind: OutputKind,
) {
  return kind === "text"
    ? !model.media && (model.outputModalities?.includes("text") ?? true)
    : !!model.outputModalities?.includes(kind);
}
export function comparisonRequest(
  kind: string,
  request?: MediaRequest,
): MediaRequest {
  return {
    ...(kind === "image"
      ? {
          operation: "generate" as const,
          resolution: "1K" as const,
          aspectRatio: "1:1" as const,
          referenceImages: request?.operation === "edit" ? 1 : 0,
        }
      : kind === "video"
        ? {
            operation: "generate" as const,
            resolution: "720p" as const,
            aspectRatio: "16:9" as const,
            durationSeconds: 6,
            generateAudio: false,
            referenceImages: request?.operation === "edit" ? 1 : 0,
          }
        : {}),
    ...request,
  };
}
/** Read-only description of the same conditions used by the cost calculator. */
export function comparisonSummary(
  kind: string,
  request?: MediaRequest,
): string {
  const r = comparisonRequest(kind, request);
  const parts = [
    r.operation === "edit"
      ? "수정·편집"
      : r.operation === "upscale"
        ? "업스케일"
        : "새로 생성",
    ...(kind === "video" ? [`${r.durationSeconds}초`] : []),
    r.resolution,
    r.aspectRatio,
    ...(r.referenceImages ? [`참조 ${r.referenceImages}장`] : []),
    ...(kind === "video" && r.generateAudio ? ["오디오 포함"] : []),
  ];
  return parts.filter(Boolean).join(" · ");
}
export type MediaEstimate = {
  usd: number | null;
  basis: string;
  provider?: string;
  reason?: string;
};
const finite = (x: number) => Number.isFinite(x) && x >= 0;
/** Same requested output settings. Unknown image/video token counts are never zero-cost. */
export function estimateMedia(
  model: MediaModel,
  kind: string,
  request?: MediaRequest,
): MediaEstimate {
  const r = comparisonRequest(kind, request),
    m = model.media;
  const unavailable = (reason: string): MediaEstimate => ({
    usd: null,
    basis: "동일 조건 비용 비교 불가",
    reason,
  });
  if (!m) return unavailable("제작 상세 자료 없음");
  if (
    m.operation !== (r.operation ?? "generate") &&
    !(kind === "image" && m.operation === "generate" && r.operation === "edit")
  )
    return unavailable("생성·편집·업스케일 작업이 달라요");
  if (kind === "image") {
    if (r.operation === "edit" && (r.referenceImages ?? 0) < 1)
      return unavailable("이미지 편집은 참조 이미지가 필요해요");
    const estimates: MediaEstimate[] = [];
    for (const e of m.imageEndpoints) {
      const p = e.supported_parameters,
        refs = r.referenceImages ?? 0;
      if (!p.aspect_ratio?.values?.includes(r.aspectRatio ?? "1:1")) continue;
      if (!p.resolution?.values?.includes(r.resolution ?? "1K")) continue;
      const ref = p.input_references;
      if (
        (refs > 0 && (!ref || refs > (ref.max ?? 0))) ||
        refs < (ref?.min ?? 0)
      )
        continue;
      const rates = e.pricing;
      const output = rates.filter(
        (x) =>
          x.billable === "output_image" &&
          (!x.variant ||
            x.variant.toLowerCase() === (r.resolution ?? "1K").toLowerCase()),
      );
      const resolutionVariants = rates.some(
        (x) =>
          x.billable === "output_image" &&
          !!x.variant &&
          /^(?:[0-9.]+k|[0-9]+|high_resolution)$/i.test(x.variant),
      );
      const rate =
        output.find((x) => x.variant) ??
        (r.resolution === "1K" || !resolutionVariants
          ? output.find((x) => !x.variant)
          : undefined);
      if (
        !rate ||
        !finite(rate.cost_usd) ||
        !["image", "megapixel"].includes(rate.unit)
      )
        continue;
      // Incompatible or token-metered input/reference/surcharges cannot be silently omitted.
      let extra = 0,
        valid = true;
      for (const cost of rates.filter(
        (x) => x.billable !== "output_image" && !x.variant,
      )) {
        if (!finite(cost.cost_usd)) {
          valid = false;
          break;
        }
        if (cost.billable === "input_text" && cost.unit === "token")
          extra += 200 * cost.cost_usd;
        else if (
          refs > 0 &&
          ["input_image", "input_reference"].includes(cost.billable) &&
          ["image", "request"].includes(cost.unit)
        )
          extra += cost.cost_usd * (cost.unit === "image" ? refs : 1);
        else if (
          refs > 0 &&
          ["input_image", "input_reference"].includes(cost.billable) &&
          cost.cost_usd > 0
        )
          valid = false;
      }
      if (!valid) continue;
      const side = (
        { "1K": 1024, "2K": 2048, "4K": 4096 } as Record<string, number>
      )[r.resolution ?? "1K"];
      if (!side) continue;
      // MP estimates only supported for square output; other shapes need exact endpoint sizing.
      if (rate.unit === "megapixel" && r.aspectRatio !== "1:1") continue;
      const usd =
        rate.cost_usd * (rate.unit === "megapixel" ? (side * side) / 1e6 : 1) +
        extra;
      estimates.push({
        usd,
        basis: `1장 · ${r.resolution} · ${r.aspectRatio} · 참조 ${refs}장 · 입력문 200토큰 가정`,
        provider: e.provider_name,
      });
    }
    return (
      estimates.sort((a, b) => a.usd! - b.usd!)[0] ??
      unavailable(
        "지원 설정 또는 확정 장당 가격 부족. 이미지 토큰 가격을 장당 가격으로 추정하지 않아요.",
      )
    );
  }
  if (kind === "video") {
    const v = m.video,
      duration = r.durationSeconds ?? 6,
      resolution = r.resolution ?? "720p",
      audio = r.generateAudio ?? false;
    if (
      !v?.supported_durations?.includes(duration) ||
      !v.supported_resolutions?.includes(resolution) ||
      !v.supported_aspect_ratios?.includes(r.aspectRatio ?? "16:9")
    )
      return unavailable("길이·해상도·비율을 지원하지 않아요");
    // Reference-image/edit paths need their own validated SKU; no text-to-video substitution.
    if ((r.referenceImages ?? 0) > 0 || r.operation !== "generate")
      return unavailable("참조·편집 작업별 가격 연결 필요");
    if (audio && !v.generate_audio)
      return unavailable("음성 동시 생성 지원 미확인");
    const skus = v.pricing_skus ?? {};
    const priceResolution = resolution.toLowerCase();
    const keys = audio
      ? [
          `duration_seconds_with_audio_${priceResolution}`,
          "duration_seconds_with_audio",
        ]
      : [
          `duration_seconds_without_audio_${priceResolution}`,
          `text_to_video_duration_seconds_${priceResolution}`,
          `duration_seconds_${priceResolution}`,
          `cents_per_video_output_second_${priceResolution}`,
          `cents_per_second_output_${priceResolution}`,
          "duration_seconds_without_audio",
          "duration_seconds",
          "cents_per_second_output",
        ];
    const key = keys.find(
      (k) =>
        skus[k] != null &&
        (resolution === "720p" || k.endsWith("_" + priceResolution)),
    );
    if (!key)
      return unavailable(
        "초당 확정 가격 없음. 영상 토큰 단가만으로 비용을 계산하지 않아요.",
      );
    const rate = Number(skus[key]) / (key.startsWith("cents_") ? 100 : 1);
    if (!finite(rate)) return unavailable("유효한 초당 가격 없음");
    return {
      usd: duration * rate,
      basis: `${duration}초 · ${resolution} · ${r.aspectRatio} · ${audio ? "오디오 포함" : "오디오 미요구"} · ${key}`,
    };
  }
  return unavailable("분야별 가격·품질 정책 검수 중. 목록 탐색만 가능해요.");
}
export function recommendMedia<T extends MediaModel>(
  models: T[],
  task: {
    outputKind?: OutputKind;
    requiredCapabilities: string[];
    media?: MediaRequest;
  },
  tier: "Small" | "Medium" | "High",
  now: Date,
) {
  const kind = task.outputKind ?? "text";
  const candidates = models.filter(
    (m) =>
      supportsOutput(m, kind) &&
      m.productTier === tier &&
      m.media?.groupPolicy.reviewStatus === "source-reviewed" &&
      Date.parse(m.asOf) <= now.getTime() &&
      now.getTime() - Date.parse(m.asOf) <= 30 * 86400_000 &&
      task.requiredCapabilities.every((c) => m.capabilities.includes(c)),
  );
  // Extra source media has its own billing; never quote a text-only generation as image/video editing.
  const inputsPriced =
    !task.requiredCapabilities.some((c) =>
      ["video", "audio", "file"].includes(c),
    ) &&
    (!task.requiredCapabilities.includes("image") ||
      (task.media?.referenceImages ?? 0) > 0);
  const ranked = (inputsPriced ? candidates : [])
    .map((m) => ({ model: m, estimate: estimateMedia(m, kind, task.media) }))
    .filter((x) => x.estimate.usd !== null)
    .sort(
      (a, b) =>
        a.estimate.usd! - b.estimate.usd! ||
        a.model.id.localeCompare(b.model.id),
    );
  return {
    status: ranked.length ? "ok" : "NO_COMPARABLE_MEDIA_MODEL",
    models: ranked.slice(0, 3).map((x) => x.model),
    threshold: null,
    outputKind: kind,
    comparison: comparisonRequest(kind, task.media),
    estimates: Object.fromEntries(
      ranked.slice(0, 3).map((x) => [x.model.id, x.estimate]),
    ),
    evidenceKind: "capability-price",
    evidenceNote:
      "지원 조건과 공개 가격을 비교한 후보예요. 실제 생성 품질·성공률을 검증한 순위가 아니에요. 토큰 과금 등 동일 조건 비용을 계산하지 못한 모델은 목록에만 표시해요.",
  };
}
