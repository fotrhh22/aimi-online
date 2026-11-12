import React, { useEffect, useState } from "react";
import { ECONOMY_POLICY } from "@aimi/contracts";
import { useApp } from "../../app/context";
import { Button, Modal } from "../../ui/primitives";
import { request } from "../../lib/api/client";

/** The authoritative pending reward survives refresh, day rollover and leaving the app. */
export function ChallengeRewardPopup() {
  const a = useApp();
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    const reopen = () => setDismissed(null);
    window.addEventListener("aimi-open-reward", reopen);
    return () => window.removeEventListener("aimi-open-reward", reopen);
  }, []);
  const attempt = a.data?.pendingChallengeReward;
  if (!attempt || attempt.id === dismissed) return null;
  return (
    <Modal title="성공했어요!" onClose={() => setDismissed(attempt.id)}>
      <p>목표 이미지의 키워드를 모두 맞혔어요.</p>
      <p className="challenge-reward-amount">+{attempt.ep} EP</p>
      <p className="caption">
        기본 {ECONOMY_POLICY.challengeBase} EP + 남은 예산 보너스{" "}
        {attempt.ep - ECONOMY_POLICY.challengeBase} EP
      </p>
      <p>확인을 누르면 보상이 지급돼요.</p>
      <div className="dialog-actions">
        <Button weak onClick={() => setDismissed(attempt.id)}>
          닫기
        </Button>
        <Button
          loading={a.busy}
          disabled={a.busy}
          onClick={() =>
            void a.perform(
              () =>
                request(
                  "/v1/attempts/" + encodeURIComponent(attempt.id) + "/reward",
                  "POST",
                  {},
                ),
              `${attempt.ep} EP를 획득했어요.`,
            )
          }
        >
          확인
        </Button>
      </div>
    </Modal>
  );
}
export function PendingRewardButton() {
  const attempt = useApp().data?.pendingChallengeReward;
  return attempt ? (
    <button
      className="text-link pending-reward-link"
      onClick={() => window.dispatchEvent(new Event("aimi-open-reward"))}
    >
      챌린지 보상 {attempt.ep} EP 받기
    </button>
  ) : null;
}
