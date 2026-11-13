# AIMI 운영 유지보수·배포

갱신: 2026-11-13. **앱인토스 배포 완료 후 업데이트 절차**다. 최초 구축 대기 안내는 [운영 이력](RELEASE_HISTORY.md)으로 대체한다.

## 구성

| 구성 | 위치 |
| --- | --- |
| 미니앱 프론트엔드 | 앱인토스 콘솔에 올리는 `.ait` |
| API | https://aimi-online-api.onrender.com |
| API 관리 | https://dashboard.render.com/web/srv-dbo2dvp5efls73cmt7qg |
| DB·이미지 | 기존 Supabase 프로젝트의 PostgreSQL·Storage |
| 소스 | https://github.com/fotrhh22/aimi-online |

## 변경 범위별 반영

| 변경 | 필요한 반영 |
| --- | --- |
| 화면·문구·번들 에셋 | 미니앱 빌드 → 새 `.ait` → 토스 테스트 → 콘솔 버전 업데이트 |
| 서버 로직 | 관련 검사 → 해당 API 소스 반영 → Render 배포 → 상태·동작 확인 |
| DB 구조 | 전진 호환 migration 준비·백업/검토 → 대상 확인 후 적용 → 필요한 서버/앱 업데이트 |
| 날짜별 콘텐츠·정답 | 콘텐츠 버전·검수·이미지 연결 확인 → 발행/편성 갱신. 서버 시작 시 읽는 자료는 재로드/재시작도 고려 |
| README·운영 문서 | 문서만 커밋. 불필요한 앱/API 재배포 없음 |

화면만 고칠 때 DB를 다시 만들거나 사용자 기록을 초기화하지 않는다. 운영 인증서·환경변수는 운영자가 관리하며, 문서 갱신을 이유로 바꾸지 않는다.

## 번들 생성

저장소 루트에서:

```sh
npm ci
npm run typecheck
npm run build
npm test
VITE_APP_RUNTIME=toss VITE_TEST_DEMO=false \
VITE_API_BASE_URL=https://aimi-online-api.onrender.com \
npm run ait:build
```

기본 결과는 `apps/miniapp/aimi.ait`다. 전달용 `output/releases/AIMI_FINAL.ait`를 갱신할 때는 생성 파일과 동일한 바이트를 복사하고 deploymentId·SHA256·생성 소스를 기록한다. 파일명이 같아도 버전은 다를 수 있다.

토스 콘솔에서 새 번들로 테스트 후 업데이트한다. 로컬 빌드, GitHub 반영, Render 배포, 토스 공개 버전은 서로 자동으로 같아지는 상태가 아니다.

## API·DB 운영

- Render 기본 빌드: `npm ci && npm run build:api`, 시작: `npm run start:api`.
- `/health/live`: 서버 생존 확인. `/health/ready`: DB·필수 준비 상태 확인. `/health`는 등록된 경로가 아니다.
- 위 경로의 의미를 설명하는 문서이며 이번 문서 정리에서 실시간 측정한 결과는 아니다.
- API용 `DATABASE_URL`과 migration용 `MIGRATION_DATABASE_URL`을 구분한다. 관리자 접속값을 앱/공개 CI에 넣지 않는다.
- migration 명령은 `npm run db:migrate`. 운영 DB 변경은 대상과 적용 범위를 확인한 별도 작업으로 실행한다.
- `NODE_ENV=production`, `ENABLE_DEV_AUTH=false`를 유지하고 테스트 모드로 실제 인증을 우회하지 않는다.
- 문서 전용 커밋에는 `[skip render]`를 사용해 불필요한 서버 배포를 피한다.

## 업데이트 후 확인

인증·기록 복원, EP 중복 지급 방지, 게임/챌린지 종료·복귀, AI 한도, 친구 요청/수락/삭제, 안전 영역·키보드를 변경 범위에 맞춰 확인한다. 문제가 생기면 기존 사용자 기록을 보존하며 이전 호환 API/번들로 되돌린다. 상세 목록은 [업데이트 점검](RELEASE_READINESS.md)을 따른다.
