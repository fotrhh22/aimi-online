# AIMI 프로토타입 v1 · 실행 및 인수

갱신: 2026-11-09 Asia/Seoul. 목표는 PDF 기준 전체 기능의 로컬 프로토타입과 .ait 생성이다. 운영 출시/심사/사용자 기기의 토스 테스트는 포함하지 않았다. Figma/MCP는 사용하지 않고 PDF 및 제작 소스를 참고했다.

## 바로 실행

```sh
cd /Users/hunhokang/Downloads/esg_campaign/aimi-online
npm install
AIMI_AI_MODE=fixture npm run dev
```

http://127.0.0.1:5180 에서 개발용 사용자 이름을 입력한다. 위 명령은 UI5180 + 로컬 API8081을 함께 실행한다. 개발 상태는 기본 메모리 저장소를 사용한다. 브라우저 새로고침 중에는 같은 서버의 상태를 유지하지만 서버를 재시작하면 EP·보유품·게임·출석·AI 작업과 개발 세션이 초기화된다. 과거 tmp/prototype/state.json은 기본 실행에서 읽지 않는다. 명시적으로 AIMI_DEV_PERSIST_STATE=true를 설정한 로컬 실행만 파일 지속성을 사용한다. initial125EP·seed/bear/flower는 명시적인 개발 fixture다. 모든 개발 경로는 loopback/비운영 환경으로 제한하며 외부 DB 장애 시 개발 저장소로 자동 전환하지 않는다.

실제 Gemini를 사용하려면 AIMI_AI_MODE를 생략하고 npm run dev를 실행한다. API .env.local의 GEMINI_API_KEY와 GEMINI_TEXT_MODEL을 서버만 읽는다. 키가 없을 때 로컬 서버는 개발 예시 응답으로 표시하고 실제 API 서버는 AI_NOT_CONFIGURED로 실패한다. 실제 Gemini 합성 요청1건은 별도로 검증했다. 기본 서비스 총100회/한국날짜, 개선/분석 사용자별5회, 입력4000자, timeout25초·출력3000토큰, 무한 재시도/유료 fallback 없음. 설정 가능한 값은 .env.example 참조.

개발 사용자 이름을 바꾼 별도 브라우저 컨텍스트로 친구 요청/수락/차단을 테스트할 수 있다. 계정 관리 링크는 홈 아래에 있다. 로컬 파일 저장소는 단일 프로세스 개발용이며 배포 서버는 기존 PostgreSQL 지갑/원장에 연결한다.

## 구현 범위와 주요 위치

| 영역 | 실제 코드 |
|---|---|
| 공통 UI/라우팅 | apps/miniapp/src/app, ui/primitives, tokens.css, styles.css |
| 홈/미션 | features/home/screens.tsx |
| 정원/상점/캐릭터/소셜/계정 | features/garden/screens.tsx |
| 챌린지 | features/challenge/screens.tsx |
| 개선/추천/모델상세 | features/optimizer/screens.tsx |
| 세 게임 | games/shared/GameScreen.tsx + packages/game-core |
| API | apps/api/src/modules/routes.ts, domain.ts, repository.ts |
| 실제 토스 로그인 | services/toss/auth.ts + 미니앱 lib/toss/bridge.ts |
| Gemini | services/llm/gemini.ts |
| 추천 계산 | packages/recommender + content/model-mappings.json |
| 직접 만든 예시 에셋 | public/content, tools/assets/build-fixtures.py |
| DB 추가분 | supabase/migrations/202611080002_prototype.sql, 202611080003_ai_usage.sql |

v1은 기능 화면/도메인 서비스를 위 파일들로 묶었으며 일부 사전 생성한 세부 폴더에는 README만 남아 있다. 해당 폴더가 별도 기능 구현 완료를 뜻하지 않는다. 기존 Fastify/지갑/원장은 유지한다. 새 PostgreSQL 집계 테이블 prototype_states는 지갑과 동일 트랜잭션에서 잠그며 경제 변화는 기존 ep_ledger에 기록한다. 추후 개별 게임/시도/작업 정규화는 별도 migration으로 진행할 수 있다.

## 게임과 콘텐츠

