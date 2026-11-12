# 토스 익명 사용자 인증 전환

작성: 2026-11-12 Asia/Seoul. 비게임/웹 미니앱에서 SDK 사용자 식별키 인증 코드를 사용한다. 토스 OAuth 로그인 동의 절차와 별개다.

## 구현 상태

- SDK3.10.0에 `User.createAnonymousKeyAuthCode()`와 `{code, expiresIn}` 타입이 이미 존재한다. SDK 업그레이드는 하지 않았다.
- 시작하기 → SDK 일회용 코드 → Render `POST /auth/anonymous` → 토스 mTLS 교환 → 내부 UUID/세션 발급 → 기존 홈·EP·정원·친구 로직 사용.
- 토스 공식 응답의 `success.anonKey`만 사용한다. 클라이언트가 `anonKey`, userId, 잔액을 보내는 인증 요청은 거부한다.
- 원본 식별키/인증 코드/토스 OAuth 토큰을 신규 익명 계정 DB에 저장하지 않는다. `toss-anon:` 도메인으로 HMAC-SHA256 처리한 키만 저장한다. 기존 `SESSION_SIGNING_KEY`를 임의로 교체하면 같은 사용자의 식별 매핑도 달라지므로 유지한다.
- 세션은 기존과 동일한1시간. 유효한 세션으로는 토스 인증 API를 반복 호출하지 않는다. 만료401이면 새 코드를 얻어 세션을 갱신하고 실패했던 요청을1회만 재전송한다. 병렬401은 하나의 인증을 공유한다. 변경 요청의 Idempotency-Key는 보존한다.
- SDK 응답 대기는10초, 토스 서버 교환은15초. 유효하지 않은 코드4011이면 새로운 코드를1회 더 발급한다. 네트워크/5xx/한도4095에는 자동 반복하지 않는다. HTTP200이라도 `resultType`이 SUCCESS가 아니면 실패다.
- 계정 삭제는 기존 서버 삭제 경로를 사용한다. 익명 계정에는 OAuth 연결 해제 API를 호출하지 않는다. 삭제 후 다시 시작하면 새 내부 계정이 생긴다.

## 기존 계정과의 관계

- `aimi.users.id`와 기존 EP/정원/소셜 외래키를 그대로 유지한다.
- migration0008은 `toss_anon_key` 유일 컬럼을 추가하고 식별 조건을 `num_nonnulls(toss_user_key, dev_subject, toss_anon_key)=1`로 확장한다.
- 기존 토스 로그인과 익명 식별키가 같은 사람인지 추측해서 합치지 않는다. 기존 `/auth/toss`, OAuth refresh/unlink 콜백은 서버 호환용으로 유지한다. 기존 OAuth 세션이 만료되면 시작 화면에서 새 익명 방식으로 진입하며, 이전 OAuth 기록을 자동 이전하지 않는다.
- 새 실제 계정의 지갑 초기값은 기존 운영 정책0EP다. 공유 데모의125EP·예시 친구·초기화 기능은 가져오지 않는다. 개인 Vercel 코드 계정도 별도 저장소를 유지한다.
- 자동 복구는 새 익명 세션에만 적용한다. 브라우저의 `aimi.session.kind=anonymous`는 자동 복구 방식 표시이며 사용자 인증 근거가 아니다. 서버는 항상 세션과 토스 교환 결과를 검증한다.

## 수정 파일

- 공유 계약: `packages/contracts/src/auth.ts`
- SDK/갱신: `apps/miniapp/src/lib/toss/bridge.ts`, `apps/miniapp/src/lib/api/client.ts`, `session-recovery.ts`
- 서버: `apps/api/src/services/toss/anonymous.ts`, 공통mTLS `client.ts`, 기존OAuth `auth.ts`
- migration: `supabase/migrations/202611120008_anonymous_auth.sql`

## 운영 반영 순서

새 `.ait`만 올려서는 인증되지 않는다. 2026-11-13 운영 DB migration0008은 적용했다. Render 인증서·환경변수 등록은 사용자가 직접 수행하며 에이전트는 변경하지 않는다. 최신 완료/대기 상태는 NONGAME_RELEASE_HANDOFF_20261113.md를 따른다.

