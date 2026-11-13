import { z } from "zod";
import {
  OutputKind,
  MediaRequest,
  type AIResult,
  type TaskProfile,
} from "@aimi/contracts";
import { ApiError } from "../../db.js";
import { OPTIMIZER_SYSTEM_PROMPT, taskAnalysisPrompt } from "./prompts.js";
export const TaskSchema = z
  .object({
    outputKind: OutputKind,
    requiredInputModalities: z
      .array(z.enum(["text", "image", "video", "audio", "file"]))
      .max(5),
    media: MediaRequest.optional(),
    taskSummary: z.string().min(1).max(300).optional(),
    taskType: z.enum(["general", "coding"]),
    requiredCapabilities: z
      .array(
        z.enum(["text", "image", "video", "audio", "file", "json", "tools"]),
      )
      .max(7),
    suggestedTier: z.enum(["Small", "Medium", "High"]),
    reason: z.string().max(500),
    unknowns: z.array(z.string().max(300)).max(8),
  })
  .strict();
const ResultSchema = z
  .object({
    improvedText: z.string().min(2).max(6000),
    extendedExample: z.string().min(2).max(7000),
    addedAssumptions: z.array(z.string().max(300)).max(10),
    changes: z.array(z.string().max(400)).max(10),
    tips: z
      .array(
        z
          .object({
            quote: z.string().min(1).max(300),
            tip: z.string().max(400),
          })
          .strict(),
      )
      .max(8),
    taskProfile: TaskSchema,
  })
  .strict();
