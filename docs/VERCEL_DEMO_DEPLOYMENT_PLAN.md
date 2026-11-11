> 2026-11-12 갱신: 아래는 초기 계획이다. 공유 계정·웹 모드·API 프록시 구현을 완료했다. 실제 설정·사용할 명령·변수는 [VERCEL_WEB_DEMO.md](VERCEL_WEB_DEMO.md)를 따른다. 새 proxy secret/ENABLE_DEMO 변수는 사용하지 않는다. 기존 ENABLE_TEST_DEMO와20회/48시간 정책을 재사용한다.

# Vercel 단일 테스트 계정 데모 배포 계획

2026-11-11. 사용자가 요청한 계획만 작성. 이번 단계에서 코드·DB·Render·Vercel 설정은 변경하지 않는다.

## 목표와 유지할 경계

- Vercel URL을 열면 로그인 없이 테스트 계정 하나로 바로 홈에 진입한다.
- 화면의 ‘테스트 초기화’ 버튼으로 EP·보유품·정원·미션·게임·챌린지·AI 화면을 최초 상태로 되돌린다.
- 동일 URL을 여는 모든 사람이 같은 테스트 계정을 공유한다. 누군가 초기화하면 다른 접속자의 화면도 최신 초기 상태로 갱신된다. 개인용 서비스가 아니라 시연용 링크다.
- 기존 토스 로그인 코드, 운영 /auth·/v1 API와 실제 사용자/EP 원장은 유지한다. 기존 토스용 .ait에 데모 모드를 포함시키지 않는다.
- Vercel은 프론트엔드와 서버 API 프록시, Render는 기존 도메인 로직, Supabase는 별도 데모 상태 저장을 담당한다. mTLS와 토스 로그인 없이 웹 시연을 제공한다.

## 권장 구성

