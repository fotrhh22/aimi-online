import type { ImageRate, ModelRecord } from "@aimi/contracts";
export const dollar = (value: number) =>
  "$" + value.toLocaleString("en-US", { maximumFractionDigits: 6 });
export function compactNumbers(values: number[] = [], suffix = "") {
  const list = [...new Set(values)]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!list.length) return "정보 없음";
  const parts: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const start = list[i];
    let end = start;
    while (Number.isInteger(end) && list[i + 1] === end + 1) end = list[++i];
    parts.push(start === end ? String(start) : `${start}~${end}`);
  }
  return parts.join(" · ") + suffix;
}
export function sourceName(url?: string, fallback = "제공사 공개 자료") {
  if (!url) return fallback;
  try {
    const host = new URL(url).hostname;
    if (host.endsWith("openrouter.ai")) return "OpenRouter";
    if (host.endsWith("artificialanalysis.ai")) return "Artificial Analysis";
    return host.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}
export function mediaIntroduction(model: ModelRecord) {
  const m = model.media!;
  const inputs = model.inputModalities ?? model.capabilities;
  if (m.operation === "upscale")
    return "이미지나 영상의 해상도를 높이는 모델이에요.";
  if (m.operation === "edit")
    return `기존 ${m.kind === "video" ? "영상" : "이미지"}를 바탕으로 원하는 부분을 수정하는 모델이에요.`;
  const how =
    inputs.includes("text") && inputs.includes("image")
      ? "글로 장면을 설명하거나 참고 이미지를 넣어"
      : inputs.includes("image")
        ? "참고 이미지를 바탕으로"
        : "원하는 장면을 글로 설명해";
  return `${how} ${m.kind === "video" ? "영상을" : "이미지를"} 만드는 모델이에요.`;
}
export function imageRateCopy(rate: ImageRate) {
  const title =
    (
      {
        output_image: "이미지 생성",
        input_image: "입력 이미지",
        input_text: "입력 글",
        input_reference: "참고 이미지",
        input_font: "참고 글꼴",
      } as Record<string, string>
    )[rate.billable] ?? "추가 옵션";
  const variant = rate.variant ? imageVariant(rate.variant) : "";
  const amount =
    rate.unit === "token" ? rate.cost_usd * 1_000_000 : rate.cost_usd;
  const unit = (
    {
      token: "100만 토큰당",
      image: "1장당",
      request: "1회당",
      megapixel: "100만 화소당",
    } as Record<string, string>
  )[rate.unit];
  return {
    label: [title, variant].filter(Boolean).join(" · "),
    value: `${dollar(amount)} · ${unit ?? "과금 단위 확인 필요"}`,
  };
}
function imageVariant(value: string) {
  const known: Record<string, string> = {
    high_thinking_surcharge: "추가 추론 요금",
    high_resolution: "고해상도",
    style_references: "스타일 참고",
    moodboards: "분위기 참고",
    low: "낮은 품질",
    medium: "보통 품질",
    high: "높은 품질",
  };
  if (known[value]) return known[value];
  const match = value.match(/^(low|medium|high)_([\d.]+k)$/i);
  if (match)
    return `${({ low: "낮은", medium: "보통", high: "높은" } as Record<string, string>)[match[1]]} 품질 · ${match[2].toUpperCase()}`;
  if (/^[\d.]+k$/i.test(value)) return value.toUpperCase();
  if (/^\d+$/.test(value)) return value + "px";
  return "별도 제작 설정";
}
export function videoRateCopy(key: string, raw: string) {
  const price = Number(raw);
  if (!Number.isFinite(price) || price < 0) return null;
  const resolution = key
    .match(/(?:^|_)(\d+(?:p|k))(?=_|$)/i)?.[1]
    .replace(/k$/i, "K");
  if (key === "cents_per_image_input")
    return { label: "참고 이미지", value: `${dollar(price / 100)} · 1장당` };
  if (key === "minimum_cents_per_generation")
    return { label: "최소 제작비", value: `${dollar(price / 100)} · 1회당` };
  if (key.includes("video_tokens"))
    return {
      label: [
        "영상 토큰 요금",
        resolution,
        key.includes("with_video_input")
          ? "참고 영상 입력"
          : key.includes("without_audio")
            ? "소리 미포함"
            : "",
      ]
        .filter(Boolean)
        .join(" · "),
      value: `${dollar(price)} · 토큰 과금 단위 확인 필요`,
    };
  if (key.includes("reference_duration_seconds"))
    return {
      label: ["참고 자료 사용 요금", resolution].filter(Boolean).join(" · "),
      value: `${dollar(price)} · 적용 시간 단위 확인 필요`,
    };
  if (["reference_input_images", "reference_images"].includes(key))
    return {
      label: "참고 이미지 요금",
      value: `${dollar(price)} · 과금 단위 확인 필요`,
    };
  if (key.startsWith("cents_per_megapixel_second"))
    return {
      label: key.endsWith("precise")
        ? "정밀 모드"
        : key.endsWith("creative")
          ? "창의 모드"
          : "영상 크기별 요금",
      value: `${dollar(price / 100)} · 100만 화소·1초당`,
    };
  const prefix = key.includes("continuation")
    ? "영상 이어 만들기"
    : key.startsWith("image_to_video")
      ? "이미지로 영상 만들기"
      : key.startsWith("text_to_video")
        ? "글로 영상 만들기"
        : key.startsWith("long_duration")
          ? "긴 영상 제작"
          : key.includes("with_audio")
            ? "소리 포함 영상"
            : key.includes("without_audio")
              ? "소리 미포함 영상"
              : "영상 제작";
  const perSecond = /duration_seconds|per_second|per_video_output_second/.test(
    key,
  );
  return {
    label: [prefix, resolution].filter(Boolean).join(" · "),
    value: `${dollar(key.startsWith("cents_") ? price / 100 : price)} · ${perSecond ? "1초당" : "과금 단위 확인 필요"}`,
  };
}
export function parameterCopy(
  key: string,
  p: { values?: (string | number)[]; min?: number; max?: number },
) {
  const titles: Record<string, string> = {
    aspect_ratio: "화면 비율",
    output_format: "저장 파일 형식",
    quality: "이미지 품질",
    background: "배경",
    n: "한 번에 만드는 수",
    input_references: "참고 이미지 수",
    output_compression: "이미지 압축 정도",
    resolution: "해상도",
    size: "이미지 크기",
  };
  if (!titles[key]) return null;
  const names: Record<string, string> = {
    auto: "자동",
    low: "낮음",
    medium: "보통",
    high: "높음",
    xhigh: "매우 높음",
    max: "최대",
    transparent: "투명",
    opaque: "불투명",
  };
  const value = p.values?.length
    ? p.values
        .map(
          (v) =>
            names[String(v)] ??
            String(v)
              .replace(/^(\d+)x(\d+)$/, "$1 × $2")
              .replace(/k$/i, "K"),
        )
        .join(" · ")
    : p.min !== undefined && p.max !== undefined
      ? p.min === p.max
        ? String(p.min)
        : `${p.min}~${p.max}`
      : p.min !== undefined
        ? `${p.min} 이상`
        : p.max !== undefined
          ? `${p.max} 이하`
          : "정보 없음";
  return {
    label: titles[key],
    value: value + (key === "input_references" || key === "n" ? "장" : ""),
  };
}
