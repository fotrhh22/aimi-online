import { localRuntime, webDemoRuntime } from "../runtime";
import { createSessionRecovery } from "./session-recovery";
export { localRuntime, browserRuntime, webDemoRuntime } from "../runtime";
const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
const remoteBase = "https://aimi-online-api.onrender.com";
// Local .env.local settings must never route an installed miniapp to loopback.
const productionBase = (() => {
  if (!configured) return remoteBase;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
      ? configured
      : remoteBase;
  } catch {
    return remoteBase;
  }
})();
const base = webDemoRuntime
  ? "/api"
  : import.meta.env.PROD
    ? productionBase
    : configured || (localRuntime ? "/api" : remoteBase);
const inviteCode = new URLSearchParams(location.search).get("invite");
if (inviteCode && /^[A-F0-9]{8}$/.test(inviteCode))
  sessionStorage.setItem("aimi.pending-invite", inviteCode);
export class RequestError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
const keys = new Map<string, string>();
export function token() {
  return localStorage.getItem(
    webDemoRuntime ? "aimi.web-demo.session" : "aimi.session",
  );
}
export function setToken(value: string | null, renewal = false) {
  if (value !== token()) {
    if (!renewal && !webDemoRuntime)
      localStorage.removeItem("aimi.session.kind");
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith("aimi.") && key !== "aimi.pending-invite")
        sessionStorage.removeItem(key);
    if (!renewal) keys.clear();
  }
  if (value)
    localStorage.setItem(
      webDemoRuntime ? "aimi.web-demo.session" : "aimi.session",
      value,
    );
  else
    localStorage.removeItem(
      webDemoRuntime ? "aimi.web-demo.session" : "aimi.session",
    );
}
export function setAnonymousToken(value: string, renewal = false) {
  setToken(value, renewal);
  localStorage.setItem("aimi.session.kind", "anonymous");
}
let recoverTossSession: (() => Promise<string>) | undefined;
export function configureSessionRecovery(handler: () => Promise<string>) {
  recoverTossSession = handler;
}
const recovery = createSessionRecovery({
  read: token,
  write: (value) => setAnonymousToken(value, true),
  authenticate: async () => (recoverTossSession ? recoverTossSession() : null),
});
export const isCurrentSession = recovery.current;
const pendingReads = new Map<string, Promise<unknown>>();
export function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (method !== "GET") return performRequest<T>(path, method, body);
  const key = JSON.stringify([token(), path]);
  const existing = pendingReads.get(key);
  if (existing) return existing as Promise<T>;
  const task = performRequest<T>(path, method, body);
  pendingReads.set(key, task);
  void task
    .finally(() => {
      if (pendingReads.get(key) === task) pendingReads.delete(key);
    })
    .catch(() => {});
  return task;
}
async function performRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const signature = method + path + JSON.stringify(body),
    mutation = method !== "GET",
    idempotent = mutation && !path.startsWith("/auth/");
  if (idempotent && !keys.has(signature))
    keys.set(signature, crypto.randomUUID());
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 35000);
  if (mutation) window.dispatchEvent(new Event("aimi-write-start"));
  try {
    let sentToken = token();
    const idempotencyKey = keys.get(signature);
    const releaseKey = () => {
      if (keys.get(signature) === idempotencyKey) keys.delete(signature);
    };
    const send = () =>
      fetch(base + demoPath, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(sentToken ? { Authorization: "Bearer " + sentToken } : {}),
          ...(idempotent ? { "Idempotency-Key": idempotencyKey! } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    const demoPath = webDemoRuntime
      ? path.startsWith("/demo/")
        ? path.replace(/^\/demo\//, "/web-demo/")
        : path.startsWith("/web-demo/")
          ? path
          : "/web-demo" + path
      : import.meta.env.VITE_TEST_DEMO === "true" &&
          sentToken?.startsWith("demo.") &&
          !path.startsWith("/demo/")
        ? "/demo" + path
        : path;
    let response = await send();
    if (
      response.status === 401 &&
      !path.startsWith("/auth/") &&
      !localRuntime &&
      !webDemoRuntime &&
      localStorage.getItem("aimi.session.kind") === "anonymous" &&
      sentToken &&
      /^[a-f0-9]{64}$/.test(sentToken)
    ) {
      try {
        const renewed = await recovery.recover(sentToken);
        if (renewed && !controller.signal.aborted) {
          sentToken = renewed;
          response = await send(); // Only once; never replay network/5xx errors.
        }
      } catch (error) {
        if (token() === sentToken) {
          setToken(null);
          window.dispatchEvent(new Event("aimi-session-expired"));
        }
        throw error;
      }
    }
    const data = await response.json();
    if (sentToken && token() !== sentToken && !isCurrentSession(sentToken)) {
      releaseKey();
      throw new RequestError("SESSION_CHANGED", 409);
    }
    if (!response.ok) {
      if (response.status === 401 && sentToken && token() === sentToken) {
        setToken(null);
        window.dispatchEvent(new Event("aimi-session-expired"));
      }
      if (response.status < 500) releaseKey();
      throw new RequestError(
        data.error?.code ?? "REQUEST_FAILED",
        response.status,
      );
    }
    releaseKey();
    return data.data as T;
  } catch (e) {
    if (e instanceof RequestError) throw e;
    throw new RequestError("NETWORK_ERROR", 0);
  } finally {
    if (mutation) window.dispatchEvent(new Event("aimi-write-end"));
    clearTimeout(timer);
  }
}
const messages: Record<string, string> = {
  SESSION_CHANGED: "사용자 연결이 바뀌었어요. 현재 화면에서 다시 확인해주세요.",
  TOSS_AUTH_NOT_CONFIGURED:
    "사용자 연결을 준비하고 있어요. 잠시 후 다시 시도해주세요.",
  TOSS_AUTH_CODE_INVALID: "연결 시간이 지났어요. 다시 시작해주세요.",
  TOSS_AUTH_RATE_LIMITED: "연결 요청이 많아요. 잠시 후 다시 시도해주세요.",
  TOSS_AUTH_UNAVAILABLE: "토스 연결이 지연돼요. 잠시 후 다시 시도해주세요.",
  TOSS_AUTH_FAILED: "사용자를 확인하지 못했어요. 다시 시작해주세요.",
  TOSS_AUTH_UNSUPPORTED:
    "토스 앱을 최신 버전으로 업데이트한 뒤 다시 시작해주세요.",
  INVALID_ACCESS_CODE: "접속 코드를 다시 확인해주세요.",
  ACCESS_CODE_NOT_FOUND:
    "등록된 접속 코드가 아니에요. 발급받은 코드를 확인해주세요.",
  DEMO_AI_HOURLY_LIMIT:
    "Gemini는 전체 테스트 계정에서 시간당 20회까지 사용할 수 있어요. 잠시 후 다시 이용해주세요.",
  DEMO_AI_EXPIRED:
    "48시간의 AI 테스트 이용 기간이 끝났어요. 다른 기능은 계속 이용할 수 있어요.",
  DEMO_RESET_BUSY: "방금 초기화했어요. 잠시 후 다시 눌러주세요.",
  DEMO_RESET_REQUIRED: "테스트 계정은 탈퇴 대신 테스트 초기화를 이용해주세요.",
  DEMO_UPSTREAM_UNAVAILABLE:
    "서버 연결이 지연되고 있어요. 잠시 후 다시 시도해주세요.",
  NETWORK_ERROR: "연결을 확인한 뒤 다시 시도해주세요.",
  UNAUTHENTICATED: "다시 로그인해주세요.",
  GAME_DAILY_LIMIT: "오늘 게임은 모두 마쳤어요.",
  GAME_CHALLENGE_STARTED: "챌린지를 시작한 뒤에는 게임을 할 수 없어요.",
  GAME_CHALLENGE_FINISHED: "오늘 챌린지가 끝났어요. 내일 새 게임으로 만나요.",
  CHALLENGE_DAILY_LIMIT: "오늘의 챌린지를 모두 마쳤어요.",
  GAME_REQUIRED: "게임을 먼저 플레이해주세요.",
  INSUFFICIENT_EP: "EP를 더 모으면 구매할 수 있어요.",
  ALREADY_OWNED: "이미 보유하고 있어요.",
  INSUFFICIENT_BUDGET: "예산 안에서 키워드와 모델을 골라주세요.",
  GARDEN_OUT_OF_BOUNDS: "아이템을 정원 안에 배치해주세요.",
  DUPLICATE_GARDEN_ITEM: "같은 아이템은 한 번만 배치할 수 있어요.",
  GARDEN_ITEM_LIMIT: "정원에는 최대 12개까지 배치할 수 있어요.",
  GARDEN_REVISION_CONFLICT: "다른 화면에서 정원을 바꿨어요. 다시 불러와주세요.",
  RESULT_VARIANT_UNAVAILABLE:
    "이 조합의 예시 이미지를 아직 준비하지 못했어요. 횟수와 예산은 그대로예요.",
  AI_DAILY_LIMIT: "오늘 이용 가능한 횟수를 모두 사용했어요.",
  AI_OUTPUT_MISMATCH:
    "선택한 출력 형태와 요청이 달라요. 텍스트·이미지·영상 선택을 확인해주세요.",
  AI_INVALID_TIP:
    "작성 팁을 처리하지 못했어요. 이용 횟수는 차감하지 않아요. 다시 시도해주세요.",
  AI_BUSY: "이전 요청을 처리하고 있어요.",
  AI_NOT_CONFIGURED: "AI 연결을 준비하고 있어요.",
  AI_NOT_A_PROMPT: "요청문 형식으로 다듬지 못했어요. 횟수는 차감되지 않아요.",
  AI_INTENT_CHANGED: "원문의 조건을 유지하지 못했어요. 다시 시도해주세요.",
  AI_UNDISCLOSED_ASSUMPTIONS:
    "추가 조건을 확인하지 못했어요. 다시 시도해주세요.",
  AI_TIMEOUT: "응답을 확인하지 못했어요. 잠시 후 다시 시도해주세요.",
  AI_QUOTA_EXCEEDED: "AI 사용량이 많아요. 잠시 후 다시 시도해주세요.",
  GARDEN_PRIVATE: "지금은 이 정원을 방문할 수 없어요.",
  HINT_REQUIRES_ATTEMPT_BUDGET:
    "힌트를 본 뒤에도 한 번 시도할 예산 30이 필요해요. 예산이 45 이상일 때 힌트를 볼 수 있어요.",
  CHALLENGE_CLOSED: "오늘 챌린지는 종료됐어요. 결과를 확인해주세요.",
  CONTENT_VERSION_CHANGED:
    "문제가 바뀌었어요. 화면을 새로고침한 뒤 다시 선택해주세요.",
  MISSION_DATE_CHANGED: "새 미션이 열렸어요. 오늘의 미션을 다시 확인해주세요.",
  FRIEND_NOT_FOUND: "친구 코드를 다시 확인해주세요.",
  CHALLENGE_ALREADY_SUCCEEDED: "오늘 챌린지는 이미 성공했어요.",
  PLAY_EXPIRED: "이 플레이의 복구 시간이 지났어요.",
  REQUEST_NOT_FOUND: "친구 요청을 다시 확인해주세요.",
};
export function errorText(e: unknown) {
  return e instanceof RequestError
    ? (messages[e.code] ?? "처리하지 못했어요. 다시 시도해주세요.")
    : "다시 시도해주세요.";
}