브라우저 → Vercel /api/demo/* → Render /demo/* → Supabase 데모 전용 테이블.

- Vercel 서버 함수가 프록시를 담당한다. 서버 간 공유 비밀값은 서버 함수/Render 환경변수에만 보관하고 VITE_ 변수나 브라우저 번들에는 넣지 않는다.
- 단순 외부 rewrite만으로 비밀 헤더를 클라이언트에 노출하거나, 데모 세션으로 운영 /v1을 호출하게 만들지 않는다.
- 고정된 단일 데모 계정 ID는 서버가 결정한다. 클라이언트가 userId·계정 종류·초기 EP를 선택할 수 없다.
- Vercel의 함수 메모리/파일에 게임 상태를 저장하지 않는다. 새로고침·서버 재시작 후에도 Supabase의 데모 상태를 복원한다.
- 공개 웹의 내비게이션/복사/초대는 브라우저 기능을 사용한다. 토스 SDK의 계정·공유 API를 호출하지 않는다.

## Phase 1 — 데모 저장소와 계정

예정 파일:
- supabase/migrations/202611110007_demo_state.sql (착수 시 실제 미사용 migration 번호 확인)
- apps/api/src/modules/demo-repository.ts
- apps/api/src/services/demo/auth.ts
- apps/api/src/services/demo/register.ts

작업:
1. demo_states·demo_sessions·demo_usage 등 필요한 전용 테이블을 private aimi 스키마에 추가한다. PUBLIC/anon/authenticated 접근을 차단하고 서버 역할에 필요한 권한만 부여한다.
2. 기존 Repository 인터페이스에 맞는 데모 저장소를 구현한다. EP·원장은 데모 상태 안에서만 관리하고 운영 users/ep_wallets/ep_ledger에는 쓰지 않는다.
3. 초기 상태는125EP, 기본 캐릭터·일부 보유품·미션0회·샘플 친구1명으로 정한다. 샘플 친구도 데모 전용이며 실제 친구 코드와 연결하지 않는다.
4. 현재 FileRepository/prototype-server의 production/Render 차단은 유지한다. development=true를 만능 우회 스위치로 사용하지 않고 데모의 인증/저장/콘텐츠 선택을 명시적으로 주입한다.

완료 기준: 단일 계정으로 게임·구매·정원·소셜 시연이 가능하고 운영 원장에는 변경이 없다.

## Phase 2 — 세션과 초기화

예정 API:
- POST /demo/session: 단일 데모 계정에 대한 제한된 세션 발급.
- /demo/v1/*: 기존 기능 로직을 데모 저장소/인증으로 실행.
- POST /demo/reset: 데모 상태만 원자적으로 초기화하고 새 epoch·세션 반환.

초기화 동작:
- EP125·기본 보유품/캐릭터/정원 복원.
- 게임·챌린지·출석·팁·구매·친구 상태 복원.
- 입력문/결과/조합/게임 복구 키 등 데모 전용 브라우저 캐시 삭제 후 홈 이동.
- 진행 중인 게임·AI 응답이 초기 상태를 다시 덮어쓰지 않도록 epoch/revision을 검사한다.
- 동시 초기화/구매/보상 요청을 직렬화하고, 이미 초기화된 세션은 다시 데모 세션을 받아 복구한다.
- 실제 AI의 서비스 사용량·비용 상한 카운터는 초기화 대상에서 제외한다. 초기화를 반복해 유료 API를 무제한 호출할 수 없게 한다.

완료 기준: ‘테스트 초기화’ 한 번으로 재시작 가능하며 다른 탭/기존 응답이 새 상태를 오염시키지 않는다.

## Phase 3 — Vercel용 화면과 프록시

예정 파일:
- apps/miniapp/src/lib/runtime.ts: toss/local/demo 런타임을 명시적으로 구분.
- apps/miniapp/src/lib/toss/bridge.ts 및 app/context.tsx: demo에서 토스 로그인 대신 서버 세션 자동 복원.
- apps/miniapp/src/features/demo/reset-control.tsx: 홈/계정에서 접근 가능한 초기화 버튼.
- api/demo/[...path].ts: 목적지·허용 경로/메서드를 고정한 Vercel 프록시. 임의 URL 프록시 금지.
- vercel.json 및 데모 빌드 스크립트: 정적 에셋/API/SPA 경로 구분.

배포 설정안:
- Git 저장소: fotrhh22/aimi-online.
- Vercel 프로젝트 루트: 저장소 루트. 공유 workspace와 서버 함수가 포함되도록 한다.
- 빌드: 공유 패키지 빌드 후 miniapp Vite 빌드(데모 전용 명령 준비).
- Output Directory: apps/miniapp/dist.
- 웹 데모 빌드 모드와 토스 .ait 빌드 모드를 별도 명령으로 고정한다. 토스 빌드는 데모 플래그가 켜져 있으면 실패시킨다.

완료 기준: 주소 직접 열기/새로고침/하위 경로에서404가 나지 않고 로그인 없이 홈 진입.

## Phase 4 — 콘텐츠·AI·공유

- 현재 검수v3의 이미지10개·일별 해설·팁·요일별 게임 일정을 그대로 사용한다. 별도 이미지 생성 없음.
- 게임/챌린지/상점/정원은 운영과 같은 판정 코드를 사용하되 재화는 데모용이다.
- 모델 목록/가격/성능 snapshot과 추천 계산을 재사용한다.
- 프롬프트 개선/업무 분석은 실제 Gemini를 사용할 수 있도록 연결하되, 데모 전체의 독립된 시간당 상한·48시간 이용 기간을 적용한다. 예시 응답으로 대체할 경우 화면에 명시한다. 실제/예시 모드는 배포 기록에 구분한다.
- 소셜은 예시 친구와 방문 UI를 확인하는 범위다. 모든 접속자가 같은 계정이므로 서로 다른 두 사람의 실제 친구 관계 테스트는 이 데모의 완료 조건이 아니다.
- 공유 링크는 Vercel 웹 주소로 복사/공유한다. 토스 딥링크와 혼용하지 않는다.

## 환경변수 계획

|위치|변수|내용|
|---|---|---|
|Vercel 빌드|VITE_APP_RUNTIME|demo|
|Vercel 빌드|VITE_API_BASE_URL|/api/demo|
|Vercel 서버 함수|AIMI_DEMO_API_ORIGIN|https://aimi-online-api.onrender.com|
|Vercel 서버 함수·Render|AIMI_DEMO_PROXY_SECRET|새로 생성해 양쪽 서버에만 등록하는 동일한 난수|
|Render|ENABLE_DEMO|true. 별도 /demo 경로만 허용|
|Render|DEMO_GEMINI_HOURLY_LIMIT|데모 전체의 Gemini 호출 상한20회/최근60분|
|Render|DEMO_GEMINI_STARTS_AT|실제 데모 공개 시 확정할 ISO8601 시작 시각|
|Render|DEMO_GEMINI_ENDS_AT|시작 시각+48시간. 이후 Gemini 호출 차단|

기존 DATABASE_URL/SESSION_SIGNING_KEY/AIMI_GEMINI_API_KEY는 서버에서 재사용 가능. 서버 키를 Vercel 브라우저 환경변수에 복사하지 않는다. 이름/추가 변수는 구현 후 최종 확정한다. ENABLE_DEV_AUTH는 false 유지.

## Phase 5 — 검증·배포

1. 토스 운영 인증과 demo 세션의 상호 사용 차단 테스트.
2. 초기화·중복/동시 요청·이전 게임/AI 응답의 epoch 불일치·재화 복원 테스트.
3. 초기화를 반복해도 실제 AI 상한을 우회하지 못하는지 확인.
4. Vercel 번들에 서버 비밀값이 없는지 확인.
5. 모바일 브라우저에서 홈→게임→챌린지→보상→구매→정원→초기화 확인.
6. 기존 토스 빌드/인증 테스트 회귀 검사.
7. 데모 migration→Render 데모 경로→Vercel 프로젝트 순서로 배포하고 URL과 실제/예시 기능 구분 보고.

## 참고

- https://vercel.com/docs/functions
- https://vercel.com/docs/routing/rewrites
- https://vercel.com/docs/environment-variables

현재 로컬 prototype-server는 Render에서 실행이 금지돼 있다. 기존 제한을 제거해 원격 개발 로그인을 열어두는 방식으로 배포하지 않는다.

## Gemini 임시 운영 정책 — 2026-11-11 사용자 추가 요청

- 초기 제안값은 데모 전체 합산20회/최근60분. 프롬프트 개선·추천 업무 분석이 같은 카운터를 공유한다. 화면에 남은 횟수와 다음 이용 가능 시간을 표시한다. 토스 운영용 기존 카운터는 변경하지 않는다.
- 48시간은 문서 작성/코드 구현 시점이 아니라 실제 Vercel 데모 공개 시점부터 계산한다. 공개 시 starts_at/ends_at을 확정하며 서버 시각으로 판정한다. 지금 임의로 만료 타이머를 시작하지 않는다.
- 최근60분 이동 구간으로 검사해 정각 직전/직후 몰아쓰기 방지. 서버에서 외부 요청 직전에 원자적으로 호출 자리를 예약한다. 동시 요청도 상한을 넘을 수 없다.
- 실제 Gemini로 전송한 요청은 성공/실패와 무관하게1회 계산한다. 재시도도 별도 외부 호출이면1회. 입력 검증 실패·캐시 재조회·탭/등급 전환처럼 Gemini를 호출하지 않는 작업은 제외한다.
- 모델 목록 조회·코드 기반 비용 계산·사전 생성된 챌린지 이미지/키워드 판정은 Gemini 한도를 쓰지 않는다.
- 사용량/시작·종료 시각은 서버·DB에 저장한다. 테스트 초기화·브라우저 캐시 삭제·서버 재시작으로 카운터나48시간을 연장할 수 없다.
- 기간 종료 후 개선/업무 분석은 ‘테스트 이용 기간이 끝났어요’로 차단한다. 제한을 제거해 무제한 호출로 전환하지 않는다. 나머지 게임/정원/콘텐츠 조회는 계속 가능하다.
- 최대 이론 호출량은20×48=960회지만 실제 비용은 모델/입출력 길이/실패 과금에 따라 달라진다. 기존 입력·출력 토큰 제한과 타임아웃도 유지한다.
- 이번 변경은 데모 계획만 수정한 것이다. 실제 Render 환경변수·코드·DB 제한은 아직 적용하지 않았다.
