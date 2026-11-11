import React, { useState, useEffect, useRef } from "react";
import { AppProvider, useApp } from "./context";
import { browserRuntime } from "../lib/runtime";
import { TossProvider } from "../ui/toss-provider";
import { Button, Asset, BrandLogo, Icon, Modal } from "../ui/primitives";
import { TestControls } from "../features/demo/test-controls";
import { testDemoEnabled, isDemoSession, startTestDemo } from "../lib/demo";
import { login } from "../lib/toss/bridge";
import { Home, Mission } from "../features/home/screens";
import { Garden, Shop, Social, Account } from "../features/garden/screens";
import { ChallengeRewardPopup } from "../features/challenge/reward-popup";
import { Challenge } from "../features/challenge/screens";
import {
  Optimizer,
  Recommendations,
  ModelDetails,
} from "../features/optimizer/screens";
import { GameResult } from "../games/shared/GameResult";
import { GameScreen } from "../games/shared/GameScreen";
const titles: Record<string, string> = {
  "/": "AIMI",
  "/mission": "오늘의 미션",
  "/optimizer": "내 질문 다듬기",
  "/recommendations": "AI 모델 추천",
  "/garden": "나의 정원",
  "/garden/edit": "정원 편집",
  "/shop/garden": "정원 상점",
  "/shop/characters": "캐릭터 상점",
  "/social": "소셜",
  "/account": "계정 관리",
  "/challenge": "키워드 고르기",
  "/challenge/combination": "조합 확인",
};
function Screens() {
  const visitedAI = useRef({ optimizer: false, recommendations: false });
  const a = useApp(),
    [devName, setDevName] = useState("player"),
    [noticeOpen, setNoticeOpen] = useState(false);
  useEffect(() => {
    if (a.authenticated && sessionStorage.getItem("aimi.pending-invite"))
      a.navigate("/social");
  }, [a.authenticated]);
  if (a.loading)
    return (
      <main className="loading-screen">
        <Asset id="seed" size={120} />
        <h1>
          <BrandLogo />
        </h1>
        <p>오늘의 작은 도전을 준비해요</p>
        <progress aria-label="불러오는 중" />
        <small>잠시만 기다려주세요</small>
      </main>
    );
  if (!a.authenticated)
    return (
      <main className="login-screen">
        <Asset id="seed" size={120} />
        <h1>
          <BrandLogo />
        </h1>
        <p>오늘의 작은 도전과 나만의 정원</p>
        {a.localRuntime && (
          <label>
            개발용 사용자
            <input
              aria-label="개발용 사용자"
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
            />
          </label>
        )}
        {testDemoEnabled && (
          <>
            <Button
              loading={a.busy}
              onClick={() =>
                void a.perform(
                  async () => {
                    await startTestDemo();
                    a.setAuthenticated(true);
                  },
                  undefined,
                  "all",
                )
              }
            >
              테스트로 시작하기
            </Button>
            <p className="caption">
              로그인 없이 테스트 계정으로 체험해요. 기록은 다른 테스트 접속자와
              공유해요.
            </p>
          </>
        )}
        {!a.webDemoRuntime && (
          <Button
            weak={testDemoEnabled}
            loading={a.busy}
            onClick={() =>
              void a.perform(
                async () => {
                  await login(devName);
                  a.setAuthenticated(true);
                },
                undefined,
                "all",
              )
            }
          >
            {a.localRuntime ? "개발용으로 시작하기" : "토스로 시작하기"}
          </Button>
        )}
        {a.error && <p role="alert">{a.error}</p>}
        {a.toast && <p role="alert">{a.toast}</p>}
      </main>
    );
  if (!a.data || !a.content)
    return (
      <main className="login-screen">
        <h1>다시 연결해주세요</h1>
        <p role="alert">{a.error}</p>
        <Button onClick={() => void a.refresh()}>다시 시도하기</Button>
      </main>
    );
  const aiTransit =
    ["/optimizer", "/recommendations", "/account"].includes(a.path) ||
    a.path.startsWith("/models/");
  if (!aiTransit)
    visitedAI.current = { optimizer: false, recommendations: false };
  if (a.path === "/optimizer") visitedAI.current.optimizer = true;
  if (a.path === "/recommendations") visitedAI.current.recommendations = true;
  const game = a.path.startsWith("/game"),
    nav = ["/", "/mission", "/garden", "/social"].includes(a.path),
    shop = a.path.startsWith("/shop"),
    hasBalance = a.path === "/" || a.path === "/garden" || shop;
  let body: React.ReactNode;
  if (a.path.startsWith("/results/game/")) body = <GameResult />;
  else if (game) body = <GameScreen />;
  else if (a.path === "/") body = <Home />;
  else if (a.path === "/mission") body = <Mission />;
  else if (a.path.startsWith("/challenge")) body = <Challenge />;
  else if (a.path.startsWith("/garden")) body = <Garden />;
  else if (shop) body = <Shop />;
  else if (a.path === "/social" || a.path.startsWith("/friends/"))
    body = <Social />;
  else if (["/optimizer", "/recommendations"].includes(a.path)) body = null;
  else if (a.path.startsWith("/models/"))
    body = <ModelDetails key={"models-" + a.aiEpoch} />;
  else if (a.path === "/account") body = <Account />;
  else
    body = (
      <>
        <p>화면을 찾지 못했어요.</p>
        <Button onClick={() => a.navigate("/")}>홈으로</Button>
      </>
    );
  const screenHeader = (
    <header
      className={"screen-head" + (a.path === "/" ? " home-screen-head" : "")}
    >
      <h1>
        {a.path === "/" ? (
          <BrandLogo />
        ) : a.path.startsWith("/challenge/answer/") ? (
          "챌린지 해설"
        ) : (a.path.startsWith("/challenge") &&
            (a.data.daily.success || a.data.daily.challengeClosed)) ||
          a.path.startsWith("/challenge/result/") ? (
          "챌린지 결과"
        ) : a.path.startsWith("/results/game/") ? (
          "게임 결과"
        ) : a.path.startsWith("/models/") ? (
          "모델 상세"
        ) : a.path.startsWith("/friends/") ? (
          "친구 정원"
        ) : (
          (titles[a.path] ?? "AIMI")
        )}
      </h1>
      {a.path === "/" && (
        <button
          className="home-notice-button"
          aria-label="공지"
          onClick={() => setNoticeOpen(true)}
        >
          공지
        </button>
      )}
      {hasBalance && (
        <span className="balance">
          {a.data.balance} <small>EP</small>
        </span>
      )}
    </header>
  );
  return (
    <div className={"app-shell " + (game ? "game-shell" : "")}>
      {a.browserRuntime && (
        <div className="dev-platform">
          {a.path !== "/" ? (
            <button aria-label="뒤로가기" onClick={a.back}>
              <Icon name="back" />
            </button>
          ) : (
            <span />
          )}
          <button onClick={() => a.navigate("/account")} aria-label="계정 관리">
            ···
          </button>
        </div>
      )}
      {noticeOpen && a.path === "/" && (
        <Modal title="업데이트 예정 안내" onClose={() => setNoticeOpen(false)}>
          <p>
            AI 사용 기록을 돌아볼 수 있는 ‘AI 사용 영수증’ 기능을 준비하고
            있어요.
          </p>
          <p className="caption">제공 범위와 일정은 추후 안내할게요.</p>
          <div className="dialog-actions">
            <Button onClick={() => setNoticeOpen(false)}>확인</Button>
          </div>
        </Modal>
      )}
      <main
        hidden={["/optimizer", "/recommendations"].includes(a.path)}
        data-screen={a.path.split("?")[0]}
        className={game ? "game-main" : "page " + (nav ? "with-tabs" : "")}
      >
        {!game && screenHeader}
        {isDemoSession() && (a.path === "/" || a.path === "/account") && (
          <TestControls />
        )}
        {body}
      </main>
      {visitedAI.current.optimizer && (
        <main
          hidden={a.path !== "/optimizer"}
          data-screen="/optimizer"
          className="page"
        >
          {screenHeader}
          <Optimizer key={"optimizer-" + a.aiEpoch} />
        </main>
      )}
      {visitedAI.current.recommendations && (
        <main
          hidden={a.path !== "/recommendations"}
          data-screen="/recommendations"
          className="page"
        >
          {screenHeader}
          <Recommendations key={"recommendations-" + a.aiEpoch} />
        </main>
      )}
      {nav && (
        <nav className="bottom-nav" aria-label="하단 메뉴">
          {[
            ["/", "home", "홈"],
            ["/mission", "mission", "미션"],
            ["/garden", "garden", "정원"],
            ["/social", "social", "소셜"],
          ].map(([url, icon, title]) => (
            <button
              key={url}
              aria-current={url === a.path ? "page" : undefined}
              onClick={() => a.navigate(url)}
            >
              <span>
                <Icon name={icon} />
              </span>
              <small>{title}</small>
            </button>
          ))}
        </nav>
      )}
      {a.localRuntime && (
        <span className="development-marker">개발용 예시 · 실제 보상 아님</span>
      )}
      <ChallengeRewardPopup />
      {a.toast && (
        <div
          className={
            "toast" +
            (/^\d+ EP를 획득했어요/.test(a.toast) ? " toast-reward" : "")
          }
          role="status"
        >
          {a.toast}
        </div>
      )}
    </div>
  );
}
export function App() {
  // Toss builds keep the official TDS provider; the web demo renders without it
  // because @toss/tds-mobile throws on non-Toss hosts and blanks the screen.
  const content = (
    <AppProvider>
      <Screens />
    </AppProvider>
  );
  return browserRuntime ? content : <TossProvider>{content}</TossProvider>;
}
