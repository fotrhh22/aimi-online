-- Server-only content publication boundary. Preview remains distinct from approval.
CREATE TABLE aimi.content_releases (
  version text PRIMARY KEY,
  day_id text NOT NULL,
  rule_version text NOT NULL,
  review_status text NOT NULL CHECK(review_status IN ('preview','approved','retired')),
  manifest jsonb NOT NULL CHECK(jsonb_typeof(manifest)='object'),
  target_storage_key text NOT NULL,
  target_url text NOT NULL,
  asset_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE aimi.daily_programs (
  version text PRIMARY KEY,
  program jsonb NOT NULL CHECK(jsonb_typeof(program)='object'),
  release_versions jsonb NOT NULL CHECK(jsonb_typeof(release_versions)='array'),
  active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_daily_program ON aimi.daily_programs(active) WHERE active;
ALTER TABLE aimi.content_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE aimi.daily_programs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aimi.content_releases,aimi.daily_programs FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_api') THEN
  GRANT SELECT ON aimi.content_releases,aimi.daily_programs TO aimi_api;
  CREATE POLICY api_content_reader ON aimi.content_releases FOR SELECT TO aimi_api USING(true);
  CREATE POLICY api_program_reader ON aimi.daily_programs FOR SELECT TO aimi_api USING(true);
 END IF;
END $$;
