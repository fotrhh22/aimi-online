# 앱 콘텐츠

- `challenges/`: 날짜별 검수 이미지의 서버용 정답·리뷰·메타데이터.
- `fixtures/`: 모델 snapshot·개발 예시. 개발 fixture와 운영 콘텐츠를 구분한다.
- `catalog/`: 모델 선정·가용성·상품 메타데이터.
- `policies/`: 고정 모델군·수명주기 등 검수 정책.
- `schedules/`: 날짜별 프로그램 편성.

공개 이미지·폰트·정원 에셋은 `apps/miniapp/public/content/`와 `public/fonts/`에서 제공한다. 판정은 서버의 키워드 규칙이며 LLM 채점이 아니다. 생성기는 별도 프로젝트다.

모델 자료 재생성·검수 원본은 `../data/model-sources/`, 정책은 위 `policies/`, 실행 경로는 [현재 구조](../docs/current/PROJECT_STRUCTURE.md)를 따른다.
