-- Prototype v1 aggregate. Wallet/ledger remain the existing source of truth.
-- Apply using the established migration runner, not the runtime DB account.
CREATE TABLE aimi.prototype_states (
 user_id uuid PRIMARY KEY REFERENCES aimi.users(id) ON DELETE CASCADE,
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
 friend_code text NOT NULL UNIQUE,
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON aimi.prototype_states FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_api') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON aimi.prototype_states TO aimi_api;
 END IF;
END $$;
-- JSON aggregates are intentionally a v1 persistence boundary. No public Data API.
-- Evolving this into normalized play/attempt/job tables requires a new migration.
CREATE TABLE aimi.toss_connections (
 user_id uuid PRIMARY KEY REFERENCES aimi.users(id) ON DELETE CASCADE,
 sealed text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON aimi.toss_connections FROM PUBLIC,anon,authenticated;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_api') THEN
 GRANT SELECT,INSERT,UPDATE,DELETE ON aimi.toss_connections TO aimi_api;
END IF; END $$;
