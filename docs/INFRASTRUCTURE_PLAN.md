> **초기 설계·계획 기록.** 현재 AIMI는 앱인토스 배포 완료 상태다. 아래의 개발 착수점·미구현·배포 대기 표현은 작성 당시 기준이다. 현행 상태는 [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md), 현재 기능은 [README](../README.md), 업데이트 절차는 [DEPLOYMENT.md](DEPLOYMENT.md)를 우선한다.

# AIMI 환경변수·Supabase·Render 구축 계획

작성: 2026-11-08, Asia/Seoul. **설계 및 사전 점검 보고이며, 서비스 생성·DB 적용·배포 완료가 아니다.** 제품 규칙은 DEVELOPMENT_SPEC.md를 따른다.

추가 계획: [API·Gemini $200·Actions・게임 저장소](API_AND_GAME_RESOURCES_PLAN.md). 월 예산·차단 비율, 데이터 API endpoint·재시도 설정, 실제 비밀 보관 위치는 이 추가 계획과 예제 파일을 함께 따른다.

## 1. 확인한 현재 상태

| 항목 | 확인 결과 | 다음 작업 |
|---|---|---|
| 클라이언트 | React 18 / TypeScript / Vite 7 / 앱인토스 SDK 3.10.0. 홈·출석·팁 미리보기 | 라우팅·공식 TDS·서버 연결 |
| 환경변수 | `apps/miniapp/.env.example`에 공개 API URL만 존재. 실제 env 파일은 폴더 내 검색에서 발견하지 못함 | 용도별 예제 제공 → 비밀 저장소에 실제 값 입력 |
| API | `apps/api/README.md`만 있음. 실행 코드·package·명령 없음 | Fastify API workspace 구성 |
| DB | migration·클라이언트·스키마 없음 | AIMI 전용 Supabase 프로젝트 신규 구성 |
| Render | 사용자 확인한 `My Workspace` 조회. 기존 `k9-data-chat-api`, `kbo-relay-api` 2개, AIMI 서비스 없음 | 기존 서비스와 별개로 AIMI Web Service 구성 |
| Git | Git 루트는 부모 `esg_campaign`, AIMI 폴더는 현재 untracked | 배포 전 추적·저장소·배포 브랜치 확정 |
| 검증 | 이번 점검의 `npm run build` 성공(TypeScript 검사 포함) | 서버·DB가 생기면 별도 검증 |

Supabase 프로젝트는 사용자 답변에 따라 신규 구성 전제다. 현재 Supabase 연결 도구가 없어 계정 내 프로젝트·리전·키를 직접 조회하지 않았다. Render 조회만 수행했으며 서비스·환경변수는 변경하지 않았다. Node 실행 환경은 v26.8.1이고 프로젝트는 Node 22.12 이상 LTS를 권장하므로, 실제 CI/호스팅은 검증한 LTS 한 버전으로 통일한다.

## 2. 배치 구조 제안

```text
앱인토스 미니앱(.ait, React)
  └─ HTTPS / 자체 사용자 세션 → Render AIMI API(Fastify)
       ├─ SQL 트랜잭션 → Supabase PostgreSQL
       ├─ 승인 에셋 관리 → Supabase Storage
       ├─ 토스 서버 로그인 교환·연결 해제 처리
       └─ 개선·업무 분석 → Gemini

GitHub Actions / 수동 모델 수집 → 검증된 DB 스냅샷 발행
콘텐츠 제작 CLI → 운영자 검수 → 버전 콘텐츠·승인 에셋 등록
```

미니앱 본체는 앱인토스 배포 경로를 사용하고 Render는 API를 맡는다. 초기 필수 인프라는 API 1개와 Supabase DB/Storage다. Redis·별도 Render PostgreSQL·GPU·별도 프론트 호스팅은 현재 요구에 필요하지 않다. AI 작업은 DB에 저장하고 API 프로세스의 lease 기반 실행 루프로 시작한다. 상시 작업이 필요해지면 worker 분리 여부를 재검토한다.

개발은 로컬 API + 로컬 PostgreSQL/Supabase 또는 전용 개발 프로젝트로 진행한다. 외부 테스트와 운영은 DB·비밀·인증 설정을 분리한다. 기존 캠페인 DB·부모 `.env`·기존 Render 서비스는 사용하지 않는다.

