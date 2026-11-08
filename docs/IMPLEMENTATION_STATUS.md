# 현재 구현 상태

갱신: 2026-11-08.

## API·DB 기반 구현 결과

- 독립 Git 저장소 초기화, 원격 `fotrhh22/aimi-online` 연결. 부모 원격은 변경하지 않음.
- Fastify API·Zod 공유 계약 workspace, 설정 검증·CORS·오류 응답·세션 인증·health 구현.
- 초기 migration 실제 개발 Supabase 적용: `aimi` 비공개 스키마에 사용자·세션·지갑·원장·보상·멱등성·개발 정책 및 migration 이력 생성.
- API 전용 `aimi_api` 역할 생성, 관리자 migration 연결과 분리. 공식 CA로 인증서·호스트 검증 활성화.
- 출석/팁의 잠금·원장·잔액·멱등성 거래 구현. 보상 5/3은 개발 정책이며 운영 지급은 차단.
- 단위 4개·실제 PostgreSQL 통합 1개(동시/중복 보상·요청 충돌·자정 재시도·원장 일치·세션 폐기) 통과. migration 재실행 무변경, 테스트 계정 정리 완료.
- 전체 build·typecheck 통과, 의존성 audit 0 vulnerabilities. Gemini 확정 모델 합성 요청 1회·JSON 응답 검증 성공.
- GitHub CI 작성: 외부 키 없이 PostgreSQL service로 migration·통합 검증.
- 미니앱 홈은 기존 데모. 토스 로그인·홈 서버 연결·게임·구매·모델 수집은 아직 미구현.

아래 초기 준비 기록은 이전 시점이다. 현재 API·DB 상태는 이 절을 우선한다.

## 이번 개발 계획·인프라 점검

- 사용자 확정: Gemini 모델 `gemini-3.1-flash-lite`, GitHub 저장소 `https://github.com/fotrhh22/aimi-online`. 로컬·예제 모델 설정 반영. 원격 연결·API 실제 모델 호출은 아직 미검증.

- 실제 PostgreSQL 읽기 전용 연결 확인: 인증·조회 성공, 클라이언트 TLS 사용, public 기본 테이블 0개. migration은 아직 적용하지 않음.
- `tools/check-db-connection.py` 추가: 비밀값 출력 없이 연결·TLS·public 테이블 수 확인.

- 사용자 확인: GitHub 저장소와 AIMI 전용 Supabase 프로젝트 생성 완료. URL·프로젝트 식별 및 연결은 아직 검증하지 않음.
- 로컬 `.env.local` 3개 생성, 파일 권한 600·Git 제외 확인. 세션 서명 키 생성, 외부 API 키·DB 연결값은 사용자 입력 대기. 설정 로더·연동 코드는 아직 없음.

- 추가 요청 반영: [API·Gemini $200·Actions·게임 소스 계획](API_AND_GAME_RESOURCES_PLAN.md) 작성. 사용자 재정정: Google 무료 등급 사용 의도. $200 프로모션 크레딧 가정 제거, 실제 Free Tier 모델·호출 한도 확인 예정.
- `.env.example`에 Free Tier 설정·유료 사용 비활성 제안·별도 예산/차단 정책, OpenRouter/AA endpoint·수집 제한 추가. 실제 비밀값·수집 코드·Actions 실행·소스 반입은 없음.
- 공식 Phaser 템플릿의 현재 Phaser 4/React 19 의존성과 예제 에셋 별도 제한 확인. 기존 AIMI에 무검증 덮어쓰기하지 않고 버전·출처 선별 예정.

- [전체 앱 구현 단계 P0~P8](IMPLEMENTATION_PLAN.md)와 [환경변수·Supabase·Render 계획](INFRASTRUCTURE_PLAN.md) 작성.
- API·모델 수집 작업용 `.env.example` 추가. 비밀값 입력·설정 로더 구현은 아직 안 함.
- 사용자가 Render `My Workspace` 사용 및 Supabase 신규 구성 전제를 확인함.
- Render read-only 조회: 기존 API 서비스 2개, AIMI 전용 서비스 없음. Supabase 계정 상태는 직접 조회하지 않음.
- 이번 `npm run build` 재검증 성공(TypeScript 포함). API·DB·외부 배포는 여전히 미구현/미실행.
- 현재 AIMI는 부모 Git 저장소 내 untracked 폴더. 배포 전 저장소·브랜치·추적 상태 확정 필요.

## 준비 완료

- 독립 폴더와 npm workspace, package-lock.json.
- React 18 + TypeScript + Vite 7 + 공식 앱인토스 SDK 3.10.0.
- SDK 3.x apps-in-toss.config.ts, 임시 appName `aimi`.
- 최신 Light UX PDF·개발 명세·Figma ZIP 복사와 디자인 규칙·토큰.
- 모바일 홈: AIMI·EP, 오늘 게임·잔여 횟수·최고 기록, 출석·팁, 개선기·추천·정원, 플로팅 탭.
- 출석·팁 팝업: 밝은 블러·공통 간격·닫기·ESC·초점 복귀.
- 세션 메모리에서만 중복 보상 방지. 새로고침하면 초기화되는 데모.
- 기능 진입 버튼은 미구현 안내. 게임·AI 기능이 실행되는 척하지 않음.

## 확인 완료

- npm 설치, 설치 시 audit 0 vulnerabilities.
- `npm run build`: TypeScript + 프로덕션 Vite 빌드 성공.
- `npm run ait:build`: 로컬 `apps/miniapp/aimi.ait` 생성 성공. 업로드·출시하지 않음.
- 개발 서버 포트 5180 기동.
- 문서 내 최신 기준 파일의 복사본과 경로 검증.

## 아직 구현하지 않은 것

- 토스 로그인·네이티브 내비게이션 이벤트, TDS Provider·공식 컴포넌트 적용.
- API 서버·Supabase migration·실제 EP 거래·게임 시도·기록·판정.
- 게임 3종·실제 캐릭터/정원 에셋·아이템 배치·저장·친구 관계.
- Gemini 개선·분석·추천, AA/OpenRouter 데이터 수집.
- 토스 샌드박스·실기기·브라우저 상호작용/시각 검증.

## 다음 개발 순서

1. 실제 appName·토스 분류·공식 TDS 적용 방식 확인.
2. 화면 라우트·contracts 타입·mock repository 경계 확립.
3. API 인증·DB 경제 원장·버전 콘텐츠.
4. 길 건너기→예산→키워드→조건 판정→EP의 수직 흐름.
5. 정원/친구, 개선기/추천, 추가 게임 순으로 확장.

apps/api, packages/contracts, content, tools는 개발 경계만 마련한 폴더다. 서버가 있다고 표현하지 않는다. 숫자·호출 한도·보상표는 DEVELOPMENT_SPEC의 결정 필요 항목을 따른다.
