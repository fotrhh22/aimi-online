# AIMI 개발·운영 시작 안내

갱신: 2026-11-13 · Asia/Seoul. **AIMI는 앱인토스 배포를 완료했다.** 운영자가 알려준 배포 상태를 현재 기준으로 사용한다.

## 먼저 읽을 문서

1. [README](README.md): 서비스 소개·기능·로컬 실행·환경변수.
2. [현재 구현·운영 상태](docs/IMPLEMENTATION_STATUS.md): 현재 상태의 기준 문서.
3. [유지보수·배포](docs/DEPLOYMENT.md): 기존 서비스 업데이트 절차.
4. [업데이트 점검](docs/RELEASE_READINESS.md): 다음 배포의 회귀 점검 기준.
5. [운영 이력](docs/RELEASE_HISTORY.md): 출시 전 점검과 종료된 웹 데모의 짧은 기록.

AGENTS.md는 작업 범위·비밀 관리 기준이다. 기능 변경은 공유 계약과 키워드 퍼즐·모델 추천·정원 규격을 함께 확인한다. 초기 개발 계획이나 날짜별 조사 기록의 ‘아직 미구현/심사 대기’는 당시 상태이며 현재 출시 상태를 덮어쓰지 않는다.

## 로컬 개발

```sh
npm ci
AIMI_AI_MODE=fixture npm run dev
```

프론트는 http://127.0.0.1:5180, 개발 API는 8081에서 실행된다. 개발 인증·초기 재화·예시 응답은 실제 계정과 분리된다. 기본 개발 기록은 API 재시작 때 초기화되며, 실제 DB·토스 사용자 기록을 초기화하지 않는다.

```sh
npm run typecheck
npm run build
npm test
VITE_APP_RUNTIME=toss VITE_TEST_DEMO=false npm run ait:build
```

운영 API 주소는 apps/miniapp/.env.example을 참고한다. `.ait` 생성과 토스 콘솔 반영은 별도 작업이다. API·DB를 바꾸지 않는 화면 수정에 불필요한 migration·서버 배포를 추가하지 않는다.

## 작업 경계

- 현재 서비스: 앱인토스 미니앱 + Render API + Supabase DB/Storage.
- 실제 인증: 토스 익명 인증 코드 교환·mTLS·서버 세션. 기존 OAuth 경로는 호환용이다.
- 별도 콘텐츠 생성기·향후 자동 제작/수집은 유지보수 과제이며 출시 미완료의 근거로 취급하지 않는다.
- 종료된 웹 데모를 사용자 진입 경로나 신규 배포 대상으로 안내하지 않는다.
