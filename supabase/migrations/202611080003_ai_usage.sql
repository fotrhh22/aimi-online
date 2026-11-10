CREATE TABLE aimi.ai_daily_usage (
 local_date date PRIMARY KEY,
 calls integer NOT NULL CHECK(calls>=0)
);
REVOKE ALL ON aimi.ai_daily_usage FROM PUBLIC,anon,authenticated;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_api') THEN
 GRANT SELECT,INSERT,UPDATE ON aimi.ai_daily_usage TO aimi_api;
END IF; END $$;
