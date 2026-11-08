import test from 'node:test';
import assert from 'node:assert/strict';
import { seoulDate, EmptyBody, IdempotencyKey } from '@aimi/contracts';
import { parseConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import type { Pool } from 'pg';

const base = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/postgres', SESSION_SIGNING_KEY: 'a'.repeat(64), HOST: '127.0.0.1', LOG_LEVEL: 'silent' };
test('Korean date switches at UTC 15:00', () => {
  assert.equal(seoulDate(new Date('2026-11-08T14:59:59Z')), '2026-11-08');
  assert.equal(seoulDate(new Date('2026-11-08T15:00:00Z')), '2026-11-09');
});
test('development auth cannot be enabled in production, Render or on public interfaces', () => {
  for (const extras of [{ NODE_ENV: 'production' }, { RENDER: 'true' }, { HOST: '0.0.0.0' }]) {
    assert.throws(() => parseConfig({ ...base, ENABLE_DEV_AUTH: 'true', ...extras }));
  }
  assert.equal(parseConfig({ ...base, ENABLE_DEV_AUTH: 'false' }).ENABLE_DEV_AUTH, 'false');
});
test('reject mutation payloads and unsafe idempotency keys', () => {
  assert.equal(EmptyBody.safeParse({ amount: 999 }).success, false);
  assert.equal(IdempotencyKey.safeParse('short').success, false);
});
test('production has no dev login and unauthenticated wallet is rejected', async () => {
  const app = createApp(parseConfig({ ...base, NODE_ENV: 'production' }), {} as Pool);
  try {
    assert.equal((await app.inject({ method: 'POST', url: '/auth/dev', payload: { subject: 'attacker' } })).statusCode, 404);
    assert.equal((await app.inject('/wallet')).statusCode, 401);
    assert.equal((await app.inject('/health/live')).statusCode, 200);
  } finally { await app.close(); }
});