Canvas2D 렌더러와 렌더러 없는 30Hz·seed 기반 공유 시뮬레이션을 사용한다. Phaser 제안 대신 현 범위의 2D 동작/서버 재생에 맞춰 외부 게임 엔진 의존성을 추가하지 않았다. 동일 로직으로 세 게임의 충돌·점수·완주를 검증한다. 길 건너기 최초 전방행+1, 러너는18tick당+1,100점 완주. 수집EP 상한18/플레이·60/일, 예산50~150·오늘 최고점수 기준은 개발 정책 v1이다. start→max30분 복구, 게임/챌린지 각5회. 자정 뒤 새 플레이는 새 날짜, 기존 게임 기록은 시작일 귀속, 챌린지 제출은 오늘 날짜만 허용한다.

목표/키워드/조건/임계값·예시이미지는 코드로 준비한 개발 콘텐츠다. 날짜로 게임3종과 예시 챌린지3묶음을 선택한다. 목표·조건은 같은 버전으로 바뀐다. 운영 생성기는 만들지 않았다. 향후 승인 Supabase 일정/콘텐츠 조회로 교체할 경계를 services/content와 contracts에 뒀다. 현재 DB 기반 편성/콘텐츠 발행 관리 도구가 완성된 것은 아니다.

도전 판정에 LLM/임베딩을 호출하지 않는다. 6조건 가중치25/20/15/15/10/15, 필수 대상, 충돌 감점20, 저/고 비용12/40·임계85/70을 사용한다. 실패는 횟수만 소모·비용 미확정, 성공은 제출예산 기준 최초 성공 보상. preview는 비용/문장만 반환하며 무료로 채점 결과를 노출하지 않는다.

30개 키워드 중 사과/배·개수·색·흰/검정 배경·시점·스타일의 대표 profile1728개를 단일 SVG atlas로 준비했다. 현재 범위 밖 조합/충돌은 RESULT_VARIANT_UNAVAILABLE이며 횟수/예산 미소모다. 임의 조합을 의미가 다른 이미지로 바꾸지 않는다. 사진/수채화 등의 이미지는 PDF 기반 벡터 예시이며 실제 생성 모델의 출력 품질을 재현하지 않는다. 운영 발행 전에는 전체 허용 조합의 실제 이미지 검수가 필요하다.

## 모델 자료와 AI

중복 제거 후 확정한OpenRouter156개 모델과 AA 측정 프로필303개를 저장했다. content/catalog/model-selection-156.json으로 선정 범위를 유지하며 AA 검수 매핑10개만 추천 근거로 사용한다. 나머지 프로필은 설정이 명시된 참고 자료이며 제품군도 별도 검수가 필요하다. 다른 추론설정·batch/free 변형을 이름 유사성만으로 자동 매핑하지 않는다. AA 지표 버전이 달라지면 매핑을 재검수한다. 모델별 제품군 정책과 버전5의 프로토타입 최소 품질 gate(5/12/20) 후 같은2000입력/1000과금출력 토큰 가정의 참고비용순 최대3개. 결측·노후·후보부족은 연결 전/측정값 없음/근거 부족/추천 불가로 구분한다. 실제 정책은 RECOMMENDATION_POLICY.md v2를 따른다.

```sh
node tools/model-sync/snapshot.mjs
```

위 수동 갱신은 명시된 API 키/권한이 있을 때만 AA를 호출하고 실패 시 기존 정상 snapshot을 유지한다. GitHub Actions 신규 수집 설정/실행은 이번 범위에서 제외했다. 스냅샷은 모델 단위 참고 가격이며 provider 라우팅/추론 과금의 실제 청구액을 보장하지 않는다.

개선기는 구조 검증·인용 위치/수량 검사, 개선/확장·추가 가정 분리, 편집/복사/인계, 비동기 작업 상태/재조회·중복 호출 방지·한도를 구현했다. AI 작업 결과와 관련 요청 캐시는24시간 뒤 주기/시작 정리하고 만료 결과는 제공하지 않는다. 의미 보존의 모든 경우를 정형 검사로 보장하지는 않으므로 운영 확대 전 평가를 보강한다.

## 검증

- 타입 검사 및 전체 build, .ait 로컬 생성.
- node:test18개: 세 게임 완주/로그 검증, 상한·반복 지급, 조건 판정·시스템 오류 비소모, 날짜, 구매/장착·revision, 파일 지속성·멱등성, 추천 gate, AI 구조/중복/등급변경 재분석 방지 등.
- 격리된 로컬 PostgreSQL 통합4개: 기존 보상/원장·중복·자정·세션, 동시 구매·정원·친구·quota·삭제, 게임 완료·결과 미매칭 복원.
- 모바일 Chrome375×812 흐름8묶음과320×640 가로 넘침 검사. tools/qa/flows.mjs 참조.
- 가속 브라우저 시계+명시적 로컬 시간 fixture로 Dino100점·서버 replay·완주 단일 CTA 확인. tools/qa/game-cap.mjs 참조. 실시간 모바일 완주 테스트와 구분한다.
- 실제 Gemini 모델 합성 요청1회: 구조화 출력·숫자 보존·실제 인용 구절 검증. tools/check-optimizer.mjs는 유료/무료 한도를 사용하는 외부 요청이므로 자동 테스트에는 포함하지 않았다.

