# 앱인토스 최종 산출물·UI/UX 인수 계약

갱신: 2026-11-13. AIMI는 앱인토스 배포를 완료했다. 이 문서는 이후 업데이트에도 적용할 산출물·UI/UX 기준이다. 현재 상태는 IMPLEMENTATION_STATUS.md, 회귀 점검은 RELEASE_READINESS.md를 따른다. 최초 정책 조사표는 당시 기록이며 현재 판정표로 사용하지 않는다.

## 최종 구현물

| 항목 | 내용 | 완료 증거 |
|---|---|---|
| 미니앱 | apps/miniapp의 CSR 화면·게임·에셋·SDK 연결 | 고정 lockfile로 재현 가능한 build, 토스 실행 검증 |
| 배포 번들 | 현재 저장소 npm run ait:build가 생성하는 .ait | 실제 생성 위치/파일명·크기·SHA256·commit을 release 기록에 명시. 추정 파일명을 기재하지 않음 |
| API | apps/api의 Render HTTPS 서버, 환경변수 이름/설정 안내 | 실제 배포 버전·live/ready·인증/거래 검증 |
| DB/Storage | supabase/migrations, 콘텐츠/상품 seed 또는 검증 import, 역할·권한, 승인 에셋 | migration/재실행·권한·등록/조회·재현성 검사 |
| 자동화 | GitHub CI와 AA/OpenRouter 자료 수집 | 정상/실패 시 snapshot 유지 검증 |
| 인수 자료 | 기능/실기기 체크 결과·알려진 제한·콘솔 설정·운영/롤백 안내 | docs/releases/ 아래 실제 버전별 기록(완성 시 생성) |

.ait는 미니앱 프론트엔드 번들이며 Render API나 DB가 들어가는 파일이 아니다. 서버 키·DB 관리자 비밀번호·Gemini 키는 번들/공개 저장소에 포함하지 않는다. PDF/Figma는 디자인 기준이며 최종 실행물은 아니다. 별도 설치형 Android/iOS 앱 산출물은 현재 목표에 없다.

명령(저장소 루트): npm run typecheck, npm run build, npm test, 필요 PostgreSQL 통합 검증, npm run ait:build. 명령이 성공해도 토스 실기기·검수·출시 완료로 대체하지 않는다. 콘솔 appName/권한·브랜드·실제 API origin/CORS·운영/테스트 환경을 맞춘 뒤 .ait 업로드→테스트용 스킴→실기기 테스트→검수/출시 상태를 각각 기록한다. 신규 scaffold CLI의 예시와 기존 SDK3.10.0 프로젝트 명령을 무검증 혼합하지 않는다.

## 기준 적용 순서

공식 앱인토스 필수 가이드/실제 SDK 지원 → 확정 PDF의 기능·배치 의도 → AIMI 디자인 토큰/컴포넌트 계약. 공식 요구와 PDF 표현이 충돌하면 숨겨서 무시하지 말고 구체적인 차이를 기록해 공식 기준에 맞게 구현한다. 미학 변경을 이유로 PDF 전체를 재설계하지 않는다.

공통 컴포넌트 Phase1에서 설치된 SDK에 호환되는 TDS 패키지·Provider·공식 API를 검증한 후 사용 가능한 기본 요소를 래핑한다. 현재 SDK3.10.0과 TDS Provider/주요 Button을 사용한다. 과거 웹 시연의 TDS 분리는 종료된 테스트 이력이며 현재 토스 빌드를 웹 모드로 대체하지 않는다. 설치만으로 전체UX 준수 완료라고 하지 않는다. 게임/비게임 분류에 따른 TDS 적용 범위/내비게이션 차이는 공식 기준과 콘솔 분류를 확인한다. 게임 장면/정원 장식은 AIMI 구현으로 유지한다.

## UI/UX 필수 인수 항목

- SDK 상단 내비게이션/닫기, Android 시스템 뒤로가기·최초 화면 종료·딥링크 복귀를 실제 호스트에서 검증. 자체 뒤로가기와 중복 금지.
- 모든 화면/팝업에서 앱 이탈 가능. 만점 결과는 챌린지 단일 CTA를 유지하되 SDK 닫기/시스템 뒤로가기를 가리거나 차단하지 않는다. 강제 챌린지 참여 구조로 만들지 않는다.
- 홈/미션/정원/소셜4탭은 공식 플로팅 형태. 자체 일반 하단 탭 모양으로 대체하지 않는다.
- safe area·Dynamic Island·작은 화면·키보드·큰 글씨·긴 한국어·하단CTA 가림·스크롤 확인. 375×812는 설계 기준이며 고정 viewport가 아니다.
- 라이트 UI, 공통 색/간격/문구·일관된 로딩/오류/빈 상태. 실제 TDS 사용과 자체 컴포넌트를 구분한다.
- 해요체와 명확한 행동 CTA. 공식 가이드상 다이얼로그 왼쪽 버튼은 닫기, 오른쪽은 주요 실행이다. 처리 중 닫기·시스템back을 막지 않고 거래 결과는 서버에서 재조회한다.
- 진입 즉시 로그인/알림 유도 바텀시트 자동 노출 금지. 필요한 동의/권한은 해당 행동 시점에 설명한다. 이탈 방해·예상 못한 광고·외부 자사 앱 설치 유도 금지.
- 게임 풀스크린/선택 방향/일시정지/백그라운드/복귀. 사운드를 넣으면 사용자 on/off와 백그라운드 중단 검증.
- HTTPS API, CSR/정적 번들, 서버 코드/비밀의 클라이언트 포함 금지. Render 사이트를 iframe/WebView로 통째로 불러오는 방식 금지.
- 게임 가이드의 최초 화면10초 이내, 인터랙션2초 이상 지연 없음 기준을 실기기 측정. 앱 진입에 전체 콘텐츠/상품을 미리 다운로드하지 않는다.
- 브랜드 이름/600×600 로고 등 콘솔 자료를 실제 등록정보와 일치시킨다. SDK3 brand 설정에 2.x 전용 필드를 무검증 추가하지 않는다.

## 초기 단계별 인수 구분 — 참고 기록

Phase0: 게임/비게임 분류 확인 항목·콘솔 임시 설정 목록·가이드 대응표. Phase1: TDS 호환 검증/대표 UI·safe area/내비게이션 계약. 각 기능: PDF 상태와 API 정상/오류/한도/재진입 검증. Phase12: 전체 실기기 결과와 미충족 항목, 재현 번들/서버/DB 버전 기록. 브라우저 미리보기·.ait 생성·콘솔 업로드·실기기 통과·심사 승인·운영 공개를 구별한다.

## 공식 출처

- https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md
- https://developers-apps-in-toss.toss.im/design/components.md
- https://developers-apps-in-toss.toss.im/checklist/app-game.md
- https://developers-apps-in-toss.toss.im/checklist/app-nongame.md
- https://developers-apps-in-toss.toss.im/guide/operation/toss.md
- https://github.com/toss/create-ait-app/blob/main/README.md
