import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { claimReward } from '../src/economy.js';
import { createApp } from '../src/app.js';

test('PostgreSQL: concurrent rewards, retries, conflicts, midnight and session revocation', async () => {
  const config = parseConfig({ ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', ENABLE_DEV_AUTH: 'true', LOG_LEVEL: 'silent' });
  const pool = createPool(config.DATABASE_URL);
  const app = createApp(config, pool);
  const subject = 'integration_' + randomUUID().replaceAll('-', '');
  let userId: string | undefined;
  try {
    const login = await app.inject({ method: 'POST', url: '/auth/dev', payload: { subject } });
    assert.equal(login.statusCode, 200);
    const token = login.json().data.token;
    const headers = { authorization: 'Bearer ' + token };
    userId = (await pool.query('SELECT id FROM aimi.users WHERE dev_subject=$1', [subject])).rows[0].id;
    const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => app.inject({ method: 'POST', url: '/daily-rewards/attendance/claim', headers: { ...headers, 'idempotency-key': 'attendance_' + i }, payload: {} })));
    assert.ok(responses.every(r => r.statusCode === 200));
    assert.equal(responses.reduce((n, r) => n + r.json().data.awarded, 0), 5);
    const replay = await app.inject({ method: 'POST', url: '/daily-rewards/attendance/claim', headers: { ...headers, 'idempotency-key': 'attendance_0' }, payload: {} });
    assert.deepEqual(replay.json().data, responses[0].json().data);
    assert.equal((await app.inject({ method: 'POST', url: '/daily-rewards/tip/claim', headers: { ...headers, 'idempotency-key': 'attendance_0' }, payload: {} })).statusCode, 409);
    const tip = await Promise.all(Array.from({ length: 4 }, () => app.inject({ method: 'POST', url: '/daily-rewards/tip/claim', headers: { ...headers, 'idempotency-key': 'same_tip_key' }, payload: {} })));
    assert.ok(tip.every(r => r.statusCode === 200 && r.json().data.balance === 8));
    const before = await claimReward(pool, userId!, 'attendance', 'midnight_replay', false, new Date('2026-01-01T14:59:59Z'));
    const after = await claimReward(pool, userId!, 'attendance', 'midnight_replay', false, new Date('2026-01-01T15:00:00Z'));
    assert.deepEqual(after, before);
    await assert.rejects(claimReward(pool, userId!, 'tip', 'production_block', true), /REWARD_POLICY_UNAVAILABLE/);
    const ledger = await pool.query('SELECT sum(delta)::int AS total FROM aimi.ep_ledger WHERE user_id=$1', [userId]);
    const wallet = await pool.query('SELECT balance FROM aimi.ep_wallets WHERE user_id=$1', [userId]);
    assert.equal(ledger.rows[0].total, wallet.rows[0].balance);
    await app.inject({ method: 'POST', url: '/auth/logout', headers });
    assert.equal((await app.inject({ url: '/wallet', headers })).statusCode, 401);
  } finally {
    // Only the unique test account is removed. Claim references are deleted first.
    if (userId) {
      await pool.query('DELETE FROM aimi.daily_reward_claims WHERE user_id=$1', [userId]);
      await pool.query('DELETE FROM aimi.users WHERE id=$1', [userId]);
    }
    await app.close();
    await pool.end();
  }
});
