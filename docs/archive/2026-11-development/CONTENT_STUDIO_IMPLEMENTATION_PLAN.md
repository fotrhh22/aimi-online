# AIMI 콘텐츠 생성기 개발 계획

2026-11-09. 생성기 자체는 이번 작업에서 구현하지 않았다. 사용자 미니앱과 별도 운영하며 Supabase의 승인 콘텐츠만 공유한다. 아래 폴더·테이블·파일은 예정 구조다.

## 지금 상태부터 구분

현재 앱은 전체 흐름이 동작하는 프로토타입이다. 다음은 생성기를 제외해도 남아 있다.

| 영역 | 실제 코드/검증 | 남은 일 |
|---|---|---|
| 게임3종·구매·정원·소셜 | 실제 시뮬레이션, API, 소유권, 거래·저장·접근권한 코드. 격리 PostgreSQL 검증 | 운영 인증·실기기·부하·콘텐츠로 전체 인수 |
| 개선기 | 실제 Gemini API·고정 시스템 프롬프트·구조/요청문 검증. 실제 합성 호출 이력 있음 | 다양한 원문에 대한 품질 평가. 로컬 fixture 실행과 구분 |
| 모델 추천 | 실제 공개 모델461개 snapshot·코드 추천·전체 목록 | AA 검증 매핑은10개. 자료 정기 수집 Actions와 매핑 확대·갱신 운영 |
| 챌린지·상품 | services/content/fixture.ts의 PDF 샘플·규칙 판정·대표 이미지 profile | 실제 운영 이미지, 전체 허용 조합 검수, published DB/Storage 조회 |
| 오늘의 팁 | 홈 팝업에 고정한 본문·예시, 서버의 하루1회 EP 지급 | 팁 초안·검수·버전·날짜 편성, 승인 DB 조회 |
| 날짜 편성 | 코드에서 날짜에 따라 게임3종·샘플 챌린지3묶음 순환 | 운영자 달력·발행 일정·fallback·시작 당시 버전 고정 |
| 토스·배포 | mTLS 인증 어댑터·환경변수·번들 생성 코드 | 실제 콘솔/인증서·실기기·최신 코드 배포·심사 |

services/content에는 아직 published PostgreSQL reader가 없다. 기존 ci.yml은 build/test이며 모델 정기 수집 workflow가 아니다. 생성기 UI만 추가하면 운영 앱이 완성되는 상태가 아니다.

## 운영 구조와 폴더

제안하는 별도 저장소/폴더: /Users/hunhokang/Downloads/esg_campaign/aimi-content-studio. 아직 생성하지 않았다.

```text
aimi-content-studio/
  apps/web/src/
    features/challenges/     # 목표·조건·키워드·결과 검수
    features/tips/           # 오늘의 팁·전후 예시·검수
    features/assets/         # 업로드·상품 미리보기
    features/calendar/       # 날짜별 게임/챌린지/팁 편성
    features/releases/       # 검증·승인·발행·롤백
  apps/api/src/
    auth/                   # 운영자 인증과 권한
    jobs/                   # 생성 작업·재시도·사용량 제한
    providers/text/         # Gemini 키워드/팁 초안
    providers/image/        # 별도 이미지 생성/참조 편집 어댑터
    content/                # 초안·검수·버전 관리
    publish/                # 파일 확인·릴리스·일정 발행
  apps/worker/src/           # 장시간 생성 작업 처리
  packages/content-domain/  # 정규화·커버리지·발행 검증
  schemas/                  # 버전 고정한 공용 JSON Schema
  tests/fixtures/           # 비밀 없는 재현 입력
  .env.example
```

운영자는 생성기에 로그인하고, 앱 사용자는 이 서비스에 접속하지 않는다. 앱의 지갑·EP·친구 테이블은 생성기가 수정하지 않는다. 계약은 버전 고정한 JSON Schema로 배포하고 두 저장소가 각자 검증한다. 로컬 상대경로로 다른 저장소 소스를 직접 import하지 않는다.

## Phase와 완료 기준

