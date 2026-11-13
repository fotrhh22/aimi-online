# 콘텐츠 자동화·DB 개선 논의안

2026-11-11. 이 문서는 로컬 migration/앱/스튜디오 코드를 대조한 설계안이다. 원격 DB의 실제 행·정책·적용 migration을 조회하지 않았고 DB/코드/Actions 실행은 변경하지 않았다.

## 현재 구조

- aimi.content_releases: version PK, day_id, rule_version, review_status(preview/approved/retired), manifest JSONB, Storage key/URL, 이미지 해시.
- aimi.daily_programs: version PK, program JSONB, release_versions 배열, active. 활성 묶음 하나만 허용한다.
- 두 테이블은 일반 클라이언트 접근을 차단하고 aimi_api는 SELECT만 한다.
- remote.ts는 활성 묶음을 시작 시 읽는다. generated.ts는 정확히10개를 요구하고2026-11-11 기준 날짜 나머지 연산으로 선택한다. daily-program.ts도 팁10개를 요구한다. 새 콘텐츠를 DB에 넣어도 현재 프로세스는 자동 재조회하지 않는다.
- 현재 오늘의 팁은 고정10개 순환이다. Gemini 예약 생성이 아니다.
- 기존 generate_batch.mjs는 OpenRouter 유료 이미지 호출/체크포인트/비용 기록이 있으나 로컬 파일과 로컬 env 경로에 의존한다. publish-preview.mjs는 로컬 env/10개 경로/public 이미지 버킷/관리 DB URL을 사용하는 일회성 업로드 도구다.
- .github/workflows/ci.yml은 CI만 있고 생성/검수/발행 워크플로는 없다.
- 스튜디오 CONTRACT.md의 일부 시도 비용/힌트 공개 규칙은 현재 앱의 고정30예산/15예산 힌트 정책보다 오래됐다. 자동화 전에 계약 버전을 일치시켜야 한다.

## DB 개편 원칙

기존 지갑/EP/사용자 상태와 모델 추천 데이터는 유지한다. 콘텐츠는 앱과 별도 제작 환경이 만들고 같은 Supabase에 발행한다. 플레이 중 이미지 생성이나 LLM 채점을 추가하지 않는다. JSON manifest는 버전별 완성본으로 유지하고, 운영에 필요한 상태/관계만 컬럼과 테이블로 분리한다.

## 권장 추가 테이블5개

### aimi.content_jobs — 생성 실행과 재개

id UUID PK, batch_id UUID, content_id, stage(plan/keywords/image/explanation/daily_tip), provider, requested_model_id, actual_model_id, provider_request_id, request_hash, prompt_template_version, input_release_version, input_source_revision, request_json(JSONB), response_metadata(JSONB), status(queued/running/succeeded/failed/unknown), reserved_usd, actual_cost_usd(nullable), reservation_state, github_run_id, started_at, finished_at, error_code.

논리 작업키와 request_hash에 중복 방지 제약을 둔다. 같은 배치/문제/단계가 두 번 시작되지 않도록 DB에서 원자적으로 claim한다. 응답 불명 타임아웃은 unknown으로 기록하고 유료 요청을 무조건 재시도하지 않는다. 공급사가 idempotency를 보장하지 않으면 외부 과금까지 exactly-once라고 주장하지 않는다. 기존 로컬 ledger를 이 기록으로 옮긴다.

### aimi.content_assets — 실제 이미지와 생성 근거

id UUID PK, generation_job_id FK, storage_bucket, storage_key UNIQUE, sha256, mime_type, width, height, byte_size, requested_model_id, actual_model_id, created_at.

원본 파일과 앱 표시용 변환본이 다르면 parent_asset_id/원본 해시를 추가한다. 생성 prompt는 job 요청 원문에서 추적한다. URL 문자열만을 영구 식별자로 쓰지 않는다. 미검수 초안은 비공개 저장, 승인본만 앱에 제공하는 방식을 권장한다.

### aimi.daily_tips — 짧은 오늘의 팁

id UUID, version, title, example, body, learning_point, source_ids(JSONB), source_revision, generation_job_id FK, status(draft/reviewed/approved/retired), reviewed_by, reviewed_at, content_hash.

