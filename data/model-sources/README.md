# 모델 원본·검수 근거

`output/model-audit/`에 섞여 있던 재생성 입력을 분리한 경로다. 이동 시 원본 바이트를 유지했으며 출처별 해시·수집일은 기존 자료와 정책에 남아 있다. 최신 제공 상태를 보장하는 실시간 API가 아니다.

- `openrouter-current.json`: 텍스트 모델 재생성·검수의 원본.
- `group-sources/`: 제작사 자료·수집 인덱스·보충 근거.
- `group-review-decisions.json`, `group-classification-before.json`: 모델군 재생성 입력.
- `multimodal/`: 전체 모델·이미지/영상 전용 자료·이미지 엔드포인트.
- `lifecycle/`, `openai-deprecations-2026-11-10.md`: 수명주기 원본·공식 공지 검수 근거.

실행 앱은 `content/`의 정리된 snapshot·정책을 읽는다. 공개 API/사이트 자료에 포함된 키 형태 문자열을 실제 서비스 키로 사용하지 않는다. 실제 인증키·결제키는 이 폴더에 저장하지 않는다.

생성 결과·커버리지·추천 평가·smoke 로그는 `output/model-audit/`에 보관한다. 자료 재수집은 수동 도구이며 이번 경로 정리에서 외부 API 호출이나 콘텐츠 재발행을 실행하지 않았다.
