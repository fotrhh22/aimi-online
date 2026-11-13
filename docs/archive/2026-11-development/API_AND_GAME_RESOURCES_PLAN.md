# API·사용 예산·GitHub Actions·게임 소스 확보 계획

작성: 2026-11-08, Asia/Seoul. 사용자 추가 요청을 반영한 구현 계획이다. **키 등록·결제·저장소 생성·Actions 활성화·게임 소스 통합은 아직 실행하지 않았다.**

## 1. 서비스별 역할과 설정 위치

| 서비스 | AIMI에서 사용할 기능 | 비밀 보관 위치 | 비용/권한 확인 |
|---|---|---|---|
| Gemini Developer API | 프롬프트 개선·추가 예시·업무 분석. 실시간 이미지 판정에는 사용하지 않음 | 로컬 API `.env.local`, Render API 환경변수 | 사용자 정정: Gemini Free Tier 사용 전제. 계정의 무료 모델·호출 한도 확인, $200 크레딧 가정 제거 |
| OpenRouter Models API | 모델 ID·기능·context·입출력 가격 수집 | GitHub Actions `model-data` Environment Secret | 모델 목록 수집만 사용. 유료 추론 호출·크레딧 충전은 현재 계획에 없음 |
| Artificial Analysis Data API | 공개 성능·속도·벤치마크 자료 수집 | GitHub Actions `model-data` Environment Secret | Free/Pro/Commercial 권한·필드·호출 한도·재배포 조건 확인 |
| Supabase PostgreSQL | 수집 staging·검증·활성 snapshot 발행 | Actions에 제한 권한 `MODEL_SYNC_DATABASE_URL` | API 런타임·migration DB 권한과 분리 |
| GitHub | AIMI 소스·CI·데이터 수집·게임 참조 출처 이력 | checkout은 기본 `GITHUB_TOKEN` | public 코드 조회에 개인 PAT 불필요. private 소스가 필요해질 때만 좁은 범위 토큰 검토 |

API 키 실제 값은 제공·발급되지 않았으므로 예제에 공란으로 추가한다. 운영 키를 `.env.example`에 입력하지 않는다. 실제 로컬 파일은 Git 제외 경로에 저장하고 Render/GitHub에는 각 비밀 설정으로 등록한다. 환경변수 등록만으로 기능·비용 제한이 작동하지 않으며 별도 설정 스키마와 실행 코드가 필요하다.

## 2. Gemini Free Tier와 비용 통제