function isRequest(text: string) {
  const value = text.trim();
  return (
    /(?:해\s?줘(?:요)?|해\s?주세요|(?:작성|설명|정리|비교|분석|제시|출력|생성|번역|요약|추천|검토)(?:하라|하시오|하세요|해라)|부탁드립니다|요청합니다|알려\s?줘(?:요)?|알려\s?주세요|부탁해(?:요)?|할까요|인가요)\s*[.?!。！？]*$/u.test(
      value,
    ) ||
    /^(?:please\s+)?(?:write|explain|summari[sz]e|translate|list|provide|compare|analy[sz]e|create|suggest|recommend|describe|help|how|what|why|can you|could you|tell me|give me|generate|review|improve|debug|classify|extract|design|implement|calculate|act as|you are)\b/i.test(
      value,
    )
  );
}
export function validatePromptRewrite(
  original: string,
  result: Pick<
    AIResult,
    "improvedText" | "extendedExample" | "addedAssumptions"
  >,
) {
  if (!isRequest(result.improvedText) || !isRequest(result.extendedExample))
    throw new ApiError("AI_NOT_A_PROMPT", 503);
  const quantities = (text: string): string[] => {
    const counts: Record<string, string> = {
      한: "1",
      두: "2",
      세: "3",
      네: "4",
      다섯: "5",
      여섯: "6",
      일곱: "7",
      여덟: "8",
      아홉: "9",
      열: "10",
    };
    const canonical = text.replace(
      /(^|[^가-힣])(다섯|여섯|일곱|여덟|아홉|한|두|세|네|열)\s*(?=가지|개|명|회|일|개월|년|시간|분|초|장|번)/g,
      (_m, prefix, count) => prefix + counts[count],
    );
    return canonical.match(/\d+(?:\.\d+)?/g) ?? [];
  };
  const numbers = quantities(original),
    improvedNumbers = quantities(result.improvedText),
    extendedNumbers = quantities(result.extendedExample);
  if (
    numbers.some(
      (n) => !improvedNumbers.includes(n) || !extendedNumbers.includes(n),
    ) ||
    improvedNumbers.some((n) => !numbers.includes(n))
  )
    throw new ApiError("AI_INTENT_CHANGED", 503);
  if (result.improvedText.length > Math.max(100, original.trim().length * 2))
    throw new ApiError("AI_INTENT_CHANGED", 503);
  if (
    result.extendedExample !== result.improvedText &&
    !result.addedAssumptions.length
  )
    throw new ApiError("AI_UNDISCLOSED_ASSUMPTIONS", 503);
}
export class Gemini {
  constructor(private development: boolean) {}
  private useFixture() {
    return (
      this.development &&
      (process.env.AIMI_AI_MODE === "fixture" ||
        !process.env.AIMI_GEMINI_API_KEY)
    );
  }
  async analyze(
    text: string,
    selectedOutput?: TaskProfile["outputKind"],
  ): Promise<{ task: TaskProfile; source: AIResult["source"] }> {
    if (this.useFixture())
      return {
        task: {
          ...fixture(text).taskProfile,
          ...(selectedOutput ? { outputKind: selectedOutput } : {}),
        },
        source: "development-fixture",
      };
    const { outputMismatch, ...task } = await this.generate(
      text,
      taskAnalysisPrompt(selectedOutput),
      TaskSchema.extend({ outputMismatch: z.boolean().default(false) }),
      1000,
    );
    if (
      selectedOutput &&
      (outputMismatch || task.outputKind !== selectedOutput)
    )
      throw new ApiError("AI_OUTPUT_MISMATCH", 422);
    task.requiredCapabilities = [
      ...new Set([
        ...task.requiredInputModalities,
        ...task.requiredCapabilities.filter(
          (c) => c === "json" || c === "tools",
        ),
      ]),
    ];
    return { task, source: "gemini" };
  }
  async optimize(text: string): Promise<AIResult> {
    if (this.useFixture()) return fixture(text);
    const result = await this.generate(
      text,
      OPTIMIZER_SYSTEM_PROMPT,
      ResultSchema,
      Math.min(Number(process.env.LLM_MAX_OUTPUT_TOKENS) || 3000, 5000),
    );
    result.taskProfile.requiredCapabilities = [
      ...new Set([
        ...(result.taskProfile.requiredInputModalities ?? []),
        ...result.taskProfile.requiredCapabilities.filter(
          (c) => c === "json" || c === "tools",
        ),
      ]),
    ];
    // Tips are optional annotations: a bad quote must not discard a valid rewrite.
    result.tips = result.tips
      .filter(
        (t) =>
          result.improvedText.includes(t.quote) ||
          result.extendedExample.includes(t.quote),
      )
      .slice(0, 3);
    validatePromptRewrite(text, result);
    return { ...result, source: "gemini" };
  }
  private async generate<T>(
    text: string,
    system: string,
    schema: z.ZodType<T>,
    maxOutputTokens: number,
  ): Promise<T> {
    const key = process.env.AIMI_GEMINI_API_KEY;
    if (!key) throw new ApiError("AI_NOT_CONFIGURED", 503);
    const timeout = Math.min(
      60000,
      Math.max(1000, Number(process.env.LLM_REQUEST_TIMEOUT_MS) || 25000),
    );
    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
          encodeURIComponent(
            process.env.GEMINI_TEXT_MODEL || "gemini-3.1-flash-lite",
          ) +
          ":generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          signal: AbortSignal.timeout(timeout),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [
              {
                role: "user",
                parts: [{ text: JSON.stringify({ userText: text }) }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens,
              responseMimeType: "application/json",
              responseJsonSchema: z.toJSONSchema(schema),
            },
          }),
        },
      );
    } catch {
      throw new ApiError("AI_TIMEOUT", 503);
    }
    if (!response.ok)
      throw new ApiError(
        response.status === 429 ? "AI_QUOTA_EXCEEDED" : "AI_PROVIDER_ERROR",
        503,
      );
    try {
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return schema.parse(
        JSON.parse(
          data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? "")
            .join("") ?? "",
        ),
      );
    } catch {
      throw new ApiError("AI_INVALID_OUTPUT", 503);
    }
  }
}
function fixture(text: string): AIResult {
  const coding = /코드|함수|디버|버그|프로그램|코딩/.test(text),
    complex = /복잡|설계|다단계|증명/.test(text);
  const planning = /대본|기획|프롬프트|설명|분석|스토리보드/.test(text);
  const outputKind =
    !planning && /영상|동영상|비디오/.test(text)
      ? "video"
      : !planning && /이미지|사진|그림/.test(text)
        ? "image"
        : !planning && /나레이션|읽어줘|음성 생성/.test(text)
          ? "speech"
          : "text";
  const taskProfile: TaskProfile = {
    outputKind,
    requiredInputModalities: ["text"],
    taskSummary: text.slice(0, 150),
    taskType: coding ? "coding" : "general",
    requiredCapabilities: ["text", ...(/JSON|json/.test(text) ? ["json"] : [])],
    suggestedTier: complex
      ? "High"
      : coding || /비교|분석/.test(text)
        ? "Medium"
        : "Small",
    reason: "개발 샘플의 규칙 기반 업무 분류예요. 실제 Gemini 분석이 아니에요.",
    unknowns: [],
  };
  return {
    improvedText: text.trim(),
    extendedExample: text.trim() + "\n답변의 핵심 내용을 항목별로 정리해줘.",
    addedAssumptions: ["답변을 항목별로 정리하는 형식을 추가했어요."],
    changes: ["개발 샘플에서는 원문을 그대로 보존해요."],
    tips: [{ quote: "항목별로", tip: "원하는 답변 형식을 명시할 수 있어요." }],
    taskProfile,
    source: "development-fixture",
  };
}
