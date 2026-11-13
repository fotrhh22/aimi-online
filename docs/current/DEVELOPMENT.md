# AIMI 로컬 개발

## 로컬 개발

Node.js **22.12 이상**과 npm을 사용합니다. 저장소 루트에서 실행하세요.

```sh
npm ci
AIMI_AI_MODE=fixture npm run dev
```

- 미니앱: `http://127.0.0.1:5180`
- 개발 API: `http://127.0.0.1:8081` — 프론트의 `/api` 프록시로 연결
- 개발 인증·초기 125 EP·예시 AI 응답은 로컬 확인용입니다. 실제 서비스 계정과 분리됩니다.
- 기본 설정에서는 API 재시작 시 개발 기록이 초기화됩니다. 새로고침만으로는 초기화되지 않습니다.
- `AIMI_DEV_PERSIST_STATE=true`로 설정한 경우에는 로컬 상태를 파일에 보관합니다.
- 종료는 실행 터미널에서 `Ctrl+C`. API 코드 변경 후에는 서버를 재시작합니다.

### 환경변수

실제 값은 `.env.local` 또는 Render의 서버 환경변수·Secret Files에 보관합니다. 예시는 [서버 설정](../../apps/api/.env.example), [프론트 설정](../../apps/miniapp/.env.example)을 참고하세요.

| 위치 | 주요 설정 |
| --- | --- |
| `apps/api/.env.local` | `DATABASE_URL`, `SESSION_SIGNING_KEY`, `AIMI_GEMINI_API_KEY` |
| 서버 AI 설정 | `GEMINI_TEXT_MODEL`, `OPTIMIZER_DAILY_LIMIT`, `RECOMMENDATION_DAILY_LIMIT` |
| 운영 인증 | `TOSS_CLIENT_CERT_PATH`, `TOSS_CLIENT_KEY_PATH` |
| 운영 통신 | `CORS_ALLOWED_ORIGINS`, Supabase·콘텐츠 설정 |
| migration 실행 환경 | `MIGRATION_DATABASE_URL` |
| `apps/miniapp/.env.local` | 공개 API 주소인 `VITE_API_BASE_URL` |

`AIMI_GEMINI_API_KEY`, DB 접속 정보, 토스 인증서·개인키 등 서버 비밀값은 `VITE_` 변수나 Git에 넣지 않습니다. 운영에서는 개발 인증·공유 테스트 계정을 활성화하지 않습니다. 기존 토스 OAuth용 연결 해제 설정은 익명 인증 경로와 구분합니다.

### 검사와 번들 생성

```sh
npm run typecheck
npm run build
npm test

VITE_APP_RUNTIME=toss VITE_TEST_DEMO=false \
VITE_API_BASE_URL=https://aimi-online-api.onrender.com \
npm run ait:build
```

생성 파일은 `apps/miniapp/aimi.ait`입니다. 로컬 개발 서버 실행, `.ait` 생성, 콘솔 업로드, 토스 실기기 테스트, 심사·배포는 각각 별도 단계입니다. 저장소의 과거 점검 기록은 당시 시점의 기록이며, 현재 배포 상태와 구분해 읽어주세요.



운영 절차는 [DEPLOYMENT](DEPLOYMENT.md), 구조는 [PROJECT_STRUCTURE](PROJECT_STRUCTURE.md)를 따른다. 종료된 Vercel 데모를 개발 서버나 운영 진입 경로로 사용하지 않는다.