| Phase | 구현 내용 | 완료 기준 |
|---|---|---|
| G0 계약 확정 | 콘텐츠·이미지·키워드·팁·판정 profile·자유 배치 에셋·릴리스 schema | 동일 pack을 생성기와 앱이 같은 규격으로 읽음 |
| G1 공유 DB와 앱 reader | 콘텐츠 migration·역할·Storage·published reader·일정 바인딩 | 수동으로 등록한 운영용 pack을 앱이 DB에서 조회. 운영 경로에 fixture fallback 없음 |
| G2 운영자 수작업 도구 | 로그인·이미지 업로드·실제 조건 입력·키워드/결과 연결·팁 수동 작성·미리보기·승인 | 자동 생성 없이도 실제 콘텐츠1묶음을 발행하고 앱에서 끝까지 플레이 |
| G3 텍스트 제작 보조 | Gemini 키워드 후보·조건/충돌·템플릿/profile 분석, 팁·전후 예시 초안 | 후보와 팁을 운영자가 수정·검수하며 허용 조합 누락을 확인 |
| G4 목표/유사 이미지 생성 | 이미지 API 어댑터·참조 편집·개별 재생성·작업 상태·한도 | 조건을 바꾼 이미지 초안을 만들고 실제 표현을 검수 |
| G5 달력·일괄 발행 | 날짜별 게임/챌린지/팁·미래7일 준비·버전 고정·fallback·롤백 | 생성기가 중단돼도 승인 일정으로 앱 운영. 자정 생성 호출 불필요 |
| G6 운영 검증 | 파일 무결성·권한·실패 복구·중복 발행·콘텐츠 교체·재고 알림 | 실 콘텐츠·실 API·실 DB·실기기 인수 기록 확보 |

효율을 위해 생성 자동화보다 G1/G2를 먼저 완성한다. 자동 생성 이미지가 있어도 앱이 승인 DB를 읽지 못하면 사용할 수 없기 때문이다. 첫 pack의 실제 연결을 검증한 뒤 다음7일치로 확대한다.

## G0: 앱과 공유할 데이터

- AssetVersion: assetId/version, 원본 hash, storageKey, 종류, 크기, 생성 출처·모델·파라미터, 검수 상태.
- CatalogItem: itemId/version, 상품명·가격 정책, previewAssetId/gardenAssetId, 정원 sprite 크기·앵커. 고정 slotId는 사용하지 않는다.
- CharacterVersion: 정원 원화와 게임 상태별 에셋, 앵커·스케일. 게임 충돌 판정과 외형을 분리한다.
- ChallengeVersion: 실제 목표 이미지, 확정 조건 ID/값/가중치, 필수·충돌 조건, 키워드, 문장 템플릿, 비용·임계값, 규칙 버전.
- ResultVariant: 정규화한 profileKey, 실제로 표현된 조건, 검수된 assetVersionId. 프롬프트에 쓴 조건을 이미지가 충족했다고 자동 가정하지 않는다.
- TipVersion: tipId/version, 학습 주제, 제목·본문, 개선 전/후 프롬프트 예시, 출처·생성 모델/프롬프트 버전, 검수 상태. EP 지급액·한도는 콘텐츠 필드로 제어하지 않는다.
- ScheduleRelease/DailyAssignment: 한국 날짜, 게임 종류/버전, 챌린지 버전, tipVersionId, 경제·판정 정책 버전, 승인 releaseId.

앱 정원 저장은 placements[{itemId,x,y}]다. x/y는 좌측 상단 기준0..1, 아이템 앵커는 하단 중앙이다. 위치를 생성기가 결정하거나 사용자 배치를 덮어쓰지 않는다. 현재4종의 크기는 공용 gardenItemSize 코드에 있으므로, 신규 에셋을 운영 발행할 때는 검증된 크기 metadata를 프론트와 서버가 함께 읽도록 계약을 확장해야 한다.

## G1: DB·Storage·권한

제안 schema: aimi_content. 사용자 schema aimi와 구분한다.

- assets, asset_versions, catalog_versions, character_versions
- challenge_versions, condition_definitions, keyword_candidates, result_variants
- tip_versions (본문·전후 예시·주제·검수/출처)
- generation_jobs, review_events
- content_releases, release_members, daily_missions
- 날짜별 최초 해석을 고정하는 daily_assignments

이미지 바이너리는 Storage에, DB에는 key/hash/조건/검수/버전을 저장한다. 초안 원본·생성 대기는 private, 앱 제공 파일은 승인 버전만 공개한다. 새 버전 경로에 업로드하고 사용 중 파일을 덮어쓰지 않는다.

DB 역할은 studio의 초안 작성/검수/발행과 앱의 published 읽기를 분리한다. 브라우저에 관리자 DB URL·서비스 비밀 키·이미지 API 키를 넣지 않는다. migration 소유 경로는 기존 앱 저장소의 supabase/migrations로 통일한다. 생성기가 별도 migration 이력을 만들어 같은 테이블을 수정하지 않는다.

