# 비게임 출시 준비 개선 결과 · 2026-11-13

## 판정

출시 완료가 아니다. RELEASE_READINESS.md의 Gate1(코드·번들) 검증을 수행했으며 Gate2의 운영 DB·서버 코드 반영과 사용자가 수행할 인증서/환경변수 연결을 구분한다. Gate3의 토스 실기기·콘솔·심사·실제 공개는 대기다. 최초94항목 조사 결과는 TOSS_NONGAME_RELEASE_AUDIT_20261113.md에 변경 전 증거로 보존한다.

## 체크리스트 후속 조치

| 항목 | 조치와 현재 증거 | 남은 확인 |
|---|---|---|
| AI 사전 고지 | 개선기·추천 입력, 미션·챌린지 진입 전에 생성형 AI 사용과 입력 주의 안내 | 실제 토스 첫 진입 시 가독성 |
| AI 결과 표시 | 개선/확장문, 추천 AI 제안, 래스터 목표 이미지 배지, 오늘의 팁·학습 해설 표시 | iOS·Android 화면 |
| 팝업 순서·이탈 | 2버튼은 왼쪽 텍스트 닫기/오른쪽 주요 실행. 처리 중 닫기 허용, 전역 이동 잠금 제거 | 실제 네이티브 뒤로가기·종료 |
| 미수령 보상 | 닫기만으로 지급하지 않음. 홈·해설에서 다시 열어 확인 가능. 서버 중복 지급 방지 유지 | 종료·재접속 실기기 |
| 불필요 호출·경합 | 동시 GET 공유, 모델 메타데이터5분 캐시, 세션 갱신 단일화, 계정 전환 전 응답 폐기 | 운영 부하·파트너 API 실제 호출량 |
| 익명 인증 | SDK 일회용 코드→서버 mTLS교환→HMAC 식별→내부UUID·1시간 세션. 기존 OAuth와 임의 병합 없음 | 사용자 인증서/env 등록 후 실제 SDK 코드 교환 |
| 운영 DB | migration0008 적용·제한 API 역할 읽기/쓰기 확인. 기존 UUID·EP·기록 유지 | 실사용자2명 재접속·소셜 |
| 활성 콘텐츠 | 10개를 로컬 승인자료·정답·키워드·학습해설·이미지SHA256과 대조 후approved 전환. 이미지/일정/구버전 불변 | 실제 날짜별 화면·사용자 검수 |
| 고객 문의·정책 | 문의 이메일·개인정보처리방침 URL은 없음. 사용자 요청대로 출시 전 준비 항목 | 실제 연락처·정책 URL 확정 |
| 등록 분류 | 실제 게임·보상·교육 기능을 비게임 심사에 제시 | 토스 분류/심사 승인 |

## 검증 범위

- 타입 검사, 서버112개, 클라이언트·웹·정책20개, 버튼문구 검사 통과. 익명 인증 DB7개는 격리 PostgreSQL에서 회원 유일성·재접속·기존 잔액·친구 관계·삭제·구버전 호환을 검증했다.
- 웹 빌드28상태와 실제 `.ait` 추출 화면28상태를 각각320/360/393/480px에서 검증했다. 입력 전 AI고지, 결과 표시, 가로 넘침·팝업 경계, 보상 닫기/재수령, 지연 응답 중 이탈을 확인했다. 외부 API·AI·DB 호출은 없는 fixture 검사다.
- 실제 토스 호스트 없는 브라우저에서 NavigationBar SDK가 동기 예외를 던지는 것을 확인해 예외 처리를 보강했다. 토스 인증·네이티브 UI가 브라우저에서 검증됐다는 의미가 아니다.
- 새 번들의106개entry 전부에서 로컬 비밀값5개·PEM 개인키 유출을 검사했다. 익명 인증·AI고지/결과 표시 포함, 공유 ‘테스트로 시작하기’ UI 제외.
- 번들: `output/releases/nongame-ready/AIMI_NONGAME_READY.ait`. 해시·크기·deploymentId는 같은 폴더bundle.json. 번들 생성과 콘솔 업로드/심사/출시는 별개다.
- QA 증거: `output/qa/release-policy/web-ui.json`, `toss-ui.json`, PNG. 콘텐츠 증거: `output/releases/nongame-ready/content-approved.json`.

## 사용자 설정 — 에이전트가 변경하지 않음

Render 서비스: https://dashboard.render.com/web/srv-dbo2dvp5efls73cmt7qg

1. 같은 AIMI 콘솔 앱의 인증서 ZIP을 풀고 Secret Files에 `AIMI_mTLS_public.crt`, `AIMI_mTLS_private.key` 업로드.
2. Environment에 `TOSS_CLIENT_CERT_PATH=/etc/secrets/AIMI_mTLS_public.crt`, `TOSS_CLIENT_KEY_PATH=/etc/secrets/AIMI_mTLS_private.key` 설정. 기존 `SESSION_SIGNING_KEY`는 식별 매핑/세션에 사용하므로 유지한다.
3. `DATABASE_URL`, `AIMI_GEMINI_API_KEY` 유지. `ENABLE_DEV_AUTH=false`. 기존 Vercel 데모를 쓰면 `ENABLE_TEST_DEMO`는 임의로 끄지 않는다. CORS에 `https://aimi.apps.tossmini.com`, `https://aimi.private-apps.tossmini.com`을 포함한다.
4. 승인 콘텐츠 운영 설정은 `AIMI_CONTENT_SOURCE=supabase`, `AIMI_CONTENT_PREVIEW=false`. 별도 출시 차단 검사를 쓰는 현재 정책에서 `AIMI_RELEASE_VERSION=prototype-v1-reviewed`로 승인 경로를 선택한다. 현재 Render 값은 사용자 변경 대상이며 무단 변경하지 않았다.
5. 저장/재배포 후 새 `.ait` 업로드→새 QR→실제 시작하기·재접속·사용자2명·친구 관계·거래·실패·이탈·키보드·핀치·안전 영역 확인.
6. 고객 문의 이메일·개인정보처리방침 URL·콘솔 소개/로고·실제 카테고리 승인·심사를 마친 뒤 공개.

Gemini 데모 전체20회/시간·48시간 종료 시점은 변경하지 않았다. 운영 실제 계정과 Vercel 접속코드 계정은 분리한다. 인증 코드·anonKey·비밀 키를 채팅/로그에 노출하지 않는다.

## 배포·되돌리기

원격 DB는0008이 추가된 전진 호환 스키마다. 이전 서버가 새 컬럼을 사용하지 않아도 기존 계정은 유지된다. 문제 발생 시 Render에서 이전 live커밋a91d1fd로 되돌릴 수 있지만 새 익명 계정 로그인을 지원하지 않는 버전임을 알리고 인증 UI도 이전 번들과 일치시켜야 한다. DB를 초기화하거나0008을 파괴적으로 제거하지 않는다. 콘텐츠는 현재 승인된10일을 유지하며 이전 승인 버전이 필요할 때 별도 검수 후 active program을 교체한다.
