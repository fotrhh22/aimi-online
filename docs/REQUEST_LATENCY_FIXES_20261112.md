# 요청 지연·Gemini·입력 확대 수정

2026-11-12. REQUEST_AND_DB_LATENCY_AUDIT_20261112.md 후속 구현. 기존 토스 로그인/공유 테스트 계정은 유지하며 Render 무료 절전 정책은 변경하지 않는다.

## 구현

- perform 갱신 모드 state/all/none/background 분리. 일반 변경은 state만 갱신한다. 게임 시작/정산·AI job 시작·추천은 서버 응답 후 바로 결과를 반환하고 상태를 뒤에서 갱신한다. 인증은 all, 힌트·챌린지 제출은 공개 콘텐츠까지 all로 갱신한다.
- 복사·초대·친구 방문·로그아웃·탈퇴는 후속 공통 refresh를 생략. 로그인 내부 중복 refresh 제거. 소셜 action.then의 중복 reload 제거. 테스트 호출 한도 정보는 계정 페이지에서만 조회.
- refresh에 순번/토큰 가드를 넣어 오래된 응답이나 초기화 이전 세션의 응답이 새 상태를 덮어쓰지 않도록 한다.
- PostgresRepository read/readMany는 지갑과 상태를 JOIN한 단일 SELECT snapshot. 기존 사용자 읽기에서 INSERT/UPDATE/행 잠금 제거. 최초 상태 생성만 transaction으로 처리한다. 실제 EP 원장·구매·시도·보상 거래의 잠금은 유지한다.
- 테스트 인증은 현재 epoch SELECT로 확인한다. 읽기는 공유 상태를 SELECT하고 현재 epoch와 ID를 다시 검사한다. reset 후 이전 토큰은 읽기와 쓰기 모두 차단한다. 상태·한도 조회는 쓰지 않는다. session 시작/초기화/거래/AI 예약은 원자적 쓰기를 유지한다.
- 소셜은 본인 조회 후 친구를 한 번에 조회. 운영 기준 친구 수와 무관하게 인증1+본인1+친구batch1 SQL(친구 없으면2). 친구 방문도 실제 GET 결과를 즉시 사용한다.
- AI job polling은 일반 상태 SELECT,60초 중단 복구에만 transaction. 응답 뒤 대기를700ms에서 최대2.5초로 점진 증가한다. 모델 snapshot 파일은60초 캐시.
- 모든 입력/검색/수치/선택/편집 요소 최소16 CSS px. 선택 상자의 font:inherit에도 적용되는 공통 불변 규칙. 버튼/링크는 touch-action:manipulation으로 더블탭 확대 방지. 사용자 pinch 확대를 막는 maximum-scale/user-scalable=no는 사용하지 않는다. 이미 확대된 구 번들은 새 QR로 다시 열어야 한다.
- 개선기 실패 코드 원문 대신 errorText 안내를 표시한다.

## 비용 비교(기존 사용자, EP 변화 없는 게임 시작 기준)

|흐름|이전|수정|
|---|---|---|
|운영 게임 표시까지 SQL|시작+state/content 인증 포함21문장|시작7문장, 이후 배경state2문장|
|테스트 게임 표시까지 SQL|시작+state/content 인증 포함30문장|시작6문장, 이후 배경state2문장|
|운영 단순 read|6문장·행 잠금2개·UPDATE|1SELECT|
|운영 친구10명 조회|67문장, 친구별 순차|3SELECT|

SQL 개수는 응답 초 단위 보장이 아니다. Render 절전과 네트워크/DB 대기는 별도다. 거래 후 잔액/횟수는 서버 값으로 반영하며 클라이언트가 임의 승인하지 않는다.

## 검증

- 타입 검사·빌드·단위/도메인108개 통과.
- 별도 임시 로컬 PostgreSQL에서5개 통합 테스트 통과. 동시 구매/원장/중복/챌린지/세션/초기화 회귀와 운영·데모 read 전후 xmin(행 버전) 불변 검사 포함. 원격 데이터 리셋 없음.
- headless CSS 검사: 입력5종 모두16px, 버튼 touch-action,320/393/480px 공통 안전 영역21개 통과. 실제 iOS 키보드 자동 확대와 토스 WebView는 새 QR 실기기 확인 필요.
- Render 환경변수는 기존 로컬 AIMI 키를 값 출력 없이 AIMI_GEMINI_API_KEY로 등록하고 GEMINI_TEXT_MODEL을 유지했다. 직접 Gemini 모델/JSON 호출 PASS. 기존 테스트의48시간·20회/시간 제한 유지.
- CI는43035404198에서DB 테스트가 실패했던 기록이며 뒤의43035788140/43036109593은 성공. API_NOT_CONFIGURED와 CI 실패는 별개다. 최신 커밋 CI/원격 반영은 후속 확인.
- migration 변경 없음. 최신 API 코드는 Render 배포 필요, 프론트는 새 .ait 업로드 필요.


## 실제 호출 후 보정

Render의 실제 개선기 호출이 Gemini 응답을 받은 뒤 AI_INTENT_CHANGED로 거절되는 경로를 확인했다. 정적 검증에서 ‘세 가지’→‘3가지’ 숫자 표기도 거절하던 문제를 보정했다. 한글 수량과 숫자는 동등 비교하고,3→30 같은 실제 변경은 여전히 거절한다. 해당 회귀 검사 추가. 키 미설정과 출력 검증 오류는 별개다.
