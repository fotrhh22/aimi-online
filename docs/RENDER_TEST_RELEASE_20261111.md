# 2026-11-11 토스 테스트용 최신 반영

## 반영 범위

- 소스 commit: `7531f43d64e89762524c1bd83b6b32c95fcff539`.
- 토스 로그인은 기존 코드 그대로 유지. 익명키/게스트 인증/원격 개발 로그인 추가 없음.
- 최신 게임 v12, 첫 챌린지 제출 후 게임 차단, 확인 후 챌린지 보상 지급, UI/뒤로가기/정원/소셜 수정 포함.
- Supabase migration 6개는 기존 checksum과 동일하며 미적용 SQL 없음. 계정·잔액·플레이 기록을 초기화하지 않음.
- 새 일일 프로그램: `daily-program-v2-reviewed-v3-preview-20261111`.
- 검수된 v3 챌린지 10개, 작성 포인트20개 + 모델 참고10개, 오늘의 팁10개와 요일별 게임 일정. 기존 v2 릴리스는 보존.
- 이미지는 Storage 업로드 후10개 모두 SHA256 검증. 공개 Storage에는 이미지만 두고 정답 manifest는 private aimi 스키마에 유지.
- DB 배포 등급은 `preview`, 사람 승인/정식 출시를 뜻하지 않는다. 콘텐츠 검수자는 AI로 기록.

## Render 설정

기존 비밀값을 유지하고 다음 설정만 merge했다.

- `ENABLE_DEV_AUTH=false`
- `AIMI_CONTENT_SOURCE=supabase`
- `AIMI_CONTENT_PREVIEW=true`
- `AIMI_RELEASE_VERSION=prototype-v1-preview`
- `CORS_ALLOWED_ORIGINS=https://aimi.apps.tossmini.com,https://aimi.private-apps.tossmini.com,http://127.0.0.1:5180,http://localhost:5180`

서비스: https://dashboard.render.com/web/srv-dbo2dvp5efls73cmt7qg

배포 ID: `dep-dbq6vtetehms73bb38gg`.

## 번들

`output/releases/2026-11-11-toss-test/AIMI_Toss_Test.ait`

실제 크기·SHA256·기준 commit은 같은 폴더의 `BUILD_RECORD.json` 참고. 토스 콘솔 업로드는 하지 않았다.

## 검증

- 전체101개 단위/도메인 테스트와 API/미니앱 빌드 통과.
- GitHub CI 통과: https://github.com/fotrhh22/aimi-online/actions/runs/43031035655 (별도 PostgreSQL 통합 테스트 포함).
- 번들에 로컬 서버 비밀값5개가 포함되지 않음을 검사.
- 원격 개발 로그인/테스트 친구 복구404, 미인증 state401 및 토스 운영/테스트 CORS 확인.

## 남은 연결

실제 토스 로그인은 사업자·콘솔 로그인 설정·mTLS 인증서/개인키·연결 해제 콜백 설정이 필요하다. `.ait` 생성/업로드는 이를 대신하지 않는다. 현재 인증이 미설정이면 실제 토스 앱에서 데이터 기능 전체를 테스트할 수 없다.

기존 변수: `TOSS_CLIENT_CERT_PATH`, `TOSS_CLIENT_KEY_PATH`, `TOSS_UNLINK_BASIC_AUTH`. 새 인증 변수는 추가하지 않았다. 서버 키는 변경하지 않았고 값은 기록하지 않는다.

## 복구

직전 활성 프로그램의 버전 목록은 로컬 `output/releases/content-before-reviewed-v3-20261111.json`에 보관했다. 콘텐츠 회귀가 필요하면 해당 프로그램만 다시 활성화한 뒤 API를 배포한다. 계정/원장 삭제로 복구하지 않는다. 게임 v11 및 진행 중 v2 챌린지 조회는 코드에서 보존한다.

## 최종 배포 확인

Render 상태live, 실제 /health/ready.commit=7531f43d64e89762524c1bd83b6b32c95fcff539. live/ready200. content.source=supabase, releases=10, preview=true. health의version은 내부 tip/game프로그램인 daily-program-v2이며, DB 활성 릴리스 프로그램 ID는 daily-program-v2-reviewed-v3-preview-20261111이다. 서로 다른 버전 필드다.
