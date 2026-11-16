# 시작 지연 서버 계측

2026-11-16. API 동작·인증 만료·보상 정책·DB 스키마는 변경하지 않고 측정만 추가한다.

## 범위

`/v1/state`, `/v1/content`, `/auth/anonymous`, `/health/live`, `/health/ready`에 응답 헤더와 구조화 로그를 남긴다. 사용자의 실제 데이터·닉네임·식별키·세션·인증 코드·SQL·매개변수·URL 쿼리는 기록하지 않는다. 추가 HTTP 요청이나 주기적 점검은 만들지 않는다.

| 헤더 | 의미 |
| --- | --- |
| Server-Timing: app | Fastify가 요청을 받은 뒤 응답 준비까지 걸린 ms |
| db_connect | pg 연결 풀에서 연결을 받는 데 걸린 누적 ms. 풀 대기·새 연결 DNS/TLS/DB 인증을 포함하며 이를 더 세분화하지는 않는다 |
| db_query | 연결을 받은 뒤 SQL 응답까지의 누적 ms. DB와 서버 사이 네트워크도 포함 |
| partner | 토스 익명 인증 교환 함수의 소요 ms |
| uptime | 요청 수신 시 프로세스 가동시간 ms |
| X-Request-ID | 클라이언트와 로그를 연결하는 요청별 ID |
| X-AIMI-Instance / X-AIMI-Boot-At | 프로세스별 임의 ID / 기동 시각. 사용자 ID가 아님 |

연결/SQL은 홈 인증 확인·사용자 상태 읽기·콘텐츠 거래·익명 인증 거래에 적용한다. 일반 게임·추천 요청 등은 원래 DB 호출 경로를 유지한다. 측정은 AsyncLocalStorage로 요청별 분리하며, 거래의 연결 해제·커밋·롤백 주체를 바꾸지 않는다.

## 로그와 판독

- `startup_ready`, `startup_listening`: 기동 시각, 해당 시점 가동시간, 초기 콘텐츠 DB 로딩 시간(`contentLoadMs`), 소스 커밋.
- `startup_request`: 위 요청별 appMs, db_connectMs/Count, db_queryMs/Count, partnerMs/Count, 상태코드와 연결 풀 개수.
- 브라우저 HTTP가 23초인데 app이 0.5초이며 새 프로세스가 방금 기동했다면 서버가 요청을 처리하기 전 대기를 의심한다. Render 재기동 로그와 함께 확인한다.
- app 자체가 23초이고 db_connect가 대부분이면 DB 연결/풀 대기, db_query가 대부분이면 SQL 왕복을 의심한다.
- partner가 대부분이면 토스 교환 단계다. 클라이언트 SDK 코드 발급 시간과 구분한다.
- 큰 HTTP-app 차이만으로 Render를 확정하지 않는다. 이동통신·프록시·DNS/TLS도 차이에 포함될 수 있다.

15분 유휴 재현 시 외부 모니터링 요청이 계속되면 서버가 내려가지 않을 수 있다. 마지막 검증 요청 뒤 15분보다 여유 있게 기다린 후 재접속한다. 재배포 직후 접속과 유휴 후 재접속은 다른 조건으로 기록한다.

서버 반영은 GitHub main 푸시 → Render 자동 배포 live → 실제 응답 헤더 확인 순서다. 과거 .ait도 호환되며, 헤더를 화면/복사 기록에 표시하려면 최신 측정용 .ait를 사용한다. 운영 환경변수 추가나 migration은 필요 없다.
