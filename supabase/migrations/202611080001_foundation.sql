-- Server-only schema: intentionally excluded from the default public Data API.
CREATE TABLE aimi.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_user_key text UNIQUE,
  dev_subject text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((toss_user_key IS NULL) <> (dev_subject IS NULL))
);
CREATE TABLE aimi.sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES aimi.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON aimi.sessions(user_id);
CREATE INDEX sessions_expiry_idx ON aimi.sessions(expires_at);
CREATE TABLE aimi.ep_wallets (
  user_id uuid PRIMARY KEY REFERENCES aimi.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE aimi.ep_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES aimi.users(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  delta integer NOT NULL CHECK (delta <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);
CREATE TABLE aimi.daily_reward_claims (
  user_id uuid NOT NULL REFERENCES aimi.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('attendance', 'tip')),
  ledger_id uuid NOT NULL UNIQUE REFERENCES aimi.ep_ledger(id),
  PRIMARY KEY (user_id, local_date, reward_type)
);
CREATE TABLE aimi.idempotency_requests (
  user_id uuid NOT NULL REFERENCES aimi.users(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_key)
);
CREATE TABLE aimi.reward_policies (
  version text PRIMARY KEY,
  attendance integer NOT NULL CHECK (attendance > 0),
  tip integer NOT NULL CHECK (tip > 0),
  development_only boolean NOT NULL DEFAULT true
);
-- UX example amounts; production claims are blocked until a reviewed policy exists.
INSERT INTO aimi.reward_policies VALUES ('development-v1', 5, 3, true);
REVOKE ALL ON SCHEMA aimi FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA aimi FROM PUBLIC, anon, authenticated;
