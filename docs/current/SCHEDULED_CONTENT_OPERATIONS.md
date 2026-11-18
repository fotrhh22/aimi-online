# 날짜별 승인 콘텐츠 API 반영 · 2026-11-18

## 적용 상태

Oracle 접속값, 운영 DB 마이그레이션, 전용 DB 역할, 이미지 Storage 준비 완료. Render 설정·배포는 운영자가 직접 진행한다. 새9개 생성·검수·Telegram 승인·발행은 수행하지 않았다.

- migration: `supabase/migrations/202611170009_scheduled_content.sql` 적용 및 체크섬 등록 완료. 다시 실행할 필요 없음.
- 추가 테이블: `aimi.content_drafts`, `aimi.content_publications`, `aimi.scheduled_content`.
- worker: `aimi_content_worker` → `aimi_content_writer`. API DB 역할 `aimi_api`에 승인·편성 테이블 읽기만 추가.
- Storage: `aimi-weekly-images`, 공개 이미지 전용, PNG/JPEG/WebP, 최대10MiB. 기존 이미지 버킷 유지.
- 적용 후 기존 릴리스20개 유지, 새 초안·승인·편성0개.

## Render 직접 적용

1. 브랜치 `codex/scheduled-content-operations-20261118`의 API 변경을 운영 브랜치에 반영한다. 기존 로컬 UI 변경과 독립된 변경이다.
2. AIMI API 서비스의 Environment에 `AIMI_CONTENT_SCHEDULED=true`를 추가한다. 기존 `DATABASE_URL`, `AIMI_CONTENT_SOURCE`, Supabase·토스 인증값은 유지한다. worker의 `CONTENT_DATABASE_URL`이나 OpenRouter 키를 Render에 추가하지 않는다.
3. 기존 Build Command `npm ci && npm run build:api`, Start Command `npm run start:api`로 해당 커밋을 배포한다.
4. `/health/ready`의 성공과 기존 앱 콘텐츠 표시를 확인한다. 새 편성이0개이므로 기존10일 순환이 유지된다. 준비 상태 성공만으로 이 변경의 활성화를 입증할 수는 없으므로 배포 커밋·환경값을 함께 확인한다.

API는 시작 시 승인된 일정을 읽고60초마다 마지막 승인 시각 이후만 조회한다. 미래 날짜에 승인된 이미지·키워드·팁을 함께 사용하고, 진행 중 세션의 고정 버전을 보존한다. 날짜 편성이 없으면 기존10일 콘텐츠를 사용한다. 공개 응답에 정답·원문 프롬프트를 추가하지 않는다.

되돌릴 때는 `AIMI_CONTENT_SCHEDULED=false`로 배포한다. 스키마·발행 이력·사용자 기록을 삭제하지 않는다. 실제 새 콘텐츠 공개 이후에는 진행 중 새 버전을 이전 코드가 복원하지 못할 수 있으므로 버전 지원을 유지한 채 되돌린다.

## 검증

- 독립 체크아웃에서 API 빌드 통과.
- 예약 콘텐츠 테스트2개 통과: 승인 날짜/팁/이미지 연결, 진행 중 버전 보존, 동시 조회 중복 방지, preview/변조/잘못된 팁 거부.
- 전체122개 중121통과. 모델 추천 HTTP 테스트1개는 변경 전main에서도 재현된 기존 실패이며 이번 변경에서 수정하지 않았다.
- 운영 API 계정으로 추가 테이블 읽기 확인. 실제9개 발행·운영 Render 동작 검증은 미수행.

Oracle의 자동 생성·승인 서비스는 disabled/inactive, `CONTENT_AUTOMATION_ENABLED=false`다. 실제 제작·사람 검수 전에는 활성화하지 않는다. 이 API 작업만으로 `.ait` 재생성은 필요 없다.
