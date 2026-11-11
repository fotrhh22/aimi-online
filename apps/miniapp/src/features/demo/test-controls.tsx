import React, { useState, useEffect } from "react";
import { useApp } from "../../app/context";
import { Button, Modal } from "../../ui/primitives";
import { request } from "../../lib/api/client";
import { resetTestDemo } from "../../lib/demo";
export function TestControls() {
  const a = useApp(),
    [confirm, setConfirm] = useState(false);
  const [ai, setAI] = useState<{
    aiUsed: number;
    aiEndsAt: string;
    aiNextAt: string | null;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (a.path !== "/account") return;
    void request<{ aiUsed: number; aiEndsAt: string; aiNextAt: string | null }>(
      "/demo/status",
    )
      .then((r) => {
        if (active) setAI(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [a.data, a.path]);
  return (
    <aside className="test-demo-controls">
      <span>
        테스트 계정 · 실제 보상 아님
        {a.path === "/account" && ai && (
          <>
            <br />
            {Date.now() >= Date.parse(ai.aiEndsAt)
              ? "AI 테스트 기간 종료"
              : `Gemini 최근 1시간 ${ai.aiUsed}/20회 · 48시간 테스트`}
            {ai.aiUsed >= 20 &&
              ai.aiNextAt &&
              ` · ${new Date(ai.aiNextAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}부터 다시 이용`}
          </>
        )}
      </span>
      <button
        className="text-link"
        disabled={a.busy}
        onClick={() => setConfirm(true)}
      >
        테스트 초기화
      </button>
      {confirm && (
        <Modal
          title="처음 상태로 돌아갈까요?"
          onClose={() => !a.busy && setConfirm(false)}
        >
          <p>
            EP·정원·게임·챌린지와 예시 친구를 초기화해요. 다른 테스트
            접속자에게도 적용돼요.
          </p>
          <p className="caption">
            Gemini 시간당 사용량과 48시간 이용 기간은 초기화되지 않아요.
          </p>
          <div className="dialog-actions">
            <Button
              loading={a.busy}
              onClick={() =>
                void a.perform(
                  async () => {
                    await resetTestDemo();
                    a.navigate("/", { replace: true });
                    setConfirm(false);
                  },
                  "테스트를 초기화했어요.",
                  "all",
                )
              }
            >
              초기화하기
            </Button>
            <Button weak disabled={a.busy} onClick={() => setConfirm(false)}>
              취소
            </Button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