## 3. 환경변수 계약 제안

아래 이름은 **향후 구현할 프로젝트 설정 계약**이다. 현재 앱이 자동으로 읽거나 검증하는 기능은 아직 없다. 비밀값은 문서·채팅·커밋에 넣지 않는다. 예제는 `apps/api/.env.example`, `tools/model-sync/.env.example`에 둔다.

| 위치 | 변수 | 준비 내용 / 적용 시점 |
|---|---|---|
| 미니앱 빌드 | `VITE_API_BASE_URL` | 로컬 API 또는 해당 환경의 HTTPS API 주소. 현재 소스에서 아직 사용하지 않음 |
| API | `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL` | 로컬 8080, Render는 플랫폼 `PORT` 사용·`0.0.0.0` 바인딩 |
| API | `DATABASE_URL` | 런타임 전용 PostgreSQL 역할·연결 문자열, 암호·TLS 포함 |
| DB 작업 | `MIGRATION_DATABASE_URL` | DDL 권한을 가진 migration 전용 연결. 일반 API 요청에서 사용 금지 |
| API/콘텐츠 도구 | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Storage 등 Supabase 서비스 사용 시 서버에서만 사용 |
| API | `SESSION_SIGNING_KEY` | 충분한 난수 비밀. 세션 검증·회전 정책 구현 |
| API | `CORS_ALLOWED_ORIGINS` | 로컬·실제 샌드박스·출시 origin을 정확히 확인 후 목록 허용 |
| API | `TOSS_CLIENT_CERT_PATH`, `TOSS_CLIENT_KEY_PATH` | 토스 서버 인증용 파일 경로 제안. 정확한 인증 방식은 최신 연동 문서·콘솔에서 추가 확인 |
| API | `TOSS_USERINFO_DECRYPTION_KEY` | 암호화 사용자 정보를 사용하는 경우 콘솔에서 발급받는 복호화 키 |
| API | `TOSS_UNLINK_BASIC_AUTH` | 연결 해제 콜백 검증용 자격정보. 콘솔 등록값과 서버 검증 규약 일치 |
| API | `AIMI_GEMINI_API_KEY`, `GEMINI_TEXT_MODEL` | 실제 사용 가능한 텍스트 모델 ID·키. 모델명을 목업에서 복사하지 않음 |
| API | `OPTIMIZER_DAILY_LIMIT`, `RECOMMENDATION_DAILY_LIMIT` | 사용자별 호출 한도. 게임/챌린지 각 5회와 별개 |
| API | `LLM_REQUEST_TIMEOUT_MS`, `LLM_MAX_INPUT_CHARS`, `LLM_MAX_OUTPUT_TOKENS`, `LLM_MAX_RETRIES` | 입력·출력·재시도·시간 제한 |
| API | `LLM_DAILY_BUDGET_USD`, `PROMPT_RETENTION_HOURS` | 전체 지출 상한·원문 보존. 실제 정책 확정 후 설정 |
| 수집 작업 | `ARTIFICIAL_ANALYSIS_API_KEY`, `OPENROUTER_API_KEY` | 사용하는 경로·플랜에서 요구할 때만 설정 |
| 수집 작업 | `MODEL_SYNC_DATABASE_URL` | 모델 staging·발행에 필요한 제한된 DB 권한만 부여 |