앱 쪽 예정 파일:

```text
packages/contracts/src/content/        # 버전별 콘텐츠 계약
apps/api/src/services/content/postgres.ts
apps/api/src/services/content/evaluator.ts
apps/api/src/services/content/assignments.ts
apps/miniapp/src/lib/content/assets.ts
apps/miniapp/src/ui/primitives/Asset.tsx
tools/content/validate-pack.mjs
tools/content/import-pack.mjs
supabase/migrations/<새번호>_content_publication.sql
```

로컬 PostgreSQL 인수에는 기존 /auth/dev를 명시적으로 사용하는 미리보기 어댑터도 필요하다. 현재 npm run dev의 /auth/local 메모리 인증을 실제 PostgreSQL 연동이라고 부르지 않는다. 개발 인증은 loopback·비운영 환경에만 허용하고 배포 번들/운영 API에서 차단한다.

현재 fixture.ts에 묶인 CATALOG/contentForDate/evaluateChallenge를 provider와 범용 규칙 평가기로 나눈다. 현재 Asset와 게임 sprite는 /content/{id}.svg를 사용하므로 승인 asset URL/hash/크기/atlas를 읽는 앱 에셋 로더도 G1에서 연결한다. DB에 새 파일을 등록하기만 해서 화면에 나타난다고 가정하지 않는다. 운영 모드는 published만 읽고, 미준비/손상된 콘텐츠는 시작 전에 차단하여 플레이·도전 횟수와 예산을 소비하지 않는다.

## G2/G3: 제작과 규칙 커버리지

순서는 주제/목표 조건 초안 → 목표 이미지 제작·업로드 → 실제 이미지 조건 확정 → 키워드 후보 → 결과 profile/문장 규칙 → 결과 이미지 연결 → 검수다. 키워드 생성은 최종 승인된 실제 목표 조건을 입력으로 사용한다.

LLM은 키워드·조건 연결·충돌 후보·문장 역할·제작용 설명을 제안한다. 점수·가격·보상·사용 횟수는 서버 정책이다. 플레이 중 선택/순서 변경이나 채점에 LLM을 호출하지 않는다.

30개 키워드의 모든 부분집합을 개별 생성하지 않는다. 의미상 동일한 선택을 canonical profile로 묶고 실제 선택 가능한 공간의 커버리지를 계산한다. 현재1728개 대표 SVG profile도 전체 허용 조합을 검수한 운영 묶음은 아니다.

충돌·누락·지원 불가 조합의 처리 정책은 G0에서 명시적으로 확정해야 한다. 현재 충돌 감점 정책을 숨겨서 바꾸거나, 의미가 다른 이미지를 임의로 연결하지 않는다. 허용 조합마다 검수 이미지에 도달하거나 명시된 제출 전 검증으로 처리되는지 검사한 후 발행한다. 결과 미매칭을 정상 오답으로 소모시키지 않는다.

## 오늘의 팁: 제작부터 앱 표시까지

오늘의 팁도 별도 생성기의 운영 콘텐츠다. 현재 홈의 고정 문구를 운영용 데이터로 교체하는 일까지 G1/G2에 포함한다. 이번 계획 갱신으로 앱 표시나 DB 연결이 구현된 것은 아니다.

- 제작: 운영자가 학습 주제를 선택 → Gemini가 짧은 팁과 개선 전/후 요청문 예시를 초안으로 작성 → 운영자가 편집·검수 → 승인 버전 발행. 수작업 등록도 지원한다. 개선 후 예시는 질문에 대한 답변이 아니라 개선된 요청문이어야 한다.
- 검수: 원래 의도를 보존하는지, 예시와 설명이 맞는지, 모바일 팝업 길이에 적절한지 확인한다. 근거 없는 모델 가격·성능 단정은 발행하지 않는다.
- 편성: 게임·챌린지와 같은 달력/릴리스에서 날짜별 tipVersionId를 지정한다. 미래7일치 팁을 준비하며 승인된 이전 팁 재편성도 허용한다. 사용자·팝업 열기마다 생성하지 않는다.
- 조회: 앱 API가 승인된 오늘의 팁만 읽고 홈 팝업이 제목·본문·전후 예시를 표시한다. 운영자 메모·미승인 초안은 앱에 전달하지 않는다. 팁 조회는 개선기/추천의 사용자 AI 한도를 차감하지 않는다.
- 보상: 기존 앱 서버의 tip claim과 한국 날짜 기준 하루1회 지급을 유지한다(현재 기본3EP). 같은 날 다시 열기·다른 기기·팁 수정/재발행으로 추가 지급하지 않는다. 생성기는 지급액이나 사용자 원장을 수정하지 않는다. 팁 조회 실패·승인 팁 부재 시 읽은 것으로 보상 청구하지 않도록 연결한다.
- 버전/복구: 날짜의 팁 버전을 최초 조회 시 고정하여 재발행으로 내용이 뒤섞이지 않게 한다. 누락 시 승인된 대체 팁을 고정하고, 대체 팁도 없으면 준비 중 상태로 표시한다. 게임/챌린지 이용은 팁 누락만으로 차단하지 않는다.
- 완료 검증: 실제 DB 팁 조회·자정 교체·재열기/동시 청구·재발행 시 중복 보상 방지·대체 팁·조회 실패를 확인한다. 팁용 별도 생성 서비스 없이 공통 텍스트 작업·검수·발행 구조를 재사용한다.

