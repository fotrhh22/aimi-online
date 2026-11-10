## 원격 반영 — 2026-11-11

Render API: https://aimi-online-api.onrender.com · 배포 코드 c58ae4d · GitHub CI 전체 통과.

Supabase에서 오늘의 팁10개·요일별 게임·이미지 챌린지10개를 읽는다. 챌린지는 제출당30예산, 첫 실패 정답 수/두 번째 실패부터 선택 오답, 예산상 마지막 실패 또는 성공 후 정답·원문·팁 공개다. 미검수 미리보기 콘텐츠이며 승인/정식 출시와 구분한다.

새 번들은 apps/miniapp/aimi.ait. 토스 콘솔 업로드·실제 로그인/기기 검증은 아직 진행하지 않았다. 자세한 상태는 docs/IMPLEMENTATION_STATUS.md와 output/releases/DEPLOYMENT_20261111.json에 기록했다.

현재 제공 범위는 **텍스트·이미지·영상**입니다. 2026-11-11 기준 제공 상태/작업 유형 정책 적용 후 텍스트144개·이미지45개·영상25개를 노출합니다. 음악·음성 등은 제외했습니다. 이미지45개는 1차 검토 후보이며 생성 성공 검증 수가 아닙니다. 종료 예정은 안내와 함께 표시하되 신규 추천에서 제외합니다. [모델 전수 감사](docs/MODEL_LIFECYCLE_AUDIT.md)를 우선 참고하세요. 아래399개 설명은 감사 전 수집 이력입니다.

현재 모델 추천은 **출력 형태 → Small/Medium/High → 분야별 조건·비용 비교** 순서입니다. 기존 텍스트156개와 비텍스트243개를 합쳐399개를 탐색하며, 이미지61개·영상33개에는 별도 제작 단가/지원 조건을 표시합니다. 생성 품질 실측 순위와 공개 가격 후보를 구분합니다. 자세한 범위·제한·명령은 [멀티모달 추천](docs/MULTIMODAL_RECOMMENDATION.md)을 참고하세요.

# AIMI

게임으로 프롬프트 예산을 모으고, 이미지 챌린지·프롬프트 개선·AI 모델 비교와 정원 꾸미기를 경험하는 **앱인토스 WebView 미니앱**입니다. React/TypeScript 프론트엔드, Fastify API, Supabase PostgreSQL을 사용합니다.

현재는 프로토타입과 운영 연동 코드가 구현된 개발 단계입니다. 로컬 기능 테스트·번들 생성과 실제 토스 로그인·실기기 검증·출시 승인은 별개입니다. 최신 구현/제한 사항은 [구현 상태](docs/IMPLEMENTATION_STATUS.md)를 확인하세요.

## 빠른 실행

Node.js 22.12 이상과 npm이 필요합니다. 저장소 루트에서 실행합니다.

```bash
npm ci
AIMI_AI_MODE=fixture npm run dev
```

- 프론트엔드: http://127.0.0.1:5180
- 로컬 개발 API: http://127.0.0.1:8081 (`/api` 프록시)
- 개발 사용자 이름으로 로그인합니다. 기본125EP와 일부 보유품은 테스트용입니다.
- 서버 재시작 시 EP·보유품·진행·세션이 초기화됩니다. 새로고침만 하면 같은 서버의 상태를 유지합니다.
- 종료: 실행 터미널에서 `Ctrl+C`. API 코드를 수정했다면 개발 서버를 재시작합니다. 프론트 HMR만으로 실행 중 API 코드가 바뀌지는 않습니다.
- 포트 충돌이 발생하면 기존 개발 서버를 종료한 뒤 실행하세요.

로컬 실행은 외부 DB·토스 인증서 없이 가능합니다. 실제 Gemini를 사용하려면 API 환경변수를 설정하고 `AIMI_AI_MODE=fixture`를 빼고 실행합니다. 예시 AI 응답은 실제 모델 응답으로 표시하지 않습니다.

## 구현된 기능

