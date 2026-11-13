# AIMI 현재 구조

기준: 2026-11-13 실제 코드. 준비 단계의 빈 폴더 목록이 아닌 현재 구현 위치다.

| 경로 | 역할 |
| --- | --- |
| `apps/miniapp/src/app/` | 초기화·인증 복원·라우팅·화면 연결 |
| `apps/miniapp/src/features/home/` | 홈·미션 화면 |
| `apps/miniapp/src/features/challenge/` | 키워드·조합·결과·해설 |
| `apps/miniapp/src/features/optimizer/` | 프롬프트 개선·모델 추천·모델 상세 |
| `apps/miniapp/src/features/garden/` | 정원·상점·소셜·계정 화면 조합 |
| `apps/miniapp/src/features/profile/`, `legal/` | 닉네임·개인정보처리방침 |
| `apps/miniapp/src/ui/`, `lib/` | 공통 UI·플랫폼·API·안전 영역 |
| `apps/miniapp/src/games/shared/` | 게임 렌더러·입력·결과 |
| `apps/miniapp/public/` | 앱에 포함되는 이미지·SVG·폰트 |
| `apps/api/src/modules/` | routes·domain·repository와 거래 처리 |
| `apps/api/src/services/` | 토스·Gemini·콘텐츠·테스트 서비스 경계 |
| `packages/contracts/` | 공유 타입·Zod·경제/정원 정책 |
| `packages/game-core/` | 게임 시뮬레이션·버전별 replay |
| `packages/recommender/` | 모델군·필터·비용 비교 |
| `content/` | 앱/서버가 읽는 콘텐츠·모델 snapshot·일정·정책 |
| `data/model-sources/` | 재생성·검수·테스트용 모델 원본과 근거 자료 |
| `supabase/migrations/` | DB 변경 이력 |
| `tools/` | 개발·콘텐츠·자료 수집/검증 도구 |
| `design/` | 디자인 규칙·토큰·참조 PDF |
| `output/` | 로컬 빌드·배포·검증 결과. 원본 데이터와 구분 |

`game-core`와 `recommender`는 실제 npm workspace다. 개별 기능 폴더마다 독립 구현이 있는 것은 아니며 위 표의 조합 화면 파일을 따른다. README만 있던 준비 폴더는 제거했고 당시 설명은 [준비 기록](../archive/2026-11-development/FOLDER_PREPARATION_NOTES.md)에 보관했다.

의존성은 화면 → API 클라이언트 → 서버, 게임 렌더러/서버 replay → 공통 game-core, 추천 서비스 → recommender, 양쪽 계약 → contracts다. 서버 비밀과 챌린지 정답을 공개 앱 에셋으로 옮기지 않는다.

`data/model-sources`의 원본 해시는 이동 과정에서 바꾸지 않았다. 수집/생성 도구와 정책의 localFile·테스트 경로를 함께 변경했다. `output/model-audit`에 남은 coverage·선정 시뮬레이션·AI 평가·HTTP smoke 결과는 재생성 가능한 과거 보고서다.

## 종료된 웹 데모

Vercel 데모는 종료됐다. 종료 응답과 회귀 테스트를 위해 `api/demo.js`, `tools/build-web-demo.mjs`, 관련 테스트·설정은 유지한다. 이것을 별도 현재 서비스나 Android 인증 방식으로 사용하지 않는다. 제거는 종료 응답·기존 URL 처리까지 포함한 별도 작업이다.
