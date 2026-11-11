import React, { useEffect, useState } from "react";
import type { Play } from "@aimi/contracts";
import { useApp } from "../../app/context";
import { request } from "../../lib/api/client";
import { Button, Stats } from "../../ui/primitives";

export function GameResult() {
  const a = useApp();
  const id = a.path.slice("/results/game/".length);
  const [play, setPlay] = useState<Play | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setPlay(null);
    // Read the saved result; refreshing this page never starts another game.
    void request<Play>("/v1/game-plays/" + id)
      .then((p) => {
        if (!cancelled) setPlay(p);
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
  if (loading) return <p role="status">게임 결과를 불러오고 있어요.</p>;
  const result = play?.result;
  if (!result)
    return (
      <>
        <p role="status">
          {failed
            ? "게임 결과를 불러오지 못했어요."
            : "저장된 게임 결과가 없어요."}
        </p>
        {failed && (
          <Button onClick={() => setRevision((n) => n + 1)}>
            다시 불러오기
          </Button>
        )}
        <Button weak onClick={() => a.navigate("/", { replace: true })}>
          홈으로
        </Button>
      </>
    );
  const cleared = result.status === "cleared";
  return (
    <section className="game-result-page">
      {cleared && <h2 className="green">최고 점수 달성!</h2>}
      {cleared && <p>만점으로 완주했어요!</p>}
      <Stats
        rows={[
          ["게임 스코어", result.score + " / 100점"],
          ["현재까지 BEST", result.best + "점"],
          ["모은 EP", "+" + result.ep + " EP"],
          ["남은 플레이 횟수", result.remaining + " / 5회"],
        ]}
      />
      {cleared && (
        <p className="caption green">오늘의 최대 예산에 도달했어요.</p>
      )}
      <div className="dialog-actions">
        <Button onClick={() => a.navigate("/challenge")}>
          {cleared ? "챌린지 도전하러 가기" : "이미지 챌린지 도전하기"}
        </Button>
        {!cleared && (
          <Button
            weak
            disabled={!result.remaining}
            onClick={() => a.navigate("/game", { replace: true })}
          >
            바로 재시도하기
          </Button>
        )}
      </div>
    </section>
  );
}
