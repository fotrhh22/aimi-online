import type { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { ECONOMY_POLICY, seoulDate, type RewardType, type RewardResult } from '@aimi/contracts';
import { ApiError } from './db.js';

export async function claimReward(pool: Pool, userId: string, type: RewardType, key: string, production: boolean, at = new Date()): Promise<RewardResult> {
  const client = await pool.connect();
  // Date intentionally excluded: retries after midnight return the original response.
  const hash = createHash('sha256').update(JSON.stringify({ operation: 'daily-reward', type, body: {} })).digest('hex');
  const day = seoulDate(at);
  try {
    await client.query('BEGIN');
    const wallet = await client.query('SELECT balance FROM aimi.ep_wallets WHERE user_id=$1 FOR UPDATE', [userId]);
    if (!wallet.rowCount) throw new ApiError('WALLET_NOT_FOUND', 404);
    const previous = await client.query('SELECT request_hash,response FROM aimi.idempotency_requests WHERE user_id=$1 AND request_key=$2', [userId, key]);
    if (previous.rowCount) {
      if (previous.rows[0].request_hash !== hash) throw new ApiError('IDEMPOTENCY_CONFLICT', 409);
      await client.query('COMMIT');
      return previous.rows[0].response;
    }
    const policy = await client.query('SELECT * FROM aimi.reward_policies WHERE version=$1', [ECONOMY_POLICY.version]);
    if (!policy.rowCount || (production && policy.rows[0].development_only)) throw new ApiError('REWARD_POLICY_UNAVAILABLE', 503);
    const claimed = await client.query('SELECT 1 FROM aimi.daily_reward_claims WHERE user_id=$1 AND local_date=$2 AND reward_type=$3', [userId, day, type]);
    let balance = wallet.rows[0].balance;
    const awarded = claimed.rowCount ? 0 : policy.rows[0][type] as number;
    if (awarded) {
      balance += awarded;
      await client.query('UPDATE aimi.ep_wallets SET balance=$2,updated_at=now() WHERE user_id=$1', [userId, balance]);
      const ledger = await client.query('INSERT INTO aimi.ep_ledger(user_id,event_key,delta,balance_after,rule_version) VALUES ($1,$2,$3,$4,$5) RETURNING id', [userId, `daily:${day}:${type}`, awarded, balance, policy.rows[0].version]);
      await client.query('INSERT INTO aimi.daily_reward_claims(user_id,local_date,reward_type,ledger_id) VALUES ($1,$2,$3,$4)', [userId, day, type, ledger.rows[0].id]);
    }
    const response: RewardResult = { balance, awarded, alreadyClaimed: Boolean(claimed.rowCount), rewardType: type, localDate: day };
    await client.query('INSERT INTO aimi.idempotency_requests(user_id,request_key,request_hash,response) VALUES ($1,$2,$3,$4)', [userId, key, hash, response]);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
