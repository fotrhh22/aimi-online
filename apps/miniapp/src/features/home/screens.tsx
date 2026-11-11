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
  crossing: "폴짝 길건너기",
  dino: "점프 달리기",
  runner: "숲길 달리기",
};
export const GAME_BRIEFS = {
  crossing:
    "앞과 양옆으로 한 칸씩 이동하며 차를 피해 길을 건너요. 처음 도착한 앞쪽 칸마다 1점을 얻고, 오늘 최고 기록으로 이미지 챌린지에 쓸 예산을 모아요.",
  dino: "화면을 누르면 점프하고, 길게 누르면 착지 후 다시 점프해요. 다가오는 장애물을 피하며 달리면 점수를 얻고 속도가 점점 빨라져요. 오늘 최고 기록으로 이미지 챌린지 예산을 모아요.",
  runner:
    "좌우로 스와이프해 세 갈래 숲길을 바꾸며 장애물을 피해요. 멀리 달릴수록 점수를 얻고 속도가 빨라지니, 앞쪽의 빈 길을 미리 살펴보세요. 오늘 최고 기록으로 이미지 챌린지에 쓸 예산을 모아요.",
};
export function Home() {
  const a = useApp(),
    s = a.data!,
    [modal, setModal] = useState<"attendance" | "tip" | null>(null),
    [awarded, setAwarded] = useState(0),
    [attendancePending, setAttendancePending] = useState(false),
    [attendanceError, setAttendanceError] = useState(false);
  const reward = async (type: "attendance" | "tip") => {
    if (attendancePending) return;
    setAttendancePending(true);
    setAttendanceError(false);
    setAwarded(0);
    setModal(type);
    const r = await a.perform(
      () =>
        request<{ awarded: number }>(
          a.localRuntime
            ? "/v1/dev/rewards/" + type
            : "/daily-rewards/" + type + "/claim",
          "POST",
          {},
        ),
      undefined,
      "background",
    );
    setAttendancePending(false);
    if (r) setAwarded(r.awarded);
    else setAttendanceError(true);
  };
  return (
    <>
      <h2 className="greeting">
        {a.content?.catalog.find(
          (i) => i.id === s.character && i.kind === "character",
        )?.name ?? "내 캐릭터"}
        , 오늘도 한 판 어때요?
      </h2>
      <button className="today-card" onClick={() => a.navigate("/mission")}>
        <small>오늘 · {GAME_LABELS[s.daily.gameKind]}</small>
        <strong>
          {s.daily.success || s.daily.challengeClosed
            ? "챌린지 결과 보기"
            : s.daily.attemptsUsed > 0
              ? "챌린지 계속하기"
              : "게임으로 예산 모으기"}
        </strong>
        <span>
          {s.daily.attemptsUsed > 0
            ? "챌린지 시작 · 게임 종료"
            : `남은 게임 ${5 - s.daily.playsUsed}회`}
        </span>
        <span>최고 점수 {s.daily.best}점</span>
        <Asset id={s.character} size={50} />
      </button>
      <div className="reward-grid">
        <button
          disabled={attendancePending}
          onClick={() => void reward("attendance")}
        >
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
          title={
            modal === "attendance"
              ? attendancePending || attendanceError
                ? "오늘의 출석"
                : "오늘 출석 완료!"
              : "오늘의 팁"
          }
          onClose={() => setModal(null)}
        >
          {modal === "attendance" && attendancePending ? (
            <p role="status">출석을 확인하고 있어요.</p>
          ) : modal === "attendance" && attendanceError ? (
            <p>출석을 확인하지 못했어요. 다시 시도해주세요.</p>
          ) : modal === "attendance" ? (
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
              loading={a.busy || attendancePending}
              onClick={() => {
                if (modal === "attendance" && attendanceError) {
                  void reward("attendance");
                  return;
                }
                if (modal === "tip")
                  void a
                    .perform(
                      () =>
                        request(
                          a.localRuntime
                            ? "/v1/dev/rewards/tip"
                            : "/daily-rewards/tip/claim",
                          "POST",
                          {},
                        ),
                      undefined,
                      "background",
                    )
                    .then(() => setModal(null));
                else setModal(null);
              }}
            >
              {modal === "attendance" && attendanceError ? "다시 확인" : "확인"}
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
    challenge =
      (d.attemptsUsed > 0 || (d.playsUsed >= 5 && !s.activePlay)) && !terminal;
  return (
    <section
      className="mission-screen"
      data-stage={terminal ? "finished" : challenge ? "challenge" : "game"}
    >
      <h2 className="section-heading">
        {d.success
          ? "오늘의 목표를 완성했어요!"
          : terminal
            ? "오늘의 챌린지를 마쳤어요"
            : challenge
              ? "모은 예산으로 챌린지를 시작해요"
              : d.playsUsed
                ? "남은 게임을 플레이해요"
                : "오늘은 " + GAME_LABELS[d.gameKind] + "예요"}
      </h2>
      {!terminal && !challenge ? (
        <>
          <p className="mission-brief">{GAME_BRIEFS[d.gameKind]}</p>
          <div className={"game-preview game-preview-" + d.gameKind}>
            <img
              className="game-preview-scene"
              src={"/content/game-previews/" + d.gameKind + ".svg"}
              alt={GAME_LABELS[d.gameKind] + " 게임 미리보기"}
            />
            <span>오늘 · {GAME_LABELS[d.gameKind]}</span>
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
          <ChallengeArt
            src={a.content!.target}
            className="mission-target-image"
          />
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
                        d.success ? "성공 보상" : "남은 시도",
                        d.success
                          ? "+" + s.latestAttempt?.ep + " EP · 지급 완료"
                          : "예산 소진 · 추가 시도 불가",
                      ],
                    ]
                  : [
                      ["게임", `${d.playsUsed}회 플레이 완료`],
                      [
                        "남은 시도",
                        `${s.challengeRemaining ?? Math.max(0, 5 - d.attemptsUsed)}회`,
                      ],
                      ["현재 챌린지 예산", String(s.budget)],
                    ]
              }
            />
          </div>
          <p>
            {terminal
              ? d.success
                ? "오늘의 성공 보상은 이미 받았어요. 결과를 다시 확인해보세요."
                : "오늘은 여기까지! 내일 새 미션이 열려요. 모은 EP와 보유 아이템은 그대로 남아요."
              : "목표 이미지에 맞는 키워드를 골라 프롬프트를 완성해요. 성공하면 남은 예산에 따라 EP를 받아요."}
          </p>
          <Button
            onClick={() =>
              a.navigate(
                terminal ? "/challenge/result/" + d.lastAttempt : "/challenge",
              )
            }
          >
            {terminal ? "챌린지 결과 보기" : "챌린지 계속하기"}
          </Button>
        </>
      )}
    </section>
  );
}