기존 제목+예시+짧은 설명 형식을 유지한다. 오늘의 팁과 종료 후 일별 해설을 같은 텍스트 필드로 합치지 않는다. 특정 문제의 정답을 미리 드러내는 팁은 해당 날짜에 연결하지 않는다. 최초 기존10개를 가져오고 신규 승인 팁을 추가한다.

### aimi.content_reviews — 내용·이미지 검수 증거

id UUID PK, release_version 또는 tip_version FK, asset_sha256(nullable), review_type(visual/editorial/model_scope), result, findings(JSONB), reviewer_kind(human/ai), reviewer_id, model_id(nullable), created_at.

condition별 intended_value/observed_value/review_status/confidence/notes를 findings와 manifest에 연결한다. AI 검토와 사람의 발행 승인을 구분한다. 검수 후 이미지가 바뀌면 이전 검수를 재사용하지 않는다. 신규 생성 문제에 편집 가이드가 붙는지, 모델 팁 적용 근거가 있는지 검사한다.

### aimi.content_calendar — 날짜별 승인 콘텐츠

date DATE PK(Asia/Seoul 운영 날짜), challenge_release_version FK, daily_tip_version FK, game_kind, schedule_version, status(draft/published), published_at, published_by.

정해진 날짜의 게임/챌린지/팁을 한 행에서 조회한다. 모든 참조가 승인·실재하는지 발행 트랜잭션에서 검사한다. 검수 부족 시 임의 미승인 콘텐츠를 골라내지 말고 사전 승인한 fallback 또는 운영자가 정한 재사용 규칙을 적용한다. 미래 날짜 편성은 수정 가능하나 이미 시작된 사용자 미션의 버전은 고정한다.

## 기존 테이블 변경

content_releases에 asset_id, generation_job_id, manifest_schema_version, content_hash, approved_at/by, published_at을 추가하는 방안을 권장한다. 승인 후 manifest/이미지는 덮어쓰지 않고 새 version을 만든다. 내용 해시는 이미지뿐 아니라 정답/팁/원문/해설 변경도 포함한다. 현재 day-id/version/image-hash 조합만으로 해설 수정을 구분하는 한계를 해결한다.

daily_programs는 기존10일 번들의 이관/롤백용으로 남기고 장기 운영의 날짜 선택은 content_calendar로 옮긴다. 정확히10개 고정 제약과 시작 날짜 고정 modulo를 제거한다. 현재 prototype_states 안의 day.challengeVersion은 재사용하되 최초 미션 배정 시 확정 release version을 보관하는 방식으로 강화한다. 이미 시작한 날짜의 정답을 새 버전으로 바꾸지 않는다.

## 일별 해설 데이터 — manifest 안에서 확정

learning_feedback:
- prompt_format: 실제 사용한 자연문/항목형/브리프 등.
- scene_explanation: 검수된 장면 설명.
- authored_prompt: 실제 생성 요청 원문(사후 수정 금지).
- variable_links: condition_id, target_id, 실제 값, 원문 구절.
- writing_points: 오늘 변수/관계/표현 형식의 이유1~2개, 실제 문장 예시.
- model_notes: 적용 모델/계열, 적용 작업(generate/edit), 근거 source_ids, 범위, 승인 상태.
- sources_revision, explanation_template_version.

문제별 작성법 설명과 모델 고유 권고를 구분한다. 공식 자료가 없는 모델에 그럴듯한 전용 팁을 만들지 않는다. 검증된 일반 원리를 쓰더라도 오늘의 예시·변수·문장과 연결한다. 답안은 검수된 조건 집합, 생성 원문은 제작 기록이므로 둘을 혼동하지 않는다.

## 생성 순서