```sh
npm run typecheck
npm run build
npm test
# test:db는 disposable localhost PostgreSQL에만 허용한다.
DATABASE_URL=postgresql://USER@127.0.0.1:PORT/TEST_DB npm run test:db
# 실행 중인 로컬 API/UI에 대해, 브라우저 Chrome 필요
npm run qa:flows
```

브라우저 결과/캡처는 tmp/qa, 최종 인수 사본은 output/releases/v1에 기록한다. 모든35개 상태에 대한 실기기 시각 인수나 토스 호스트 확인을 끝냈다고 해석하지 않는다.

## PDF 대비 의도적 차이

PDF의 화면/간격/색/라이트 배경/밝은 블러/고정정원/구매와 장착 분리/캐릭터 팝업을 기준으로 구성했다. 휴대폰 테두리·상태바·홈 인디케이터는 웹 UI로 복제하지 않았다. 브라우저에서는 개발용 뒤로가기/계정 제어와 작은 예시 표시를 제공하고 토스에서는 SDK 내비게이션을 사용한다.

최신 정책의 Small/Medium/High·top3·100점 상한을 적용해 PDF의 Light/8개 목록/180점 예시와 다르다. 실제 잔액/횟수/상품 보유 상태에 따라 문구/장면이 변한다. 키워드는44px 목표 터치영역·순서 이동 버튼과 스크롤을 제공해 정적 PDF보다 길어질 수 있다. 홈 계정 관리 링크와 로그인/빈 상태 등 필수 보조 화면을 추가했다. PDF 원본 글꼴을 웹폰트로 사용하며 TDS 기본 글꼴보다 우선한다. 실제 게임 움직임/이미지 샘플 차이가 있어 전체 픽셀 동일성을 주장하지 않는다. 결과 팝업은 공통 상단 기준점과 폭을 사용하고 단일 완주CTA를 유지한다.

## 제외 및 다음 사용자 작업

외부 DB/Render/토스 콘솔은 이번에 변경하지 않았다. 기존 배포 API에는 새 코드가 아직 반영되지 않았다. 최종 .ait는 새 API/SQL 설정을 대신하지 않는다.

1. Supabase 관리자 연결로 신규 migration002/003을 기존 runner에 적용. foundation001은 기존 checksum을 유지한다. SQL Editor에 직접 실행하지 않고 이번에는 로컬 테스트 DB에서만 검증했다.
2. 실제 서버 코드를 Render에 배포하고 기존 런타임 역할·세션 키·HTTPS origin/CORS를 맞춘다. 토스 운영/테스트 origin과 브라우저 origin을 구분한다.
3. 토스 콘솔의 실제 appName·분류·브랜드·약관·권한·mTLS 인증서 경로·연결해제 callback을 설정한다. callback은 POST와 Authorization Basic 일치 검증을 사용한다. 개인정보 복호화 필드는 최소 수집 범위에서는 사용하지 않는다.
4. 프로덕션 /v1 경로는 기본 PROTOTYPE_RELEASE_NOT_REVIEWED로 차단한다. 현재 코드의 개발 정책/예시 콘텐츠·원장·보상 정책을 검토한 뒤 승인 버전으로 명시 전환해야 한다. 단순히 플래그를 켰다는 이유로 운영 적합성이 검증되지는 않는다.
5. 실제 API HTTPS 주소로 .ait를 다시 빌드하고 콘솔에 업로드, 테스트용 스킴으로 토스 실기기 인수·심사 진행. 업로드/심사/운영 공개는 이번에 수행하지 않았다.

운영 데이터는 정규화 확장/실제 콘텐츠 발행 계약·전체 조합 검수, 오래된 play/attempt 이력 보존 정책, 분산/다중 프로세스 운영·부하·실기기 성능 등 후속 작업이 남는다. 이는 로컬 전체 흐름 프로토타입 완성과 구분한다.