사용자는 프로모션 크레딧이 아니라 Google 무료 등급을 사용할 계획이라고 정정했다. Gemini Developer API의 Free Tier는 지원 모델별 무료 요청/토큰 한도 방식이며, 공식 가격표에서 일괄 $200 크레딧 제공으로 확인되지 않는다. 계정의 실제 tier·사용 가능 모델·현재 한도를 확인한다. Google Cloud 무료 체험 크레딧과 구분한다. [공식 가격표](https://ai.google.dev/gemini-api/docs/pricing)

`GEMINI_BILLING_TIER=free`와 `LLM_PAID_USAGE_ENABLED=false`는 프로젝트의 구현 예정 설정이다. 공급자 계정 등급이나 결제 상태를 바꾸지 않는다. 실제 Free Tier 프로젝트의 키를 사용하고, 한도 초과 시 대기/사용 불가 처리하며 유료 모델·다른 공급자로 자동 전환하지 않는다. 기존 GOOGLE_PROMO_CREDIT_* 및 GEMINI_PROMO_CREDIT_VERIFIED 설정은 제거했다. 달러 기준 일/월 예산은 비워두고 모델별 무료 한도와 앱 사용자별 일일 한도를 구현한다. 향후 유료 사용은 별도 결정한다.

키·모델·한도 입력 후 개발용 소수 요청으로 구조화 출력과 사용량을 검증한다. 실제 모델은 사용 가능한 안정 모델 중 품질·단가를 평가해 고정하며, 가격을 확인하지 않은 모델명은 예제 기본값으로 넣지 않는다.

비용 제어는 `ai_usage_events` 및 예산 집계 행에서 **실사용액 + 진행 중 예약액 + 새 요청의 최대 예상액**을 잠금 아래 비교한다. 모델 버전별 단가, 최대 출력·thinking 등 과금 가능한 사용량을 반영하고 재시도도 별도로 예약한다. 성공은 실제 사용량 정산, 취소/실패는 청구 가능 여부 확인 후 정리한다. 타임아웃은 공급자에서 실행 중일 수 있으므로 예약을 즉시 전액 해제하거나 무조건 재호출하지 않는다. 실제 사용량을 확인할 수 없으면 보수적 예약을 유지하고 후속 대사한다.

Cloud Billing의 경고용 budget은 자체 호출 차단과 다르다. 지원되는 spend cap이 있다면 해당 Gemini 서비스 적용 여부를 계정에서 추가 확인한다. 유료 사용을 도입할 때 내부 추정·공급자 집계 지연을 고려한다. 설정 누락·예산 소진·402·429에는 유료 모델/다른 공급자로 자동 전환하지 않고 명확한 재시도/사용 불가 상태를 반환한다. [Cloud Billing budget 문서](https://docs.cloud.google.com/billing/docs/how-to/budgets)

이미지 제작비도 Gemini 예산에 포함할 경우 콘텐츠 CLI가 같은 예산 원장·예약 경로를 사용해야 한다. 직접 별도 키로 생성한 비용은 앱 원장에 자동 집계되지 않으므로 초기에는 텍스트 예산과 콘텐츠 제작비를 분리한다.

## 3. OpenRouter·Artificial Analysis 수집 계약

| 항목 | 실제 API 설정 | 처리 |
|---|---|---|
| OpenRouter | `OPENROUTER_MODELS_URL=https://openrouter.ai/api/v1/models`, `OPENROUTER_API_KEY` | 필요 시 Bearer 인증. 모델 목록·가격·지원 기능을 원본 단위로 보존 |
| AA | `ARTIFICIAL_ANALYSIS_MODELS_URL=https://artificialanalysis.ai/api/v2/language/models/free`, `ARTIFICIAL_ANALYSIS_API_KEY` | `x-api-key` 헤더. `pagination.has_more`/페이지를 따라 전체 수집 |
| DB | `MODEL_SYNC_DATABASE_URL` | staging insert·검증·발행 함수 등 필요한 권한만 허용 |
| 제한 | `MODEL_SYNC_HTTP_TIMEOUT_MS`, `MODEL_SYNC_MAX_RETRIES`, `MODEL_SYNC_MAX_PAGES` | 유한 재시도·타임아웃·최대 페이지. 제한 초과는 부분 발행하지 않고 실패 |

OpenRouter 공식 목록 API에서 제공하는 가격·context·모달리티 등을 사용한다. 가격은 원본 per-token 값과 USD 단위를 보존하고 화면에서 ×100한다. [공식 Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)

AA Free 경로는 유효한 API 키가 필요하고 public subset을 반환한다. 상위 키로 Free URL을 호출해도 전체 Pro 필드가 생기지 않는다. 개별 벤치마크 등 필요한 필드가 없으면 `N/A`로 두며 유료 플랜 적용이 확인된 뒤 경로·스키마를 함께 전환한다. [AA 공식 reference](https://artificialanalysis.ai/data-api/docs/reference)

모델 연결은 승인된 `model_mappings`를 사용한다. 모델 이름의 유사성만으로 reasoning 설정·버전이 다른 항목을 합치지 않는다. 원본 출처·조회 시각·모델/추론 설정·스키마 버전·단가·정책 버전을 남긴다. API로 수집할 수 있다는 사실과 앱에서 재배포할 권리는 별도 확인한다.

## 4. GitHub Actions 구축안

저장소 제안은 **AIMI 전용 private monorepo 1개**다. 게임은 `apps/miniapp/src/games`와 `packages/game-core`에서 함께 관리한다. 별도 게임 저장소 3개를 운영하기보다 공통 캐릭터·서버 검증 계약·버전을 한 곳에 둔다. 실제 소유자/저장소 URL은 아직 정하지 않았다.

Secrets/Variables 배치:

| 구분 | 이름 | 등록 위치 |
|---|---|---|
| Secret | `OPENROUTER_API_KEY` | GitHub Environment `model-data` |
| Secret | `ARTIFICIAL_ANALYSIS_API_KEY` | GitHub Environment `model-data` |
| Secret | `MODEL_SYNC_DATABASE_URL` | GitHub Environment `model-data` |
| Variable | `OPENROUTER_MODELS_URL`, `ARTIFICIAL_ANALYSIS_MODELS_URL` | 같은 Environment |
| Variable | `MODEL_SYNC_HTTP_TIMEOUT_MS`, `MODEL_SYNC_MAX_RETRIES`, `MODEL_SYNC_MAX_PAGES` | 같은 Environment |
| Variable | `MODEL_SYNC_STALE_AFTER_HOURS` | 같은 Environment. 초깃값 240시간 제안 |
| Server Secret | `AIMI_GEMINI_API_KEY` | Render API 전용. 모델 수집 Actions에 전달하지 않음 |

실행 방식:

1. `workflow_dispatch`로 첫 수집을 검증한 다음 주간 schedule을 활성화한다. 제안 cron `17 18 * * 0`은 UTC 일요일 18:17 = **한국 월요일 03:17**이다. 정각 부하를 피한다.
2. checkout·Node 설치·`npm ci` → endpoint/설정 검증 → 모델 자료 전체 수집 → Zod 검증 → 매핑·단위·결측·변경량 검사 → staging 저장 → 한 트랜잭션으로 활성 snapshot 전환.
3. `permissions: contents: read`, `timeout-minutes: 15`, `concurrency` 그룹을 지정하고 진행 중 발행을 취소하지 않는다. 공유 DB의 동시 실행은 DB 잠금도 적용한다. action은 사용할 릴리스의 검증한 commit SHA로 고정한다.
4. PR 검증에는 외부 API/DB secret을 전달하지 않고 검수 fixture만 사용한다. PR 변경 코드에 운영 secret이 전달되는 실행 경로를 만들지 않는다.
5. 인증 오류·429·페이지 누락·스키마 변경·과도한 모델 소실은 발행 중단. `sync_runs`에 비밀 없는 오류·건수·버전을 기록하고 기존 정상 snapshot을 유지한다. 수집 원문과 유료 데이터는 공개 artifact·Git에 올리지 않는다.
6. 실패는 Actions 상태·설정된 GitHub 알림으로 확인한다. 장기간 미실행은 `snapshot.collected_at` 기반 stale 상태로 감지한다. 앱은 갱신일·지표 미제공을 표시하고 정책상 오래된 자료에 의한 새 추천을 제한한다.
7. GitHub schedule은 지연·누락 가능하므로 자정 미션 전환에 쓰지 않는다. 기본 브랜치와 실제 활성 상태를 확인한다. [GitHub schedule 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Secrets 문서](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

현재는 수집 코드·명령·독립 저장소가 없어 실행 workflow 파일을 만들지 않는다. 부모 저장소 유지 시 workflow는 부모 `.github/workflows`에 있어야 하며 `aimi-online/.github/workflows`만으로 실행되지 않는다. 저장소 확정 → CLI 검증 → workflow 추가 순서로 진행한다.

## 5. 게임 개발용 GitHub 저장소 조사

| 소스 | 용도 / 조사 결과 | AIMI 적용 방침 |
|---|---|---|
| [phaserjs/phaser](https://github.com/phaserjs/phaser) | 2D 엔진, MIT. 현재 기본 브랜치는 Phaser 4 계열 | 기존 명세의 Phaser 3 제안을 기준으로 3.x 고정 버전·모바일 호환성을 먼저 검증. 4.x 전환은 별도 평가 |
| [phaserjs/template-react-ts](https://github.com/phaserjs/template-react-ts) | React와 게임 lifecycle 연결 참고, MIT. 설명은 Phaser 3이지만 현재 package는 Phaser 4.0.0·React 19 | AIMI의 React 18/Vite 7 구조를 유지. 템플릿 전체 덮어쓰기 대신 브릿지·정리 구조만 호환 버전에서 선별 |
| [phaserjs/examples](https://github.com/phaserjs/examples) | 입력·카메라·충돌·스프라이트 참고. 현재 README는 Phaser 4 예제 | 도입 엔진 버전과 맞는 tag/commit에서 코드 선별. 코드는 MIT지만 포함 에셋에는 별도 제한이 있으므로 게임 이미지·음원은 가져오지 않음 |
| [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner) | 다이노 점프·장애물 생성 방식 참고. 저장소 LICENSE는 BSD-3-Clause | 별도 엔진으로 통합하지 않고 규칙 참고. 코드 반입 시 해당 파일의 원본 고지·에셋 권리도 추적. AIMI 캐릭터로 자체 구현 우선 |

조사 기준: [엔진 LICENSE](https://github.com/phaserjs/phaser/blob/master/LICENSE.md), [템플릿 package](https://github.com/phaserjs/template-react-ts/blob/main/package.json)·[LICENSE](https://github.com/phaserjs/template-react-ts/blob/main/LICENSE), [예제 README의 코드/에셋 구분](https://github.com/phaserjs/examples/blob/master/README.md), [다이노 참고 LICENSE](https://github.com/wayou/t-rex-runner/blob/gh-pages/LICENSE). 정확한 도입 commit은 아직 선정하지 않았다.

길 건너기와 3레인 러너는 유명 게임의 완제품 clone을 무검증 반입하지 않고, 동일 game-core 위에 AIMI용 최소 메커니즘부터 구현한다. 공개 소스 조사·선별 결과도 산출물로 남긴다. 정원과 세 게임에서 쓰는 캐릭터·애니메이션 규격은 먼저 통일한다.

| 순서 | 게임 | 구현 범위 | 서버 검증·모바일 인수 |
|---|---|---|---|
| 1 | 길 건너기형 | 탭 전진·차선·시드 장애물·충돌·EP 수집 | seed/play_id·입력 타임라인·유효 거리/시간·수집 상한 검증, 일시정지·복구 |
| 2 | 다이노형 | 탭 점프·지상 장애물·점진 속도·충돌 | 고정 규칙 버전·점프 가능 간격·경과 시간·최대 거리·중복 완료 |
| 3 | Temple Run형 | 2D/2.5D 3레인·스와이프·장애물·수집 | 불가능한 레인 이동·수집·점수 검증, 작은 화면·제스처 충돌 |

서버는 검증 가능한 입력과 고정 규칙으로 재생 또는 상한 검사를 하며, 클라이언트 점수 숫자만 신뢰하지 않는다. 입력 검증이 봇 플레이를 완전히 차단한다고 표현하지 않는다. 첫 게임 이후 두 게임의 구현 순서는 난이도와 실기기 성능에 따라 조정 가능하다.

반입 전 각 소스에 대해 URL·tag/commit SHA·선별 파일·저작권 고지·수정 사항·라이선스·에셋 별도 허용을 `assets/licenses` 및 출처 manifest에 기록한다. 원격 `main` 코드를 런타임 로딩하지 않고 검토한 패키지/파일을 빌드에 고정한다. 현재는 다운로드·clone·패키지 변경을 하지 않았다.

## 6. 착수 순서와 인수 조건

1. Gemini Free Tier 프로젝트·사용 가능 모델·요청/토큰 한도, AIMI GitHub 저장소, Supabase 전용 환경을 확정한다.
2. 예제의 키 이름에 맞춰 각 비밀 저장소에 실제 값을 등록한다. 로컬 값이 Git에서 제외되고 로그·번들에 노출되지 않는지 검증한다.
3. P0에서 env 스키마·AI 예산 예약 계약·수집 응답 스키마·DB 역할을 구현한다.
4. 게임 엔진 고정 버전과 React 브릿지를 검증하고 길 건너기 최소 플레이·공유 캐릭터·서버 기록 검증을 P3에 연결한다.
5. P5에서 Gemini 실제 소수 요청, 예산 동시 예약·타임아웃 대사를 검증한다. P6에서 fixture 테스트 → 개발 DB 수동 수집 → Actions 수동 실행 → 주간 schedule 순서로 활성화한다.

완료 기준은 실제 키로 인증 성공, 스키마/단위 확인, 비용·동시성 제어, 수집 실패 시 이전 데이터 유지, 선택한 게임 소스의 출처/라이선스 추적, 토스 실기기에서 입력·메모리·복구 검증이다. 예제에 API URL·예산을 추가한 상태만으로 연동 완료 처리하지 않는다.
