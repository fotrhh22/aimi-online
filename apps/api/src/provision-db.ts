// One-time local bootstrap. Secrets stay in .env.local; never print DB errors/URLs.
import './config.js';
import { createPool } from './db.js';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
const source = await readFile(envPath, 'utf8');
const initial = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!initial) throw new Error('Database bootstrap credentials missing');
const admin = createPool(initial);
try {
  // Refuse to replace existing roles/credentials silently.
  const exists = await admin.query("SELECT 1 FROM pg_roles WHERE rolname='aimi_api'");
  if (exists.rowCount) throw new Error('Runtime role already exists; preserve credentials and review configuration');
  const password = randomBytes(32).toString('hex');
  await admin.query(`CREATE ROLE aimi_api LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
  await admin.query('GRANT USAGE ON SCHEMA aimi TO aimi_api');
  await admin.query('GRANT SELECT ON aimi.schema_migrations, aimi.reward_policies TO aimi_api');
  await admin.query('GRANT SELECT, INSERT, UPDATE, DELETE ON aimi.users, aimi.sessions, aimi.ep_wallets, aimi.ep_ledger, aimi.daily_reward_claims, aimi.idempotency_requests TO aimi_api');
  const runtime = new URL(initial);
  const originalUser = decodeURIComponent(runtime.username);
  runtime.username = originalUser.startsWith('postgres.') ? 'aimi_api.' + originalUser.slice('postgres.'.length) : 'aimi_api';
  runtime.password = password;
  const check = createPool(runtime.toString());
  try {
    await check.query('SELECT balance FROM aimi.ep_wallets LIMIT 0');
    const privileges = await check.query("SELECT has_schema_privilege(current_user,'aimi','CREATE') AS can_create");
    if (privileges.rows[0].can_create) throw new Error('Runtime role unexpectedly has DDL access');
  } finally { await check.end(); }
  let updated = source;
  for (const [key, value] of Object.entries({ MIGRATION_DATABASE_URL: initial, DATABASE_URL: runtime.toString() })) {
    const pattern = new RegExp('^' + key + '=.*$', 'm');
    updated = pattern.test(updated) ? updated.replace(pattern, () => key + '=' + value) : updated + '\n' + key + '=' + value + '\n';
  }
  await writeFile(envPath, updated, { mode: 0o600 });
  console.log('Runtime role created and verified; local runtime/migration credentials separated.');
} catch {
  console.error('Database role bootstrap failed; sensitive details suppressed. Existing state must be reviewed before retry.');
  process.exitCode = 1;
} finally { await admin.end(); }
