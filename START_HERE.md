# AIMI 프로토타입 v1 시작

갱신: 2026-11-09 Asia/Seoul. 이 폴더만 별도 작업 공간으로 사용한다.

## 현재 기준

1. AGENTS.md: 앱인토스 범위/비밀/기존 프로젝트 분리.
2. docs/IMPLEMENTATION_STATUS.md 상단: 최신 실제 구현/검증/제한. 아래 과거 준비 기록과 구분.
3. docs/PROTOTYPE_V1.md: 실제 실행·코드 위치·검증·남은 외부 작업.
4. docs/DEVELOPMENT_SPEC.md와 GAME_SCORING_AND_REWARDS.md, RECOMMENDATION_POLICY.md: 규칙/API.
5. output/pdf/AIMI_UX_Light.pdf와 tools/ux_pdf 제작 소스, design/DESIGN_SYSTEM.md: 시각 기준. Figma/MCP 사용 안 함.
6. docs/UI_COMPONENT_CONTRACTS.md, TOSS_DELIVERY_AND_ACCEPTANCE.md: 공통 UI/호스트 인수.

## 로컬 실행

```sh
cd /Users/hunhokang/Downloads/esg_campaign/aimi-online
npm install
npm run dev
```

http://127.0.0.1:5180 에서 개발용으로 시작한다. 게임은 요일별 편성을 따르며 테스트 게임 선택·연습 경로는 삭제했다. API8081과 UI5180이 함께 실행된다. fixture를 생략하면 설정된 Gemini 키를 사용하며 실제 키는 서버에만 둔다. 개발 잔액/예시 응답은 운영 데이터가 아니다. 기본 개발 상태는 메모리에 저장되어 서버 재시작 때 초기화된다. AIMI_AI_MODE=fixture는 명시적인 예시 AI 테스트 모드다.

```sh
npm run typecheck
npm run build
npm test
npm run ait:build
```

.ait 생성은 업로드·실기기·심사·출시 완료가 아니다. API의 PostgreSQL 어댑터·추가 migration은 준비됐으나 원격 Supabase/Render에는 이번 새 코드를 적용하지 않았다. 설정 파일의 임시 appName `aimi`를 콘솔 등록명과 대조한다.

## 최신 정원·생성기 상태

정원은 드래그 자유 배치이며 GARDEN_FREE_PLACEMENT.md를 따른다. 생성기를 제외한 전 영역이 운영 완료된 것은 아니다. 실제 남은 콘텐츠 조회·발행·모델 수집·토스 인수는 CONTENT_STUDIO_IMPLEMENTATION_PLAN.md의 상태표를 먼저 확인한다.

## 범위

홈·미션·게임3종·규칙 챌린지·정원/상점/캐릭터·소셜·계정·개선기·추천을 구현했다. 상세 검증과 v1 제한은 PROTOTYPE_V1.md를 우선한다. 대표 에셋/과제는 PDF 기반 개발 예시다. 별도 생성기/자동 수집Actions·외부 설정/배포·사용자 실기기 작업은 제외했다. 프로덕션 경로는 검토 전 차단하며 로컬 fixture가 자동 사용되지 않는다.
