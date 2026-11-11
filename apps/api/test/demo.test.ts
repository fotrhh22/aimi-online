import test from "node:test";
import assert from "node:assert/strict";
import {
  initialDemoStates,
  reserveDemoCall,
  type DemoStore,
  demoUser,
  DEMO_FRIEND,
} from "../src/services/demo/repository.js";
import { demoToken, demoTokenEpoch } from "../src/services/demo/register.js";
const epoch = "00000000-0000-4000-8000-000000000001";
test("demo tokens are signed in a separate namespace and reject fabricated identity", () => {
  const value = demoToken("secret", epoch);
  assert.equal(demoTokenEpoch("secret", "Bearer " + value), epoch);
  assert.throws(() => demoTokenEpoch("other", "Bearer " + value));
  assert.throws(() => demoTokenEpoch("secret", "Bearer " + "a".repeat(64)));
  assert.throws(() =>
    demoTokenEpoch("secret", "Bearer " + value.slice(0, -1) + "x"),
  );
});
test("shared demo initial state has only test identities, currency and sample friend", () => {
  const data = initialDemoStates(epoch),
    uid = demoUser(epoch);
  assert.equal(data[uid].balance, 125);
  assert.deepEqual(data[uid].friends, [DEMO_FRIEND]);
  assert.equal(data[DEMO_FRIEND].selectedCharacter, "fox");
  assert.equal(Object.keys(data).length, 2);
  assert.equal(Object.keys(data[uid].days).length, 0);
});
test("demo Gemini quota is rolling60min, shared and expires without an unlimited fallback", () => {
  const now = Date.now(),
    row = {
      ai_calls: [],
      ends_at: new Date(now + 48 * 3600000),
    } as unknown as DemoStore;
  for (let n = 0; n < 20; n++) reserveDemoCall(row, now);
  assert.throws(
    () => reserveDemoCall(row, now + 3599999),
    /DEMO_AI_HOURLY_LIMIT/,
  );
  reserveDemoCall(row, now + 3600000);
  assert.equal(row.ai_calls.length, 1);
  assert.throws(
    () => reserveDemoCall(row, now + 48 * 3600000),
    /DEMO_AI_EXPIRED/,
  );
});

import {
  accountHash,
  personalIdentity,
  personalToken,
} from "../src/services/demo/personal.js";
test("personal recovery codes are normalized, hashed, and tokens are scoped to account and epoch", () => {
  const code = "12345678-90ABCDEF-12345678-90ABCDEF";
  const hash = accountHash(code);
  assert.equal(hash, accountHash(code.toLowerCase().replaceAll("-", " ")));
  assert.throws(() => accountHash("82792F5C"));
  const token = personalToken("secret", hash, epoch);
  assert.deepEqual(personalIdentity("secret", "Bearer " + token), {
    hash,
    epoch,
  });
  assert.throws(() => personalIdentity("other", "Bearer " + token));
  assert.throws(() =>
    personalIdentity("secret", "Bearer " + token.replace(hash, "b".repeat(64))),
  );
  assert.throws(() => demoTokenEpoch("secret", "Bearer " + token));
  assert.throws(() =>
    personalIdentity("secret", "Bearer " + demoToken("secret", epoch)),
  );
});