|영역|내용|
|---|---|
|홈·미션|EP·출석·오늘의 팁·일일 진행 상태|
|게임|길 건너기·Dino·Temple Run형,30Hz 결정적 시뮬레이션·서버 replay·100점 완주|
|챌린지|키워드 선택/조합·예산·모델 등급·서버 규칙 판정·보상|
|정원·상점|아이템34종·캐릭터14종, 수량 구매·잔여 수량·드래그 자유 배치·저장|
|소셜|친구 코드·요청·수락·삭제·공개 정원 방문·누적 챌린지 성공|
|프롬프트 개선|기존 의도 개선·확장·편집·복사·기능별 일일 한도|
|모델 추천|업무 분석·등급별 목록·검증된 후보 중 비용순 최대3개·상세 근거|
|운영 기반|토스 로그인/세션·PostgreSQL 지갑/EP 원장·migration·Render API 연결 코드|

이미지 챌린지 채점은 LLM이 아닌 조건 매칭 규칙입니다. 목표/결과 이미지는 사전 제작 자료를 조회합니다. 만점은 무한 점수/보상 획득을 막으며 게임 EP는 플레이7·일15 상한입니다.

## EP 보상·상점 정책 (확정)

정책 버전은 `aimi-economy-v3`이며 금액의 공통 원본은 `packages/contracts/src/economy.ts`입니다. **새 정책 기준 하루 최대34EP**입니다.

|획득 경로|지급 규칙|하루 최대|
|---|---|---:|
|출석|한국 날짜 기준 하루1회|3EP|
|오늘의 팁|한국 날짜 기준 하루1회|1EP|
|게임|판마다 코인4~7개, 실제 접촉1개당1EP·하루5회|15EP|
|챌린지|하루 최초 성공 기본10EP + 절약 보너스0~5EP|15EP|
|합계||**34EP**|

```text
게임 EP = min(실제로 획득한 코인 수, 7, 오늘 남은 게임 보상 한도15)
챌린지 성공 EP = 10 + min(5, floor(max(0, 예산 - 선택 비용) × 0.1))
```

게임 실패/직접 종료도 실제로 수집한 코인만 정산합니다. 점수만 높여서는EP를 지급하지 않습니다. 챌린지 실패는0EP, 성공 후 당일 추가 성공 보상은 없습니다. 개선기·추천·친구 방문에는EP를 지급하지 않습니다. 재시도/중복 요청으로 보상이 늘지 않습니다.

|상품 구분|확정 가격대|예시|
|---|---:|---|
|작은 소품|30~50EP|꽃30·물뿌리개35·조명50|
|식물·중간 장식|60~100EP|화분60·울타리80·벤치100|
|큰 시설|150~250EP|파라솔150·우물200·온실240·풍차250|
|일반 캐릭터|120~180EP|병아리120·토끼140·고양이160·구름이180|
|특별 캐릭터|250~350EP|다람쥐250·여우280·고슴도치300|

가격대가 아니라 실제 상품 가격은 상점/공통 `SHOP_PRICES`에서 확인합니다. 특별 캐릭터는 가격 분류이며 게임 능력치 우위나 확률형 판매를 뜻하지 않습니다. 기본 새싹이는 무료입니다.

EP는 상점에서만 소비합니다. 챌린지 예산(오늘 최고 게임 점수로 정하는50~150)은EP와 별개이며 키워드/모델 선택 비용으로EP 잔액을 차감하지 않습니다. 정원 이동·장착·편집은 무료입니다. 소유한 물건의 재판매/자동 환불이나EP 소멸은 없습니다.

기존 잔액·보유품·지급 완료 기록은 변경하지 않습니다. 새 게임은v11로 발급하며 이전 버전으로 이미 시작한 게임은 기존 보상 규칙을 유지합니다. 따라서 정책 전환 당일에는 이전 버전 지급이 섞일 수 있고34EP를 소급 적용하지 않습니다. 개발 초기125EP는 운영 보상이 아닌 테스트 지급입니다.

운영 출석/팁 정책을 적용하려면 `supabase/migrations/202611090005_reward_policy_v3.sql`을 migration 계정으로 적용하고 최신 API를 배포합니다. 파일 작성·로컬 검증과 원격 적용은 별개입니다. 자세한 정책/가격/반영 절차는 [EP 경제 정책](docs/EP_ECONOMY_POLICY.md)에 있습니다.

### 게임 조작

|게임|키보드|모바일|
|---|---|---|
|길 건너기|방향키, Space 전진·누르고 있으면 연속 이동|탭 전진·방향 스와이프·방향 버튼 누르기|
|Dino|Space/위쪽 방향키 점프·누르고 있으면 연속|탭 점프·두 번 탭하면 착지 후 추가 점프·꾹 누르면 연속|
|Temple Run형|좌우 방향키|좌우 스와이프·방향 버튼|