1. 검증된 모델별 자료/일반 작성법 자료/최근 출제 기록에서 오늘의 학습 목표·모델·작성 형식·변수를 계획한다(Gemini 구조화 출력).
2. 프롬프트·정답 후보·오답 후보 초안을 만든다. 이 단계에서는 아직 최종 정답이 아니다.
3. 선택한 모델로 OpenRouter 이미지 생성, 원본 Storage 저장, 작업/실제 모델/요청/비용 기록.
4. 생성된 이미지를 조건별 검수한다. AI 시각 검토는 후보 표시용이며 현재 Day01 같은 모호함은 사람이 결정한다.
5. 모호한 조건 제거/재생성 등으로 최종 정답을 확정하고 키워드·오답·힌트 개수·하이라이트를 정합성 검사한다.
6. 확정 이미지/실제 prompt/사용 변수/근거 자료를 Gemini에 넘겨 날짜별 해설을 작성하고 범위 검수한다.
7. 짧은 오늘의 팁은 별도 생성·중복 검사한다. 문제의 정답을 드러내지 않는 날짜에 편성한다.
8. 사람 승인 후 release를 고정하고 미래 날짜의 calendar를 원자적으로 발행한다.
9. 앱은 날짜별 승인 행을 조회한다. 자정에 새로 생성할 필요가 없으며 이미 시작한 도전은 고정 버전을 사용한다.

## GitHub Actions 구성안

- content-prepare.yml: workflow_dispatch + 정기 부족분 확인. 앞으로10일 운영분을 목표로 부족분만 생성한다. 초안/자료/키워드/일별 해설/짧은 팁 단계는 Gemini, 이미지 단계만 OpenRouter.
- content-validate.yml: 키워드 정합성/중복/출처/모델 범위/해시/승인 누락 검사. PR CI에서는 비밀키나 유료 생성을 사용하지 않는다.
- content-publish.yml: 명시한 승인 batch/release만 발행. 생성 잡이 자신의 콘텐츠를 approved로 바꾸지 않는다. 검수는 스튜디오의 이미지 미리보기와 조건별 표로 수행하며 Actions는 실행/검증/발행을 담당한다.
- schedule job은 충분히 미리 만든다. GitHub schedule 지연이 일일 미션 개시를 막지 않도록 날짜 전환은 서버가 Asia/Seoul 날짜로 처리한다.
- concurrency는 배치/작업 단위로 설정하되 DB 중복 claim도 필요하다. batch 예산/건수 상한을 DB에서 예약하고 Actions 재실행에서 유지한다.
- 정기 생성 시간/10일 재고 목표/예산 상한/자동 승인 허용 범위는 논의 후 확정한다. 이번 문서는 유료 자동 실행 승인이 아니다.

## 키와 권한

Gemini/OpenRouter 키는 Actions Secrets로만 공급한다. 기존 AIMI_GEMINI_API_KEY 재사용 가능하지만 제작 작업은 배치 한도를 별도로 기록한다. 스크립트는 process.env를 먼저 읽게 바꾸며 로컬 env 파일 경로에 의존하지 않게 한다.

앱 aimi_api는 승인 콘텐츠 읽기, 생성기는 초안/작업/에셋 쓰기, 발행기는 승인 상태 검증 및 calendar 발행을 분리한다. 기존 MIGRATION_DATABASE_URL을 상시 생성 작업의 기본 권한으로 쓰지 않는다. Supabase secret/service key는 Storage RLS를 우회하므로 비공개 실행 환경에만 두고, DB 쓰기 권한은 별도 제한 계정이나 검증된 서버 발행 API로 좁힌다. key 하나가 자동으로 RLS 제한을 받는다고 가정하지 않는다.

## 적용 순서

1. 현재 원격 migration/콘텐츠 상태 읽기 검증 + Day01/나머지 조건 검수 결정.
2. 스튜디오와 앱의 계약/스키마 통일 + 확정 일별 해설10개 작성.
3. 위5개 테이블과 기존 release 확장 migration 준비/테스트, 기존10개 데이터 이관안 검증.
4. 앱의 날짜 calendar 조회/버전 보존/캐시 재조회 추가. 배포마다 API 재시작해야만 새 콘텐츠가 적용되는 구조를 제거한다.
5. 로컬 생성→업로드→검수→발행 한 건 완결 후 Actions로 옮긴다.
6. 10일 묶음 workflow_dispatch 검증 후 정기 부족분 생성 활성화.

오늘 앱 출시 준비와 대규모 자동화는 분리한다. 현재 미검수 문제를 자동으로 approved 처리하는 대신 최소 승인분으로 출시 일정을 편성하고 나머지를 순차 확보하는 방식을 검토한다.

## 공식 자료

- GitHub schedule 지연/동시 실행: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows / https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Supabase Storage 권한: https://supabase.com/docs/guides/storage/security/access-control
