-- Shared UI test data only. No production user/wallet foreign keys or writes.
CREATE TABLE aimi.test_demo_stores (
 id text PRIMARY KEY,
 state jsonb NOT NULL DEFAULT '{}'::jsonb,
 epoch uuid NOT NULL DEFAULT gen_random_uuid(),
 starts_at timestamptz,
 ends_at timestamptz,
 ai_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
 last_reset_at timestamptz NOT NULL DEFAULT '1970-01-01',
 CHECK(jsonb_typeof(state)='object'),
 CHECK(jsonb_typeof(ai_calls)='array')
);
ALTER TABLE aimi.test_demo_stores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aimi.test_demo_stores FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_api') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON aimi.test_demo_stores TO aimi_api;
  CREATE POLICY api_test_demo ON aimi.test_demo_stores FOR ALL TO aimi_api USING(true) WITH CHECK(true);
 END IF;
END $$;