요일별 게임은 월·목·일 길 건너기, 화·금 Dino, 수·토 Temple Run입니다. 테스트 게임 선택·연습은 삭제했으며 게임 종류를 API로 임의 변경할 수 없습니다. 오늘의 팁10개는 한국 날짜 기준으로 순환합니다. 개발용 친구 '모모 · 테스트 친구'는 로컬 개발 로그인에만 추가됩니다. [테스트 친구·공유 정보](docs/DEVELOPMENT_SOCIAL_FIXTURE.md)

## 환경변수

실제 비밀값은 Git에 올리지 않습니다. `.env.example`을 복사해 필요한 값만 채웁니다.

|파일/위치|내용|
|---|---|
|`apps/api/.env.local`|`DATABASE_URL`, `SESSION_SIGNING_KEY`, `AIMI_GEMINI_API_KEY` 등 서버 전용 값|
|`apps/miniapp/.env.local`|`VITE_API_BASE_URL`만 설정. 운영 빌드는 실제 Render HTTPS URL 사용|
|Render Environment/Secret Files|운영 DB·세션키·Gemini 키·CORS·토스 인증서/개인키 경로|

- Gemini 변수명은 **`AIMI_GEMINI_API_KEY`**입니다. 모델은 `GEMINI_TEXT_MODEL=gemini-3.1-flash-lite`입니다.
- 개선/추천 분석 한도는 `OPTIMIZER_DAILY_LIMIT=5`, `RECOMMENDATION_DAILY_LIMIT=5`로 분리됩니다.
- `MIGRATION_DATABASE_URL`은 migration 실행용이며 런타임 API에는 `DATABASE_URL`을 사용합니다.
- 운영은 `ENABLE_DEV_AUTH=false`, `NODE_ENV=production`, `HOST=0.0.0.0`입니다. 로컬 메모리 서버를 운영에 배포하지 않습니다.
- 토스 연결에는 `TOSS_CLIENT_CERT_PATH`, `TOSS_CLIENT_KEY_PATH`, `TOSS_UNLINK_BASIC_AUTH`가 필요합니다.
- `AIMI_RELEASE_VERSION`은 운영 콘텐츠/정책 검토 후 활성화하는 게이트입니다. 단순 배포 성공을 위해 무검토로 우회하지 않습니다.

전체 변수는 [API 예시](apps/api/.env.example), [프론트 예시](apps/miniapp/.env.example)를 확인하세요.

## 프로젝트 구조

```text
apps/miniapp/             React 화면·게임 Canvas·앱인토스 SDK
apps/api/                 Fastify·토스 인증·경제/소셜·AI 서비스
packages/contracts/      공유 Zod 계약·에셋/정원 크기 규격
packages/game-core/      버전별 결정적 게임 로직·입력 replay
packages/recommender/    등급·품질 필터·비용 비교
content/                 개발 콘텐츠·모델 snapshot/매핑·정책
supabase/migrations/     PostgreSQL migration
prompts/                 기능별 LLM 프롬프트
apps/miniapp/public/content/        기존·추가 SVG 원본
apps/miniapp/public/content/garden/ 정원 그림 경계에 맞춘 SVG
output/assets/shop-v1/   신규40종 미리보기·메타데이터·검사 결과
output/pdf/             UX PDF
output/releases/        과거 .ait 보관본·release 기록
```

## 검증·빌드

```bash
npm run typecheck
npm test
npm run build
npm run assets:check
```

- 단위 테스트는 거래·판정·한도·버전별 replay·게임 패턴·정원 경계·소셜 권한을 확인합니다.
- DB 통합 테스트는 별도 테스트 PostgreSQL과 migration을 준비한 뒤 `npm run test:db`로 실행합니다. 운영 DB를 테스트 대상으로 쓰지 않습니다.
- 브라우저/실기기 플레이 여부는 [구현 상태](docs/IMPLEMENTATION_STATUS.md)에 따로 기록합니다. 자동 완주가 실제 재미 검증을 대체하지 않습니다.
- 새 에셋 재생성: `npm run assets:build`. SVG 소스는 `tools/assets/build-expansion.mjs`입니다.

## 앱인토스 배포

