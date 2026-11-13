import React, { useState } from "react";
import { Nickname } from "@aimi/contracts";
import { useApp } from "../../app/context";
import { request } from "../../lib/api/client";
import { BrandLogo, Button } from "../../ui/primitives";
export function NicknameForm({ first = false }: { first?: boolean }) {
  const a = useApp(),
    [name, setName] = useState(first ? "" : a.data!.name),
    [saved, setSaved] = useState(false);
  const valid = Nickname.safeParse(name).success;
  const save = () => {
    if (!valid || a.busy) return;
    void a
      .perform(() => request("/v1/profile", "PUT", { name }))
      .then((result) => {
        if (result) setSaved(true);
      });
  };
  return (
    <form
      className="nickname-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label htmlFor="profile-nickname">닉네임</label>
      <input
        id="profile-nickname"
        value={name}
        maxLength={12}
        autoComplete="nickname"
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        placeholder="닉네임을 입력해주세요"
        aria-describedby="nickname-help"
      />
      <p className="caption" id="nickname-help">
        한글·영문·숫자·밑줄·띄어쓰기 2~12자
      </p>
      <Button onClick={save} disabled={!valid || a.busy} loading={a.busy}>
        {first ? "이 닉네임으로 시작하기" : "닉네임 저장"}
      </Button>
      {saved && <p role="status">닉네임을 저장했어요.</p>}
      {first && a.toast && <p role="alert">{a.toast}</p>}
    </form>
  );
}
export function NicknameSetup() {
  return (
    <main className="nickname-setup">
      <BrandLogo />
      <h1>어떤 이름으로 불러드릴까요?</h1>
      <p>
        친구에게 표시할 닉네임을 정해주세요.
        <br />
        나중에 계정 관리에서 바꿀 수 있어요.
      </p>
      <NicknameForm first />
    </main>
  );
}
