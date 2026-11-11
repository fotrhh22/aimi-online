# 요청·DB 지연 전수 조사

2026-11-12. Render 절전 시간은 개선 범위에서 제외. 현재 프론트 공통 perform/refresh와 주요 화면 호출부, 운영/테스트 인증, Repository, v1 모든 라우트, DB pool을 조사했다. 앱/API 동작 코드는 변경하지 않았다.

## 결론

운영 본계정도 같은 추가 조회를 기다리고, 단순 조회에도 DB 행 잠금과 상태 저장이 발생한다. 테스트 계정만의 문제가 아니다. 테스트 계정은 모든 접속자가 단일 행을 공유하므로 타인의 요청과도 경합한다. 운영은 사용자별 행이므로 다른 사용자 사이에서 같은 단일 행을 공유하지 않는다. 운영의 세션 인증 자체는 SELECT1회이며 테스트처럼 상태 UPDATE하지 않는다.

## 기능별 영향

|기능|현재 요청 흐름·문제|본계정|
|---|---|---|
|게임 시작|시작 POST 완료→state/content 재조회 완료→Play 설정. 추가 조회가 화면 표시를 막음|동일|
|게임 종료·결과|정산 완료→state/content→결과 이동|동일|
|챌린지 제출|판정 완료→state/content→결과 표시|동일|
|힌트·보상·출석·팁|처리 후 두 데이터 재조회. 힌트/판정은 콘텐츠 일부 갱신이 필요하므로 무조건 제거하면 안 됨|동일|
|구매·정원 저장·공개 여부|변경 후 state/content 모두 조회. 변경하지 않은 콘텐츠도 재조회|동일|
|친구 방문|방문 GET에도 perform으로 state/content 재조회 후 표시|동일|
|코드·개선문 복사/초대|로컬 SDK 작업에도 perform을 사용해 state/content 조회, busy 유지|동일|
|친구 목록|본인 읽기 후 친구·요청별 순차 read. read마다 상태 UPDATE·잠금|동일|
|친구 추가·삭제|공통 refresh로 a.data 변경→목록 reload effect. action.then에서 reload도 직접 호출|동일|
|개선기|job 생성→state/content 이후 polling 시작. polling은 응답 후500ms 간격, 최대90회. 상태 GET마다 트랜잭션/저장|동일|
|추천|Gemini/계산 완료 후 state/content를 기다린 뒤 추천 표시|동일|
|로그인|로그인 함수 내 refresh + perform의 refresh로 중복조회|동일|
|모델 목록/상세|목록을 재조회하고 서버에서 파일3개를 다시 읽고 파싱. 부수 비용이며 주원인으로 단정하지 않음|동일|

## DB 처리 실제 코드 시뮬레이션

실제 Repository 코드를 mock pg client로 실행해 SQL 호출 수/행 잠금/UPDATE를 기록했다. 원격 DB 데이터와 계정은 변경하지 않았다. SQL 개수는 시간 측정이 아니다.

|동작|운영|테스트|
|---|---|---|
|인증|sessions SELECT1회|withStore5문장, 공유 행 잠금·UPDATE|
|Repository.read|6문장, 지갑·상태2행 잠금, 상태 UPDATE1회|5문장, 공유 행 잠금, 상태 UPDATE1회|
|EP 증감 없는 단일 사용자 transaction|6문장|5문장|
|게임 시작+state/content|HTTP3요청, 인증 포함 SQL21문장|HTTP3요청, 인증 포함 SQL30문장|

운영6문장=BEGIN/INSERT ON CONFLICT DO NOTHING/지갑SELECT FOR UPDATE/상태SELECT FOR UPDATE/상태UPDATE/COMMIT. EP 변경이 있으면 지갑UPDATE와 원장INSERT가 추가된다. 신규 계정은 해당 초기화 비용이 별도다. 테스트5문장=BEGIN/INSERT/SELECT FOR UPDATE/UPDATE/COMMIT.

