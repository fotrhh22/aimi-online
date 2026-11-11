import React, { useState } from "react";
import { useApp } from "../../app/context";
import { Button } from "../../ui/primitives";
import { startTestDemo, issueAccessCode } from "../../lib/demo";
import { copy } from "../../lib/toss/bridge";
export function WebAccountEntry() {
  const a = useApp();
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState("");
  const valid = /^[A-F0-9]{32}$/.test(code.replace(/[\s-]/g, ""));
  return (
    <>
      <p>접속 코드마다 EP·정원·챌린지 기록이 따로 저장돼요.</p>
      <Button
        weak={!!issued || valid}
        disabled={!!issued}
        loading={a.busy}
        onClick={() =>
          void a.perform(
            async () => {
              setIssued(await issueAccessCode());
            },
            undefined,
            "none",
          )
        }
      >
        접속 코드 생성하기
      </Button>
      {issued && (
        <div className="issued-access-code">
          <strong>내 접속 코드</strong>
          <code>{issued}</code>
          <button
            className="text-link"
            onClick={() =>
              void a.perform(
                () => copy(issued),
                "코드를 복사했어요. 아래에 붙여넣어 주세요.",
                "none",
              )
            }
          >
            코드 복사
          </button>
          <p className="caption">
            코드를 보관하고 아래 입력란에 붙여넣어 주세요.
          </p>
        </div>
      )}
      <label>
        접속 코드
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={48}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="발급받은 코드를 붙여넣어 주세요"
        />
      </label>
      <Button
        disabled={!valid}
        loading={a.busy}
        onClick={() =>
          void a.perform(
            async () => {
              await startTestDemo(code);
              a.setAuthenticated(true);
            },
            undefined,
            "all",
          )
        }
      >
        시작하기
      </Button>
      <p className="caption">
        이미 코드가 있다면 새로 만들지 않고 입력하세요. 접속 코드는 비밀번호
        역할을 하며, 소셜 친구 코드와 달라요.
      </p>
    </>
  );
}
