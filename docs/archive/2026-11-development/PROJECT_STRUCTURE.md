# AIMI 폴더 구조와 의존성

갱신: 2026-11-08. 이번 작업은 추적 가능한 README 기반 폴더 준비다. 기존 실행 소스를 임의 이동하거나 미구현 endpoint/컴포넌트를 동작하는 것처럼 추가하지 않았다.

```text
aimi-online/
  apps/
    miniapp/src/
      app/                    # 라우터·Provider·초기화
      ui/                     # primitives / overlays / layout / preview
      features/               # home mission challenge optimizer recommendation
                              # garden shop social account
      games/                  # shared crossing dino runner
      lib/                    # api toss
      state/                  # 임시 편집 상태
      assets/                 # catalog games: PDF 예시 기반 앱용 자료
      main.tsx                # 현재 진입점 유지
      tokens.css              # 현재 토큰 유지
    api/src/
      modules/                # auth home economy missions games challenges
                              # catalog garden social optimizer recommendation
      services/               # llm content
      app.ts                  # 기존 동작/거래 코드 유지, 단계적으로 분리
  packages/
    contracts/src/            # 기존 계약 + content / games / ai 확장 위치
    game-core/src/            # 렌더러 없는 순수 시뮬레이션, workspace 등록 예정
    recommender/src/          # 순수 필터/비용/top3, workspace 등록 예정
  content/
    fixtures/                 # 개발 과제·응답 샘플
    catalog/                  # PDF 예시 상품 manifest
    schedules/                # 날짜별 편성 예제
    policies/                 # 버전 규칙
  supabase/migrations/        # 앱 스키마·권한·인덱스, 단일 migration 경로
  tools/model-sync/           # 모델 자료 수집, 구현 예정
  assets/licenses/            # 사용한 외부 자료의 출처
  design/                     # PDF·디자인 규칙·토큰
  docs/                       # 명세·계획·정책·상태
  prompts/                    # 온라인 AI 및 미래 생성기 초안 문서
  .github/workflows/          # 기존 CI, 추후 모델 자료 수집
```

의존 방향: UI 토큰→기본UI→기능 조합→화면. 화면→API 클라이언트→서버 모듈. 게임 렌더러와 서버 검증→동일 game-core. 추천 서비스→동일 recommender. 네트워크 계약은 contracts. 순수 패키지는 React/Phaser/DB/LLM을 import하지 않는다. 클라이언트는 API 관리자·생성기 권한을 갖지 않는다.

새 game-core/recommender는 폴더만 준비했으므로 아직 workspace 실행 대상이 아니다. 첫 코드 추가 때 package.json·tsconfig·root workspace/build·lockfile·CI를 함께 연결한다. 빈 index/export나 사용하지 않는 새 의존성을 미리 추가하지 않는다.

## 최신 범위

- 별도 콘텐츠 생성기 개발/배포는 사용자의 추후 작업. apps/content-studio를 만들지 않는다. 이 앱은 공유 Supabase의 승인 콘텐츠 계약·조회·날짜별 선택·검증만 구현한다.
- 상점은 PDF 예시 상품/캐릭터부터 구현. 신규 AI 에셋 생성·상품 확장 불필요. PDF 화면 전체를 앱 배경 이미지로 쓰지 않고 원본 벡터/그리기 함수를 앱용 에셋으로 재구성한다. 게임용 움직임은 같은 외형을 사용해 구현한다.
- 목표/결과 이미지의 개발용 fixture와 실제 승인 콘텐츠를 구분한다. 외부 생성기가 없어도 fixture로 테스트 가능하며 운영용 검수/커버리지 요구는 유지한다.
- 현재 API/DB/CI/배포 기반은 재사용. 실제 상태 확인 없이 재생성하지 않는다.

## v1 실제 코드 · 2026-11-09

사전 안내보다 PROTOTYPE_V1.md의 실제 코드 위치를 우선한다. game-core/recommender는 이제 npm workspace로 등록·빌드된다. 공통 UI는 ui/primitives, 기능은 home/garden/challenge/optimizer의 screens.tsx에 조합하고 API는 modules/routes.ts·domain.ts·repository.ts에 구현했다. 일부 세부 폴더는 향후 분리 위치로 README만 있다.