Supabase의 최신 공식 문서는 신규 서버 통합에 `sb_secret_...` secret key를 권장한다. 기존 명세의 `SUPABASE_SERVICE_ROLE_KEY` 제안을 `SUPABASE_SECRET_KEY`로 갱신한다. 이는 Supabase HTTP 서비스 키이며 **PostgreSQL 비밀번호·`DATABASE_URL`과 다르다**. 미니앱에서 Supabase 직접 접근을 하지 않으므로 클라이언트 publishable key도 기본 구성에는 필요 없다. secret key는 RLS를 우회하므로 API 자체에서 사용자·소유권을 반드시 검사한다. [공식 API 키 문서](https://supabase.com/docs/guides/getting-started/api-keys)

`VITE_*` 값은 앱 번들에 공개된다. API 주소 변경은 미니앱 재빌드·재배포에 반영해야 한다. mock 로그인은 로컬 전용 어댑터로 구현하고 운영 환경에서 활성화할 수 없게 한다. 보상·가격·게임 예산·판정 기준은 환경변수가 아니라 **버전 정책 데이터**로 관리한다.

## 4. Supabase 구축 순서

1. AIMI 전용 프로젝트 생성 대상·소유 조직·리전을 확정한다. Render와의 왕복 지연, 데이터 보관 요구를 함께 확인한다. 현시점 비용·플랜은 생성 시 확인한다.
2. 프로젝트 URL, 서버 secret key, DB 비밀번호·Connect 문자열을 비밀 저장소에 등록한다. 별도 런타임 역할과 migration 역할을 만든다.
3. 로컬에서 migration과 검수 seed를 작성·검증한 후 전용 개발 DB부터 적용한다. 운영은 적용 이력·백업·복원 절차를 갖추고 진행한다.
4. API 런타임 연결은 네트워크에 따라 선택한다. IPv6 또는 IPv4 add-on으로 접근 가능하면 direct, IPv4 환경이면 Supavisor **session pooler**를 우선 검토한다. migration은 direct 우선이며 IPv4 환경에서 session 방식의 도구 호환성을 검증한다. transaction pooler 사용 시 prepared statement 등 제약을 별도 처리한다. 호스트는 추측하지 않고 Connect에서 복사한다. [공식 연결 문서](https://supabase.com/docs/guides/database/connecting-to-postgres)
5. 서버 SQL 전용 테이블은 비공개 스키마·최소 권한으로 구성하고 공개 Data API 노출을 제한한다. 노출 스키마의 테이블은 RLS·grant를 검증한다. 토스 자체 세션이 자동으로 Supabase Auth/RLS 사용자로 매핑되는 것은 아니다.
6. 공개 Storage에는 승인된 목표·결과·상품 에셋만 발행한다. 미검수 원본은 비공개 bucket에 두고 정원·친구 관계·프롬프트는 공개 파일로 저장하지 않는다. 발행 후 경로는 버전별 불변으로 둔다.
7. 연결·TLS·트랜잭션·동시성·migration 재현과 백업 복원을 확인한다. Storage 에셋 백업은 DB 백업과 별도로 확인한다.

초기 migration 분할 제안:

| 순서 | 테이블 / 책임 | 필수 제약·검증 |
|---|---|---|
| 001 계정·공통 | users, sessions, idempotency_requests | 토스 연결 ID 유일, 세션 만료·취소, 사용자/작업/키 유일·요청 해시 |
| 002 경제 | ep_wallets, ep_ledger, daily_reward_claims | 정수 EP·잔액 음수 금지, 이벤트 유일, 사용자/한국 날짜/보상 유형 유일 |
| 003 일일 콘텐츠·게임 | 버전 정책, daily_missions, challenge_versions, keyword_cards, conditions, challenge_model_options, result_variants, game_plays, daily_progress, challenge_attempts | 일정 날짜 유일, 버전 고정, 게임/챌린지 각각 5회, 승인 이미지 커버리지 |
| 004 꾸미기·소셜 | item_catalog, inventory, gardens, friend_codes, friendships, invites, blocks | 소유품 유일·잔액 동시 차감, revision, 친구 쌍 유일·본인 금지·차단 검사 |
| 005 AI·지표 | optimizer_jobs, task_analyses, recommendation_jobs, ai_usage_events, model_registry, model_mappings, data_snapshots, benchmark_values, prices, sync_runs, recommendation_policies | 작업 lease·재시도, 호출/지출 예약·정산, 스냅샷 원자 교체·결측 보존 |

전체 테이블을 먼저 만드는 대신 개발 단계에 맞춰 적용한다. 잔액/원장/구매품, 시도/횟수/예산/보상은 각각 하나의 SQL 트랜잭션으로 확정한다. 한국 날짜는 서버에서 산출하고 같은 행에 대한 잠금·유일 제약으로 중복과 동시 요청을 막는다. 외부 AI 호출 대기는 트랜잭션 밖에서 처리한다.

## 5. Render 구축 순서

1. **저장소부터 확정:** 현재 AIMI는 독립 Git 저장소가 아니다. 별도 저장소로 분리할지 부모 저장소 내 `aimi-online` 경로로 배포할지 정한다. 기존 변경을 임의 커밋하거나 부모 서비스를 수정하지 않는다.
2. API와 contracts를 npm workspace에 등록하고 서버 build/start 스크립트를 만든다. 지금은 루트 `build`가 미니앱만 빌드하므로 API 배포 명령으로 사용할 수 없다.
3. AIMI용 Web Service를 생성한다. 기존 두 Python 서비스의 설정·키·DB는 복사하지 않는다. Root Directory는 부모 저장소 유지 시 `aimi-online`, 별도 저장소면 저장소 루트다.
4. 제안 명령은 `npm ci` 후 contracts → API 빌드, 시작은 API workspace start다. **아직 존재하지 않는 명령이므로 서버 구현 후 정확한 명령을 확정한다.** workspace 잠금 파일·빌드 의존성 설치를 확인한다.
5. 서버는 `0.0.0.0`과 Render `PORT`로 바인딩하고 `/health/live`와 DB readiness용 `/health/ready`를 구현한다. 플랫폼 health check와 외부 점검에 각각 어떤 경로를 쓸지 정한다. [공식 Web Service 문서](https://render.com/docs/web-services)
6. 서버 비밀은 해당 환경 서비스에 저장한다. 인증서 사용이 확인되면 Secret Files로 등록하고 `/etc/secrets/<filename>` 경로를 사용한다. [공식 환경변수·Secret Files 문서](https://render.com/docs/configure-environment-variables)
7. 스키마 migration은 동시 실행을 막는 단일 릴리스 단계로 수행한다. 애플리케이션 재시작마다 자동 DDL을 실행하지 않는다. 이전 클라이언트와 호환되도록 확장→전환→정리 순서를 사용한다.
8. 개발/스테이징 배포에서 DB 연결·로그인·AI·재시작 후 작업 복구를 확인하고 실제 토스 테스트를 진행한다. 운영 배포는 별도 요청에 따라 진행한다.

개발 실험은 Free 검토 가능하지만 **운영은 상시 실행 가능한 compute plan을 선택**한다. Free는 유휴 시 중지되므로 로그인 응답과 API 내부 작업 루프의 상시 처리를 보장할 수 없다. 정확한 금액·플랜은 생성 시 확인한다. 영속 데이터와 작업 상태는 Render 로컬 파일이 아닌 Supabase에 둔다. [Free 제한](https://render.com/docs/free)

## 6. 토스·AI 연결의 선행 항목

- 실제 콘솔 appName과 게임/비게임 분류, 필요한 SDK 권한, 로그인 약관·scope를 확인한다. 현재 `aimi`는 임시값이다.
- 토스 로그인 코드 교환 → 내부 user_id → 자체 세션 → 연결 해제 콜백·탈퇴·세션 폐기까지 구현한다. 공식 로그인 소개에서 복호화 키·콜백 설정은 확인했다. mTLS 등 **세부 서버 연동 문서의 기존 링크는 조회 실패**했으므로 인증서 발급·요청 필드는 구현 착수 시 공식 문서/콘솔로 재확인해야 한다. [로그인 소개](https://developers-apps-in-toss.toss.im/guide/authentication/intro.md)
- Gemini 모델 ID·구조화 출력 지원·실제 사용 가능 여부는 사용할 계정에서 확인한다. 미설정이면 AI 기능만 명시적인 사용 불가 상태로 제공하고 게임·정원 API를 중단시키지 않는다.
- AA/OpenRouter 플랜·응답 스키마·데이터 사용 조건을 확인한 후 수집한다. 지금은 계정 응답을 검증하지 않았으며 모델 지표 seed를 목업 수치로 채우지 않는다.

## 7. 설정 준비의 완료 조건

- 전용 개발 DB에 migration·seed가 재현되고 API가 TLS로 연결된다.
- 설정 스키마가 필수값 누락을 시작 시 설명하고 로그에서 키·인가 코드·프롬프트를 제거한다.
- 테스트용 로그인과 운영 로그인 경계, 실제 origin, 서버 세션이 검증된다.
- 중복 보상·동시 구매·마지막 시도 동시 제출·서버 재시작 복구 통합 테스트가 통과한다.
- API URL이 반영된 미니앱 번들로 토스 샌드박스 테스트를 수행한다.

현재 완료한 것은 현황 점검·설계·예제 파일 준비다. 위 완료 조건은 아직 충족하지 않았다.
