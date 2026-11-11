import React from "react";
import { ECONOMY_POLICY } from "@aimi/contracts";
import { useApp } from "../../app/context";
import { Button, Modal } from "../../ui/primitives";
import { request } from "../../lib/api/client";

/** The authoritative pending reward survives refresh, day rollover and leaving the app. */
export function ChallengeRewardPopup() {
  const a = useApp();
  const attempt = a.data?.pendingChallengeReward;
  if (!attempt) return null;
  return (
    <Modal title="성공했어요!" dismissible={false} onClose={() => {}}>
      <p>목표 이미지의 키워드를 모두 맞혔어요.</p>
      <p className="challenge-reward-amount">+{attempt.ep} EP</p>
      <p className="caption">
        기본 {ECONOMY_POLICY.challengeBase} EP + 남은 예산 보너스{" "}
        {attempt.ep - ECONOMY_POLICY.challengeBase} EP
      </p>
      <p>확인을 누르면 보상이 지급돼요.</p>
      <div className="dialog-actions">
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
              "챌린지 보상을 받았어요.",
            )
          }
        >
          확인
        </Button>
      </div>
    </Modal>
  );
}