1. 콘솔에 앱을 등록하고 실제 `appName`·유형·약관·로그인 설정을 확정합니다.
2. `apps/miniapp/apps-in-toss.config.ts`와 초대 링크의 이름을 콘솔 값과 맞춥니다.
3. Supabase migration/운영 데이터를 검증하고 최신 API를 Render에 배포합니다.
4. 프론트 API 주소와 SDK 버전에 맞는 운영/QR 테스트 Origin을 CORS에 등록합니다.
5. `npm run ait:build`로 새 `.ait`를 생성하고 콘솔에 업로드합니다.
6. 테스트 QR로 실제 토스 앱에서 로그인·게임·거래·저장·복귀를 검증합니다.
7. 검수 요청·승인·공개를 진행합니다.

`.ait`는 프론트엔드 번들입니다. Render API와 Supabase는 별도로 운영합니다. `output/releases`의 보관본이 항상 최신 코드를 포함하는 것은 아니므로 배포 때 다시 빌드합니다. GitHub push와 Render 배포·콘솔 업로드도 서로 다른 단계입니다.

## 아직 남은 작업

- 별도 콘텐츠 생성기와 승인 Supabase 콘텐츠/날짜별 편성 reader 연결. 현재 챌린지·팁은 코드 기반 개발 예시입니다.
- 챌린지의 모든 허용 조합에 대한 실제 결과 이미지 검수. 현재 범위 밖 조합은 오류로 처리하고 횟수/예산을 보존합니다.
- AA/OpenRouter 모델 매핑 확대·정기 갱신. 현재 목록은 중복 없는156개입니다. 제품군은Small32/Medium53/High71로재검토했습니다. 150개는제작사자료를검토한AIMI분류이고5개는추가확인·1개는기존정책유지/근거보강상태입니다. [제품군검토표](docs/MODEL_GROUP_REVIEW_RESULTS.md)에근거를기록했습니다. AA 측정 설정303개를 별도 프로필로 보관하며 참고값을 추천 검수 완료로 취급하지 않습니다. 가격 기반 등급 분류는 제거했습니다. 추천은 고정 제품군 정책과 검수된 품질 자료를 모두 사용합니다. AA Coding Index 제공 중단으로 코드 업무는 추천 근거 부족을 안내합니다. 상세 UI에는 입력·출력100만 토큰당 가격·지원 기능·처리 길이·출력 속도·AA 성능7개를 표시합니다. null은 평가 자료 없음으로 표시하며 측정 설정을 선택할 수 있습니다. 상세는 [추천 정책](docs/RECOMMENDATION_POLICY.md)·[AA 데이터 점검](docs/AA_DATA_AUDIT.md)을 확인합니다.
- 토스 로그인·연결 해제·운영 API 실제 연동 및 Android/iPhone 실기기 인수.
- 최종 UX·게임 난이도·성능 조정과 최신 .ait·서버 배포 검증·출시 심사.

## 관련 문서

- [시작 안내](START_HERE.md) · [최신 구현 상태](docs/IMPLEMENTATION_STATUS.md)
- [서비스 포지셔닝 조사](docs/POSITIONING_RESEARCH.md)
- [개발 명세](docs/DEVELOPMENT_SPEC.md) · [UX PDF](output/pdf/AIMI_UX_Light.pdf) · [디자인 규칙](design/DESIGN_SYSTEM.md)
- [게임 정책](docs/GAME_SCORING_AND_REWARDS.md) · [정원 규격](docs/GARDEN_FREE_PLACEMENT.md)
- [에셋 제작/저장](docs/ASSET_EXPANSION_PLAN.md) · [모델 추천 정책](docs/RECOMMENDATION_POLICY.md)
- [앱인토스 배포·인수](docs/TOSS_DELIVERY_AND_ACCEPTANCE.md) · [콘텐츠 생성기 계획](docs/CONTENT_STUDIO_IMPLEMENTATION_PLAN.md)

외부 코드·폰트·도구의 라이선스는 `assets/licenses`와 관련 문서에서 관리합니다. 저장소 전체에 대한 공개 사용 라이선스를 별도로 선언한 상태는 아닙니다.

추천검증은 [평가결과](docs/RECOMMENDATION_VALIDATION.md)를 참고합니다. 일반 `npm test`는 외부 호출 없이 실행합니다. `npm run eval:recommendation`은 실제 Gemini에 고정 문항18개를 요청하는 별도 평가이며 공급자 사용량이 발생합니다.
