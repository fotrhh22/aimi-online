# Vercel 공유 테스트 데모 — 구현·배포 안내

2026-11-12. 기존 토스 앱과 같은 소스를 명시적인 web-demo 모드로 빌드한다. 운영 토스 로그인은 유지한다.

## 실제 구성

브라우저 → 같은 도메인의 `/api/demo/*` → 고정된 Render `/demo/*` → Supabase 테스트 저장소.

- 테스트 계정 자동 진입, 홈/계정 초기화,125EP·기본 보유품·예시 친구.
- 출석/팁·게임·챌린지·보상·상점·정원·소셜·개선기·추천은 기존 서버 로직과 실제 검수 콘텐츠를 사용한다. 실제 사용자 지갑/원장에는 쓰지 않는다.
- 모든 접속자가 계정 하나를 공유한다. 다른 사람이 초기화하면 이전 토큰은 차단한다. 같은 브라우저 탭은 storage 이벤트로 갱신하고, 다른 기기는 재요청/포커스 복귀 시 갱신한다.
- 토스 내비게이션·로그인·SafeArea·복사·공유를 웹에서 호출하지 않는다. 웹 뒤로가기/Clipboard/Web Share를 사용한다.
- 웹 세션 키 `aimi.web-demo.session`은 기존 토스/로컬 키와 구분한다.
- 프록시는 허용한 데모 경로·메서드만 전달하며 임의 upstream/운영 인증을 전달하지 않는다. upstream 고정,쿠키/Origin 전달 없음,응답 no-store,본문200KB 제한,32초 timeout. Render의 HTML 절전 응답도 JSON 오류로 변환한다.
- 프록시는 새 인증 수단이 아니다. 서버에 이미 공개된 공유 테스트 세션·HMAC·epoch·거래 검증·Gemini 한도를 그대로 사용한다. 별도 proxy secret은 추가하지 않았다.

## Vercel에서 할 일

1. https://vercel.com/new 에서 GitHub의 `fotrhh22/aimi-online`을 Import한다.
2. Root Directory는 저장소 루트(`.`). `apps/miniapp`으로 설정하지 않는다.
3. Framework Preset은 Other. `vercel.json`이 아래 설정을 제공하므로 중복 Override하지 않는다.
4. Node.js22.x 이상 지원 버전을 사용한다(프로젝트 Node22 기준).
5. 환경변수 추가 없이 Deploy한다. 완료된 `.vercel.app` URL을 연다.
6. 홈으로 자동 진입하는지, 출석/팁/게임/구매/정원/친구 방문을 확인한다. `테스트 초기화`는 모두가 공유하는 상태를 초기화한다.

|설정|값|
|---|---|
|Git branch|main|
|Install Command|npm ci|
|Build Command|npm run build:web-demo|
|Output Directory|apps/miniapp/dist|
|Functions|api/demo.js|
|Function region|sin1(Singapore)|
|환경변수|추가 필수값 없음|

Gemini 키/DB URL/서명키를 Vercel이나 VITE 변수에 복사하지 않는다. Render에 기존 키와 ENABLE_TEST_DEMO=true가 이미 설정되어 있다. Supabase migration 추가/수동 SQL 실행도 필요 없다.

## 빌드 구분

- `npm run build:web-demo`: VITE_APP_RUNTIME=web-demo, VITE_TEST_DEMO=true, AIMI_TEST_BUILD=true를 해당 프로세스에서만 설정하고 Vite 웹 파일 생성. API 주소는 동일 출처 `/api`로 고정.
- `npm run ait:build`: 정식 토스 빌드. web-demo 환경이면 실패하도록 가드한다.
- `npm run ait:build:test`: 토스 테스트 빌드. 런타임을 toss로 명시해 웹 설정과 혼용하지 않는다.
- .ait는 Vercel에 업로드하지 않는다. 웹 빌드는 소스/정적 파일과 Node 프록시를 배포한다.

## AI 한도

실제 Gemini 사용. 기존 공유 테스트 계정의20회/최근60분·최초 시작 후48시간을 그대로 사용한다. 기존 만료 시각은2026-11-13 23:08:51 KST다. Vercel 배포/초기화로 연장하지 않는다. 만료 후 게임/상점/콘텐츠는 계속 가능하며 AI만 차단된다.

## 검증과 남은 단계

로컬 웹 빌드·타입·기존108테스트·프록시4테스트·임시 PostgreSQL5테스트, 실제 built-web 브라우저 자동세션/웹메뉴/친구방문/새로고침/입력16px 검사. AI/EP/게임/챌린지의 기존 데이터를 원격 초기화하지 않았다. Vercel 프로젝트 연결·실제 URL 배포/플랫폼 rewrite 인수는 계정에서 Import 후 최종 확인해야 한다. 현재 Vercel 연결 도구/CLI 로그인은 제공되어 있지 않다.

파일: `vercel.json`, `api/demo.js`, `tools/build-web-demo.mjs`, `apps/miniapp/src/lib/runtime.ts`, `tools/qa/web-demo.test.mjs`, `tools/qa/web-demo-browser.mjs`.


## 원격 확인

- 구현 커밋 f2617016657bbd54caa8abbd397fadc134cb063f push 완료.
- CI43052821106 전체 성공: 기본 빌드/타입/108테스트/프록시4테스트/격리 웹빌드/migration2회/DB5테스트.
- Render dep-dbq8uso473hc73ae4le0 live. 테스트 출석·팁 보상 API 반영 완료.
- Vercel 프로젝트/실제 공개 URL은 아직 생성하지 않았다. 위 Import 절차로 계정 연결 후 배포한다.