1. 운영 migration 전 DB 백업/복원 지점을 확인한다. 기존 admin 연결을 보관한 `apps/api/.env.local`의 `MIGRATION_DATABASE_URL`로 프로젝트 루트에서 `npm run db:migrate`를 실행한다. 런타임 `DATABASE_URL`로 DDL하지 않는다. 기존 migration 파일은 수정하지 않는다.
2. Render AIMI API 서비스의 Environment → Secret Files에 `AIMI_mTLS_public.crt`, `AIMI_mTLS_private.key`를 등록한다. 콘솔의 같은 AIMI 앱에서 발급된 인증서여야 한다. 인증서 내용을 Git/.ait/Vercel에 넣지 않는다.
3. Render 환경변수:

| 이름 | 값/처리 |
|---|---|
| TOSS_CLIENT_CERT_PATH | /etc/secrets/AIMI_mTLS_public.crt |
| TOSS_CLIENT_KEY_PATH | /etc/secrets/AIMI_mTLS_private.key |
| DATABASE_URL | 기존 제한된 API용 연결 유지 |
| SESSION_SIGNING_KEY | 기존 값 유지 |
| ENABLE_DEV_AUTH | false |
| CORS_ALLOWED_ORIGINS | 실제 appName에 맞는 토스 운영·QR 주소 추가, 기존 필요한 주소 유지 |
| AIMI_GEMINI_API_KEY | 기존 서버 값 유지 |

현재 appName은 `aimi`. SDK3.1+의 운영/QR origin은 `https://aimi.apps.tossmini.com`, `https://aimi.private-apps.tossmini.com`다. 콘솔 등록명과 대조한다. 기존 Vercel 데모가 사용 중이면 `ENABLE_TEST_DEMO`는 유지할 수 있으며 일반 `.ait`에는 테스트 버튼이 포함되지 않는다. `TOSS_UNLINK_BASIC_AUTH`는 기존 OAuth 콜백용으로, 익명 인증에는 필요하지 않다.

4. API 새 코드를 Render에 배포하고 readiness와 오류 로그를 확인한다. 마이그레이션보다 먼저 인증 트래픽을 새 API로 보내지 않는다.
5. `.ait` 생성: `VITE_APP_RUNTIME=toss VITE_TEST_DEMO=false VITE_API_BASE_URL=https://aimi-online-api.onrender.com npm run ait:build`. 별도 보관 파일은 `output/releases/toss-anonymous/AIMI_ANONYMOUS_AUTH.ait`다. 공유 테스트 `.ait`와 구분한다.
6. 기존 콘솔 AIMI 앱에 새 번들을 올리고 QR로 실제 토스에서 시작/종료/재접속, 사용자2명, 친구 코드·수락·방문을 확인한다. 실기기에서 코드교환에 성공하기 전 실제 연동 완료라고 하지 않는다. 인증코드/anonKey/개인키를 로그로 남기지 않는다.

## 검증과 한계

- 서버112개, 클라이언트/웹·정책20개, 격리 PostgreSQL 통합7개 통과. 실제 인증서 대신 테스트 전송 어댑터를 사용한 mTLS 옵션/고정경로/일회용코드 실패 검증을 포함한다.
- 기존 회원·잔액을 둔 migration 업그레이드와 기존 제한 API 역할 권한을 임시DB의 rollback 트랜잭션으로 검증했다. migration 재실행도8개 모두 Unchanged였다.
- 일반 `.ait` 생성과 웹데모 빌드 성공. 익명 인증 경로 포함/공유 테스트 시작 버튼 제외/클라이언트 비밀값 검사 통과. artifact 해시·크기는 같은 출력 폴더의 `validation.json`에 기록했다.
- 실제 로컬DB에서 동시 첫 접속의 계정 유일성, 다른 사용자0EP, 출석 보상 보존, 재접속, 세션 만료·재발급, 친구 요청/수락/정원 방문, 계정 삭제, 이전OAuth 콜백과 Vercel 데모 격리를 확인했다.
- 운영 Supabase migration0008은2026-11-13 적용했다. 토스 실제 SDK·인증서 코드교환, 콘솔 업로드·심사·출시는 미검증이며 Render 코드 배포 결과는 최신 인수 기록을 따른다.

## 공식 근거

- https://developers-apps-in-toss.toss.im/guide/authentication/anonymous-key-auth-code
- https://developers-apps-in-toss.toss.im/api/user-key
- https://developers-apps-in-toss.toss.im/documentation/integration/server-api
