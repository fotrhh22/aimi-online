import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { Nickname, ProfileInput } from "@aimi/contracts";
import { registerPrototype } from "../src/modules/routes.js";
import { FileRepository } from "../src/modules/repository.js";
import { ApiError } from "../src/db.js";
import { ZodError } from "zod";
test("nickname schema validates identity input without accepting wallet or sharing edits", () => {
  assert.equal(Nickname.parse("  새 이름  "), "새 이름");
  for (const name of [" ", "가", "<script>", "가".repeat(13), "user@toss"])
    assert.equal(Nickname.safeParse(name).success, false);
  assert.equal(
    ProfileInput.safeParse({ name: "새 이름", balance: 999 }).success,
    false,
  );
  assert.equal(ProfileInput.safeParse({ public: false }).success, false);
});
test("nickname persists on the current user and social; only accepted friends can view gardens", async () => {
  const repo = new FileRepository(),
    app = Fastify();
  app.setErrorHandler((e, _r, reply) =>
    reply
      .status(
        e instanceof ApiError ? e.status : e instanceof ZodError ? 400 : 500,
      )
      .send({
        error: { code: e instanceof ApiError ? e.code : "INVALID_REQUEST" },
      }),
  );
  registerPrototype(app, repo, async (r) => String(r.headers["x-test-user"]));
  const me = "profile-alice",
    other = "profile-bob",
    stranger = "profile-carol";
  const a = await repo.read(me),
    b = await repo.read(other);
  await repo.read(stranger);
  await repo.transaction([me, other], (s) => {
    s[me].nicknameSet = false;
    s[other].garden.public = false;
  });
  const call = (
    id: string,
    url: string,
    method: "GET" | "PUT" | "POST" = "GET",
    payload?: unknown,
    key = randomUUID(),
  ) =>
    app.inject({
      url,
      method,
      headers: { "x-test-user": id, "idempotency-key": key },
      ...(payload ? { payload } : {}),
    });
  try {
    assert.equal((await call(me, "/v1/state")).json().data.nicknameSet, false);
    const key = randomUUID();
    for (let i = 0; i < 2; i++)
      assert.equal(
        (await call(me, "/v1/profile", "PUT", { name: "  초록별  " }, key))
          .statusCode,
        200,
      );
    const state = (await call(me, "/v1/state")).json().data;
    assert.equal(state.name, "초록별");
    assert.equal(state.nicknameSet, true);
    assert.equal(state.balance, a.balance);
    assert.equal((await repo.read(other)).name, b.name);
    assert.equal(
      (await call(me, "/v1/profile", "PUT", { name: "a" })).statusCode,
      400,
    );
    assert.equal(
      (await call(me, "/v1/profile", "PUT", { public: false })).statusCode,
      400,
    );
    await call(me, "/v1/social/actions", "POST", {
      action: "request",
      code: b.code,
    });
    assert.equal(
      (await call(me, "/v1/friends/" + other + "/garden")).statusCode,
      403,
    );
    await call(other, "/v1/social/actions", "POST", {
      action: "accept",
      code: a.code,
    });
    const social = (await call(other, "/v1/social")).json().data;
    assert.equal(
      social.people.find((p: { id: string }) => p.id === me).name,
      "초록별",
    );
    assert.equal(
      (await call(me, "/v1/friends/" + other + "/garden")).statusCode,
      200,
      "legacy private flag no longer blocks accepted friends",
    );
    assert.equal(
      (await call(stranger, "/v1/friends/" + other + "/garden")).statusCode,
      403,
    );
    await call(other, "/v1/social/actions", "POST", {
      action: "block",
      code: a.code,
    });
    assert.equal(
      (await call(me, "/v1/friends/" + other + "/garden")).statusCode,
      403,
    );
  } finally {
    await app.close();
  }
});
