-- Keep internal user UUIDs and all existing wallet/social/game foreign keys.
-- Anonymous identities are server-verified and HMACed; never store the SDK code.
ALTER TABLE aimi.users ADD COLUMN toss_anon_key text UNIQUE;
ALTER TABLE aimi.users DROP CONSTRAINT users_check;
ALTER TABLE aimi.users ADD CONSTRAINT users_identity_check
  CHECK (num_nonnulls(toss_user_key, dev_subject, toss_anon_key) = 1);
COMMENT ON COLUMN aimi.users.toss_anon_key IS
  'HMAC-SHA256 of the server-exchanged app-scoped anonKey; not a public friend code';
-- Existing aimi_api table grants cover the added column. No public Data API grants.
