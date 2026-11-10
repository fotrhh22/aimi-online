import { ECONOMY_POLICY } from "@aimi/contracts";
import React, { useState } from "react";
import { useApp } from "../../app/context";
import {
  Asset,
  Button,
  Modal,
  Notice,
  Stats,
  ChallengeArt,
} from "../../ui/primitives";
import { request } from "../../lib/api/client";
export const GAME_LABELS = {
  crossing: "길 건너기",
  dino: "Dino",
  runner: "Temple Run",
};
export function Home() {
  const a = useApp(),
    s = a.data!,
    [modal, setModal] = useState<"attendance" | "tip" | null>(null),
    [awarded, setAwarded] = useState(0);
  const reward = async (type: "attendance" | "tip") => {
    const r = await a.perform(() =>
      request<{ awarded: number }>(
        a.localRuntime
          ? "/v1/dev/rewards/" + type
          : "/daily-rewards/" + type + "/claim",
        "POST",
        {},
      ),
    );
    if (r) {
      setAwarded(r.awarded);
      setModal(type);
    }
  };
  return (
    <>
      <h2 className="greeting">{s.name}, 오늘도 한 판 어때요?</h2>
      <button className="today-card" onClick={() => a.navigate("/mission")}>
        <small>오늘 · {GAME_LABELS[s.daily.gameKind]}</small>
        <strong>게임으로 예산 모으기</strong>
        <span>남은 게임 {5 - s.daily.playsUsed}회</span>
        <span>최고 점수 {s.daily.best}점</span>
        <Asset id={s.character} size={50} />
      </button>
      <div className="reward-grid">
        <button onClick={() => void reward("attendance")}>
          <strong>
            {s.claims.includes("attendance") ? "출석 완료" : "출석하기"}
          </strong>
          <small>오늘 보상</small>
        </button>
        <button
          onClick={() => {
            setAwarded(0);
            setModal("tip");
          }}
        >
          <strong>오늘의 팁</strong>
          <small>누르고 보상받기</small>
        </button>
      </div>
      <div className="entry-list">
        {[
          ["/optimizer", "프롬프트 개선기", "내 질문 다듬기 · 예시와 팁"],
          ["/recommendations", "AI 모델 추천", "Small / Medium / High 비교"],
          ["/garden", "나의 정원", "캐릭터 선택 · 상점 · 친구 방문"],
        ].map(([url, title, desc]) => (
          <button key={url} onClick={() => a.navigate(url)}>
            <span>
              <strong>{title}</strong>
              <small>{desc}</small>
            </span>
            <span>›</span>
          </button>
        ))}
      </div>
      <button
        className="text-link account-link"
        onClick={() => a.navigate("/account")}
      >
        계정 관리
      </button>
      {modal && (
        <Modal
          className="reward-dialog"
          title={modal === "attendance" ? "오늘 출석 완료!" : "오늘의 팁"}
          onClose={() => setModal(null)}
        >
          {modal === "attendance" ? (
            <>
              <p className="large-reward">+{awarded} EP</p>
              <p>
                오늘도 함께해줘서 고마워요.
                <br />
                {awarded
                  ? "출석 보상을 받았어요."
                  : "오늘 보상은 이미 받았어요."}
              </p>
            </>
          ) : (
            <>
              <p>
                {s.todayTip.title}
                <br />
                {s.todayTip.example}
                <br />
                {s.todayTip.body}
              </p>
              <h3>
                팁 확인 보상 +
                {s.claims.includes("tip") ? 0 : ECONOMY_POLICY.tip} EP
              </h3>
              <p className="muted">새로운 작성법을 하나 배웠어요!</p>
            </>
          )}
          <div className="dialog-actions">
            <Button
              loading={a.busy}
              onClick={() => {
                if (modal === "tip")
                  void a
                    .perform(() =>
                      request(
                        a.localRuntime
                          ? "/v1/dev/rewards/tip"
                          : "/daily-rewards/tip/claim",
                        "POST",
                        {},
                      ),
                    )
                    .then(() => setModal(null));
                else setModal(null);
              }}
            >
              확인
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Mission() {
  const a = useApp(),
    s = a.data!,
    d = s.daily,
    terminal =
      d.success ||
      d.challengeClosed === true ||
      (!d.challengeVersion && d.attemptsUsed >= 5),
    challenge = d.playsUsed >= 5 && !s.activePlay && !terminal;
  return (
    <>
      <span className="badge">
        {terminal
          ? "오늘 도전 결과"
          : challenge
            ? "챌린지 진행 중"
            : d.playsUsed
              ? "게임 진행 중"
              : "오늘의 미션"}
      </span>
      <h2 className="section-heading">
        {d.success
          ? "오늘의 목표를 완성했어요!"
          : terminal
            ? "오늘의 도전을 마쳤어요"
            : challenge
              ? "모은 예산으로 도전해요"
              : d.playsUsed
                ? "남은 게임에 도전해요"
                : "오늘은 " + GAME_LABELS[d.gameKind] + "예요"}
      </h2>
      {!terminal && !challenge ? (
        <>
          <div className="game-preview">
            <span>오늘 · {GAME_LABELS[d.gameKind]}</span>
            <div className="preview-road" />
            <Asset id={s.character} />
          </div>
          <div className="notice section">
            <Stats
              rows={[
                ["남은 게임", `${5 - d.playsUsed} / 5회`],
                [
                  "오늘 최고 기록",
                  d.playsUsed ? d.best + "점" : "아직 기록이 없어요",
                ],
                [
                  "챌린지 예산",
                  d.playsUsed ? String(s.budget) : "게임 후 확정돼요",
                ],
              ]}
            />
          </div>
          <p>
            게임에서 예산을 모은 뒤<br />
            목표 이미지의 조건을 골라 도전해요.
          </p>
          <Button loading={a.busy} onClick={() => a.navigate("/game")}>
            {s.activePlay
              ? "게임 이어하기"
              : d.playsUsed
                ? "게임 계속하기"
                : "게임 시작하기"}
          </Button>
          {d.playsUsed > 0 && (
            <button
              className="text-link"
              onClick={() => a.navigate("/challenge")}
            >
              이미지 챌린지로 이동 ›
            </button>
          )}
        </>
      ) : (
        <>
          <ChallengeArt src={a.content!.target} />
          <div className="notice section">
            <Stats
              rows={
                terminal
                  ? [
                      [
                        "오늘의 결과",
                        d.success ? "챌린지 성공" : "챌린지 실패",
                      ],
                      [
                        d.challengeVersion ? "마지막 일치율" : "최고 조건 점수",
                        s.latestAttempt?.score +
                          (d.challengeVersion ? "%" : "점"),
                      ],
                      [
                        d.success ? "성공 보상" : "남은 챌린지",
                        d.success
                          ? "+" + s.latestAttempt?.ep + " EP · 지급 완료"
                          : "예산 소진 · 추가 도전 불가",
                      ],
                    ]
                  : [
                      ["게임", "5회 플레이 완료"],
                      [
                        "남은 챌린지",
                        `${s.challengeRemaining ?? Math.max(0, 5 - d.attemptsUsed)}회`,
                      ],
                      ["현재 도전 예산", String(s.budget)],
                    ]
              }
            />
          </div>
          <p>
            {terminal
              ? d.success
                ? "오늘의 성공 보상은 이미 받았어요. 결과를 다시 확인해보세요."
                : "오늘은 여기까지! 내일 새 미션이 열려요. 모은 EP와 보유 아이템은 그대로 남아요."
              : "게임은 모두 마쳤어요. 남은 횟수로 이미지 챌린지에 도전해요."}
          </p>
          <Button
            onClick={() =>
              a.navigate(
                terminal
                  ? "/challenge/combination?result=" + d.lastAttempt
                  : "/challenge",
              )
            }
          >
            {terminal
              ? d.success
                ? "성공 결과 다시 보기"
                : "마지막 도전 결과 보기"
              : "챌린지 계속하기"}
          </Button>
        </>
      )}
      {terminal && d.playsUsed < 5 && (
        <Button weak onClick={() => a.navigate("/game")}>
          남은 게임 계속하기 · {5 - d.playsUsed}회
        </Button>
      )}
    </>
  );
}
