-- Prepared migration. Apply with a migration role, not from the agent process.
-- Keeps existing content_releases, ten-day fallback and all user records intact.
BEGIN;
CREATE TABLE IF NOT EXISTS aimi.content_drafts (
 batch_id text NOT NULL, day_id text NOT NULL, scheduled_date date NOT NULL,
 content_hash text NOT NULL, manifest jsonb NOT NULL, daily_tip jsonb NOT NULL,
 storage_key text NOT NULL, target_url text NOT NULL CHECK(target_url LIKE 'https://%'),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(batch_id,day_id)
);
CREATE TABLE IF NOT EXISTS aimi.content_publications (
 batch_id text PRIMARY KEY, content_hash text NOT NULL, actor text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aimi.scheduled_content (
 scheduled_date date PRIMARY KEY, release_version text NOT NULL REFERENCES aimi.content_releases(version),
 daily_tip jsonb NOT NULL, batch_id text NOT NULL REFERENCES aimi.content_publications(batch_id)
);
ALTER TABLE aimi.content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aimi.content_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE aimi.scheduled_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aimi.content_drafts,aimi.content_publications,aimi.scheduled_content FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION aimi.publish_content_batch(p_batch text,p_hash text,p_actor text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,aimi AS $$
DECLARE r record; v text; n integer; p jsonb; old_hash text;
BEGIN
 IF p_batch IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_actor IS NULL OR length(trim(p_actor))=0 THEN RAISE EXCEPTION 'Invalid publication identity'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('aimi-content-publication'));
 SELECT content_hash INTO old_hash FROM aimi.content_publications WHERE batch_id=p_batch;
 IF FOUND THEN
  IF old_hash<>p_hash THEN RAISE EXCEPTION 'Publication hash conflict'; END IF;
  RETURN (SELECT count(*)::int FROM aimi.scheduled_content WHERE batch_id=p_batch);
 END IF;
 SELECT count(*) INTO n FROM aimi.content_drafts WHERE batch_id=p_batch AND content_hash=p_hash;
 IF n<>9 OR (SELECT count(*) FROM aimi.content_drafts WHERE batch_id=p_batch)<>9 THEN RAISE EXCEPTION 'Nine matching drafts required'; END IF;
 IF (SELECT count(DISTINCT scheduled_date) FROM aimi.content_drafts WHERE batch_id=p_batch)<>9
 OR (SELECT max(scheduled_date)-min(scheduled_date) FROM aimi.content_drafts WHERE batch_id=p_batch)<>8
 THEN RAISE EXCEPTION 'Nine consecutive dates required'; END IF;
 IF EXISTS(SELECT 1 FROM aimi.content_drafts WHERE batch_id=p_batch AND scheduled_date <= (now() AT TIME ZONE 'Asia/Seoul')::date)
 THEN RAISE EXCEPTION 'Only future dates may be published'; END IF;
 IF EXISTS(SELECT 1 FROM aimi.content_drafts d JOIN aimi.scheduled_content s USING(scheduled_date) WHERE d.batch_id=p_batch)
 THEN RAISE EXCEPTION 'Scheduled date already published'; END IF;
 INSERT INTO aimi.content_publications VALUES(p_batch,p_hash,p_actor,now());
 FOR r IN SELECT * FROM aimi.content_drafts WHERE batch_id=p_batch ORDER BY scheduled_date LOOP
  p=r.manifest;
  IF (p->'review'->>'status') IS DISTINCT FROM 'pending' OR p->'model_plan'->>'actual_model_id' IS NULL
   OR COALESCE(p->'assets'->>'sha256','') !~ '^[a-f0-9]{64}$' OR COALESCE(jsonb_array_length(p->'correct_keywords'),0)<3
  THEN RAISE EXCEPTION 'Invalid draft'; END IF;
  p=jsonb_set(p,'{published}','true'::jsonb);
  p=jsonb_set(p,'{review,status}','"approved"'::jsonb);
  p=jsonb_set(p,'{review,reviewer_kind}','"human"'::jsonb);
  p=jsonb_set(p,'{review,reviewer}',to_jsonb(p_actor));
  p=jsonb_set(p,'{scoring,release_ready}','true'::jsonb);
  p=jsonb_set(p,'{assets,target_storage_key}',to_jsonb(r.storage_key));
  p=jsonb_set(p,'{tips}',(SELECT jsonb_agg(jsonb_set(t,'{approval}','"approved"'::jsonb)) FROM jsonb_array_elements(p->'tips') t));
  v=(p->>'id')||':'||(p->>'version')||':'||left(p->'assets'->>'sha256',12);
  INSERT INTO aimi.content_releases(version,day_id,rule_version,review_status,manifest,target_storage_key,target_url,asset_sha256)
   VALUES(v,p->>'id','aimi-keyword-set-v4','approved',p,r.storage_key,r.target_url,p->'assets'->>'sha256');
  INSERT INTO aimi.scheduled_content VALUES(r.scheduled_date,v,r.daily_tip,p_batch);
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION aimi.publish_content_batch(text,text,text) FROM PUBLIC;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_content_writer') THEN CREATE ROLE aimi_content_writer NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA aimi TO aimi_content_writer;
GRANT SELECT,INSERT,UPDATE ON aimi.content_drafts TO aimi_content_writer;
CREATE POLICY content_draft_writer ON aimi.content_drafts TO aimi_content_writer USING(true) WITH CHECK(true);
GRANT EXECUTE ON FUNCTION aimi.publish_content_batch(text,text,text) TO aimi_content_writer;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aimi_api') THEN
  GRANT USAGE ON SCHEMA aimi TO aimi_api;
  GRANT SELECT ON aimi.scheduled_content,aimi.content_publications TO aimi_api;
  CREATE POLICY api_content_publications_reader ON aimi.content_publications FOR SELECT TO aimi_api USING(true);
  CREATE POLICY api_scheduled_content_reader ON aimi.scheduled_content FOR SELECT TO aimi_api USING(true);
 END IF;
END $$;
COMMIT;
-- Assign a separate LOGIN role membership in aimi_content_writer and configure its URL
-- as CONTENT_DATABASE_URL. Never place a password in this migration or use migration credentials.