## G4: 이미지 제작

- gemini-3.1-flash-lite는 기존 확정 텍스트 모델이다. 이미지 생성 권한/단가를 가진 모델이라는 뜻이 아니다.
- 이미지 모델은 별도 API 접근·참조 편집 지원·비용·해상도를 확인한 뒤 확정한다. 이번 작업에서 이미지 모델을 계약하거나 유료 이미지를 생성하지 않았다.
- 목표 참조 이미지를 기준으로 개수/색/관계/스타일 중 바꿀 조건과 유지할 조건을 명시한다. 결과는 사람이 실제 픽셀을 확인하여 승인한다.
- 작업은 queued/running/succeeded/failed/cancelled 상태, 요청 중복 방지, 제한된 재시도, 생성 개수/예산 상한, 미완료 복구를 갖춘다. 생성 성공을 승인/발행으로 취급하지 않는다.
- 상점은 투명 배경·앵커·정원 크기·잘림을 검수한다. 캐릭터 animation은 생성된 독립 프레임의 일관성을 가정하지 않고 별도 보정한다.

## G5: 발행과 날짜 교체

파일 업로드·hash 확인 → 초안 DB 등록 → 검수 승인 → 선택 공간 검증 → release를 트랜잭션으로 발행한다. Storage와 DB를 하나의 원자 거래라고 가정하지 않는다. 미완료 초안은 앱에 노출하지 않는다.

운영자는 요일 템플릿으로 편성하고, 앱은 Asia/Seoul 날짜의 승인 일정을 조회한다. 첫 play/attempt에 배정 버전을 고정한다. 뒤에 자료를 바꿨다고 이미 진행 중인 사용자에게 다른 과제를 주지 않는다. 미래 일정 누락 시 승인 fallback을 날짜에 고정하고, fallback도 없으면 시작을 막는다. 게임3종은 반복 편성이 가능하다.

롤백은 새 시작에 사용할 release를 바꾸는 작업이다. 이미 발급한 세션/결과/이미지 버전을 재작성하지 않는다. 참조 중인 assetVersion은 보존한다.

## 별도 앱 운영 잔여 작업

생성기 개발과 병행하되 완료를 혼동하지 않는다.

1. OpenRouter/AA 수동 수집기를 정기·수동 Actions로 연결하고 정상 snapshot 교체·실패 시 유지·지표 버전 검수를 구현한다. 가격과 성능을 추측해 채우지 않는다.
2. 토스 콘솔/약관/권한/mTLS·연결 해제·실제 세션·실기기 내비게이션을 검증한다. 코드 준비가 실제 연동 완료는 아니다.
3. 최신 API·클라이언트를 함께 배포하고 운영 콘텐츠·경제 정책을 검토한 뒤 production 차단 설정을 전환한다. 번들 생성만으로 출시를 완료했다고 하지 않는다.
4. 배포 버전으로 로그인→게임→챌린지→보상→구매→자유 배치→재접속을 실제 운영 DB에서 인수한다.

## 최종 완료 조건

개발 fixture 없이 승인 콘텐츠·실제 로그인·실제 Gemini·검증된 모델 snapshot으로 전체 앱이 동작해야 한다. 잘못된 조건·이미지 누락·중복 제출·서버 재시작·자정·발행 실패·권한 위반을 검증한다. 작업별 코드, 운영 설정, 실제 발행 데이터, 실기기 검증을 각각 기록한다.