친구·요청10명의 운영 목록 조회는 인증1회 + 본인/친구11명×6 =67 SQL문장이고 친구별 순차 실행된다. 방문 페이지는 본인+친구 조회로13 SQL문장 이후 공통 refresh14문장이 추가될 수 있다. 친구 목록 reload는 화면 마운트/effect에 따라 추가되며 위 기본 계산에는 포함하지 않았다.

시뮬레이션 결과: output/qa/request-cost-audit/report.json. mock에서 정상적인 기존 사용자·EP변동 없음 경로를 실행했다. 본계정 실제 토스 로그인/동시 사용자 부하/실기기 타임라인은 측정하지 않았다.

## 처리량·안정성 관련 추가 발견

- pool max5, 연결10초/statement10초 제한. 지연·동시 요청 시 풀/행 잠금 대기가 더해질 수 있다.
- request 기본 timeout35초. mutation 응답과 후속 refresh는 별도 요청이므로 대기가 누적될 수 있다.
- refresh는 오류를 내부 catch에서 처리한다. mutation 성공 후 refresh 실패 시 perform은 결과를 반환하면서 화면 상태는 오래될 수 있다.
- 상태와 콘텐츠를 Promise.all로 보내지만 동일 사용자 행을 잠그므로 DB 구간 일부는 병렬 처리되지 않는다.
- 전체 사용자 상태 JSON에 plays/attempts/requests가 함께 저장된다. 읽기·쓰기 비용은 기록량에 따라 커질 수 있다. 모델 목록 파일은 요청마다 읽는다.
- 운영 request logging 비활성화. 현재 코드에 endpoint/DB/pool 대기 시간을 구분한 계측이 없어 ‘실제 몇 초 중 어디서 몇 초’는 확정할 수 없다.

## 개선 우선순위

1. API/DB/pool/화면 표시 구간별 안전한 시간 계측(토큰·본문 로깅 금지).
2. perform을 로컬 작업/변경 작업으로 분리. 코드·문장 복사·초대에 refresh 제거. 로그인 중복 refresh 제거.
3. 게임 시작 응답은 즉시 표시. 서버에서 승인한 Play를 사용하고 상태는 별도 갱신. 거래 결과는 실제 서버 승인 이후 표시하며 EP를 임의로 낙관 갱신하지 않음.
4. state/content 갱신을 기능별로 분리하고 중복 진행 요청 병합. 날짜·콘텐츠 버전·힌트·정답 공개 정책을 유지.
5. 본계정 read 전용 SQL 경로 추가: 읽을 때 상태를 저장하거나 잠그지 않음. 신규 상태 생성/실제 상태 변경은 명시적 transaction에 유지. 잔액·상태 일관성이 필요한 조회는 하나의 SQL snapshot으로 읽음.
6. 테스트 인증·단순 읽기는 공유 행 UPDATE 제거. epoch/reset 검증과 실제 거래의 원자성은 유지.
7. 소셜 목록 일괄 조회, 방문 페이지 GET 후 공통 refresh 제거, 중복 reload 제거. 권한·차단 검증 유지.
8. AI job의 일반 polling은 read 경로, 만료 복구만 조건부 갱신. polling 지수 backoff와 중단 처리. 모델 snapshot은 버전 기준 메모리 캐시.
9. 실제 거래·EP/횟수·중복·reset 경쟁 테스트 후 warm 서버 구간 비교. Render 플랜 변경은 별도.

## 주요 근거 코드

- apps/miniapp/src/app/context.tsx: refresh/perform
- apps/miniapp/src/games/shared/GameScreen.tsx: 시작/정산
- apps/miniapp/src/features/{home,challenge,garden,optimizer}/*: 호출/폴링/복사/친구
- apps/api/src/app.ts: 운영 sessions 인증과 request logging
- apps/api/src/modules/repository.ts: PostgresRepository.read/transaction
- apps/api/src/services/demo/{repository,register}.ts: 공유 행/auth
- apps/api/src/modules/routes.ts: state/content/social/AI/model routes
- apps/api/src/db.ts: pool 설정
