# AIMI 온라인 개발 시작

이 폴더만 별도 작업 공간으로 열어 개발한다. 기준일 2026-11-08.

## 먼저 읽을 순서

1. [AGENTS.md](AGENTS.md): 범위·변경 금지·담당 경계.
2. [통합 개발 명세](docs/DEVELOPMENT_SPEC.md): 제품 규칙·화면·데이터·API·미결정.
3. [Light UX PDF](design/reference/AIMI_UX_Light.pdf): 6개 슬라이드, 18개 모바일 상태.
4. [디자인 양식](design/DESIGN_SYSTEM.md), [토큰 JSON](design/tokens.json).
5. [현재 구현 상태](docs/IMPLEMENTATION_STATUS.md), [토스 공식 링크](docs/TOSS_REFERENCES.md).
6. [환경변수·Supabase·Render 계획](docs/INFRASTRUCTURE_PLAN.md), [전체 구현 단계](docs/IMPLEMENTATION_PLAN.md).

문서는 서로 역할이 다르다. 기능·경제 규칙은 개발 명세, 배치·문구는 최신 PDF, 수치화된 UI 기준은 디자인 양식을 따른다. PDF의 EP·점수·가격·모델명은 예시이며 실측·운영 설정 확정이 아니다.

## 지금 실행하기

권장 Node.js 22.12 이상 LTS, npm. 설치 시 SDK 버전과 package-lock을 유지한다.

```sh
cd /Users/hunhokang/Downloads/esg_campaign/aimi-online
npm install
npm run dev
```

브라우저에서 http://127.0.0.1:5180/ 를 연다. 종료는 터미널 Control+C.

```sh
npm run typecheck
npm run build
npm run ait:build
```

마지막 명령은 로컬 .ait 번들만 생성한다. 콘솔 업로드·출시가 아니다. `apps/miniapp/apps-in-toss.config.ts`의 `appName: 'aimi'`는 임시값이다. 실제 콘솔 등록 이름과 확인해야 한다. Vite 브라우저 미리보기는 토스 네이티브 상단 바를 흉내 내지 않는다.

## 이번 세팅의 범위

완료: 독립 npm workspace, React/TypeScript/Vite, 공식 SDK 3.10.0 설정, 홈 화면, 출석·팁 팝업, CSS 디자인 토큰, 기준 문서·PDF·Figma ZIP 복사.

미연결: 토스 로그인·네이티브 내비게이션 이벤트, 공식 TDS 컴포넌트 전환, API·DB·게임·LLM·추천 데이터·친구·정원 저장. 홈 보상은 메모리 미리보기이며 새로고침하면 125 EP로 돌아간다. 서버 경제 기능으로 재사용하지 않는다. 버튼은 준비 안내를 보여주며 미구현 기능이 작동하는 것처럼 처리하지 않는다.

## 다음 에이전트에게 그대로 전달할 시작 요청

> 이 폴더의 AGENTS.md, START_HERE.md, docs/DEVELOPMENT_SPEC.md, design/DESIGN_SYSTEM.md와 design/reference/AIMI_UX_Light.pdf를 읽고 AIMI 앱인토스 서비스를 개발해라. 기존 캠페인 서비스와 분리해 이 폴더 안에서만 작업해라. 현재 구현·미구현은 docs/IMPLEMENTATION_STATUS.md를 따른다. 우선 공통 화면·라우팅·API 계약을 만들고 길 건너기 한 게임 → 예산 → 키워드 조합 → 결정적 조건 판정 → EP → 정원 저장의 수직 흐름부터 완성해라. 실제 백엔드 연결 전에는 목업 경계를 명확히 두고, 서버 확정 없이 EP·횟수를 신뢰하지 마라. 기존 디자인·문구·간격을 임의로 다시 설계하지 말고 미결정 수치만 명세의 제안값 또는 버전 설정으로 분리해라. 앱인토스 SDK 3.x 타입과 docs/TOSS_REFERENCES.md의 공식 자료를 확인하며 구현해라. 설치·검증은 진행하되 외부 서비스 생성·배포·메시지 발송은 별도 지시 전 실행하지 마라.

이 문서는 새 Codex 채팅을 자동 생성하거나 현재 채팅의 작업 폴더를 자동 전환하지 않는다. Codex에서 이 폴더를 새 프로젝트로 열고 위 요청을 붙여 넣으면 된다.
