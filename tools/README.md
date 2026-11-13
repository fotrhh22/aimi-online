# 개발·검증 도구

| 도구 | 용도 | 외부 호출 |
| --- | --- | --- |
| `dev.mjs`, `reset-preview.mjs` | 로컬 앱 실행·개발 기록 초기화 | 로컬 API |
| `assets/` | 정원 에셋 작성·변환·경계 검사 | 없음 |
| `model-sync/build-*.mjs`, `build-lifecycle-policy.py` | 보관된 원본으로 모델/정책 재생성 | 없음 |
| `model-sync/snapshot.mjs`, `collect-media.mjs`, `fetch-*.mjs`, `audit-lifecycle-collect.mjs` | API·공식 자료 수동 수집 | 있음 |
| `model-sync/audit-coverage.mjs`, `report-lifecycle.mjs` | 커버리지·수명주기 보고서 | 없음 |
| `eval-*.mjs`, `check-optimizer.mjs`, `check-recommendation-routing.mjs` | 실제 Gemini 분석 평가 | 유료/한도 사용 가능 |
| `qa/` | 화면·게임·호스트·거래 경계 검증 | 도구별 상이 |
| `build-test-ait.mjs`, `assert-toss-build.mjs` | 토스 테스트 번들·설정 검사 | 빌드 도구 |

모델 원본은 `data/model-sources/`, 앱이 읽는 확정 자료는 `content/`, 평가·진단 결과는 `output/model-audit/`로 구분한다. 원본 수집을 앱 요청마다 실행하지 않는다.

종료된 웹 데모의 도구/테스트는 종료 응답 회귀 검증용으로 유지한다. 상세 현재 실행은 [개발 안내](../docs/current/DEVELOPMENT.md), 운영 변경은 [배포 안내](../docs/current/DEPLOYMENT.md)를 따른다.
