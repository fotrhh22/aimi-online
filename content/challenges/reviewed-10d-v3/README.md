# 검수한 10일치 콘텐츠 v3

2026-11-11 사용자 요청에 따른 Codex AI 시각·키워드·해설 검수. 이미지10개/기존 조건114개/기존 후보462개를 직접 대조했다. 현재 채점 조건110개, 후보314개. 원본 이미지는 그대로 재사용한다.

- day-XX/manifest.private.json: 채점·검수된 정답 프롬프트·생성 원문·작성 포인트2개·모델 참고1개.
- day-XX/review.json:114조건 및462개 기존 후보 각각의 판정/사유를 일별로 기록.
- day-XX/preview.public.json: 정답·해설 없는 공개 후보 규격.
- review-summary.json:10일 변경 집계.
- generation-evidence.json: 기존 생성 요청·파일 해시·앱 이미지 픽셀 동일성 대조.
- sources.json: 재확인한 공식 근거와 기존 PROMPT_TIPS.md 팁 ID 연결.

기존 v2 manifest와 authored_prompt를 덮어쓰지 않는다. 새 answer_prompt가 그림에 맞는 정답 예시이고, authored_prompt는 당시 생성 요청이다. responseModel이 없으므로 모델 식별은 생성 요청 및 실행 메타데이터 기준이다.

review.status=approved / reviewer_kind=ai / release_ready=true는 이번 요청에 따른 AI 검수 완료를 의미한다. published=false이며 원격 DB·Storage·Render 발행은 이번 작업에 포함하지 않았다. 기존 생성기나 원격 발행 도구를 자동 실행하지 않는다.

로컬 기본 조회는 v3를 사용하지만 기존 active challengeVersion이 v2이면 해당 도전은 그대로 끝낸다. 기존 API 프로세스는 재시작해야 변경 모듈을 읽는다. 기본 메모리 API의 재시작은 로컬 상태를 초기화하므로 자동 재시작하지 않았다.

재현: 저장소 루트에서 `python3 tools/content/review-10d/build.py`. 이 명령은 인터넷 호출/이미지 생성/DB 쓰기 없이 editorial.json과 기존 v2에서 v3를 만든다. 별도 generation-evidence와 문서는 원본 생성 기록을 읽어 작성한 검수 증거다.

검증: `npm test`, `npm run build`. 전체 검수 보고서와 일별 해설은 docs/CHALLENGE_10D_REVIEW_20261111.md, docs/CHALLENGE_10D_LEARNING_NOTES_20261111.md.
