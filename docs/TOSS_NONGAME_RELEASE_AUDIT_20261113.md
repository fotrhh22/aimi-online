# AIMI 비게임 출시 점검 — 2026-11-13

**판정: 현재 번들은 비게임 출시 준수 완료로 볼 수 없다.** 앱 동작을 바꾸지 않고 공식 자료 검색·AIT 내부 확인·소스 대조·운영 읽기만 수행했다. 토스 심사 승인을 대신하는 판정은 아니다.

## 대상과 증거

- 파일: output/releases/toss-anonymous/AIMI_ANONYMOUS_AUTH.ait
- SHA256: 297beb8db5f7b3088edcac26b9093eced3d88490cdb6bcbf7c6565b10c4fe6c2
- 20,910,176바이트,106개 entry, SDK3.10.0, appName=aimi, permissions=[]
- deploymentId: 01a1d00f-f21f-7e7e-9258-8fc5351d9302
- dist 폴더는 웹 빌드로 교체돼 있어 검사 근거로 쓰지 않았다. AITReader로 실제 번들의 bundle.json/index.html/JS를 읽었다. 상세 artifact.json·entries.json.
- Render 커밋은 a91d1fd. 운영 DB read-only 조회에서0008/익명컬럼이 모두 없었다. operations.json.
- AIT의106개 entry 모두에서 로컬 서버비밀값5개와 PEM 개인키 표식이 검출되지 않았다. secrets.json. 이는 모든 취약점이 없다는 보장은 아니다.
- 실제 토스/iPhone/Android/콘솔 입력은 이번 점검에서 조회·테스트하지 않았다.

## 우선 해결 항목

1. **P0 인증 연결**: 운영DB migration0008 → 인증서2개/경로env 확인 → 새 API 배포 → 실제 코드 교환. 현재 .ait만 업로드하면 개인 계정으로 시작할 수 없다. 기존 익명 인증 안내서를 따른다.
2. **P0 AI 첫 사용 안내**: 개선기·추천 입력 전과 이미지 챌린지에 진입하기 전 읽을 수 있는 고지 추가. 예: ‘질문 개선과 업무 분석에 생성형 AI를 사용해요. 결과는 직접 확인해주세요.’ 본문 인라인 안내로도 가능하며 광고성 진입 바텀시트를 만들 필요는 없다.
3. **P0 산출물 표시**: 개선문/확장문에는 ‘AI가 작성했어요’, 공통 ChallengeArt의 모든 노출에는 ‘AI로 만든 이미지’를 즉시 보이는 라벨로 표시. 추천의 기존 ‘AI 제안’은 유지. 이미지 제작 모델명만으로는 충분하다고 판단하지 않는다. 정원·팁은 제작 이력에 따라 추가 적용.
4. **P1 팝업 공통 규칙**: 공식 왼쪽 닫기 안내와 현재 왼쪽 실행/오른쪽 취소가 충돌한다. 먼저 UI_LAYOUT_AND_INTERACTION_RULES.md를 수정한 뒤 힌트·구매·삭제·정원 저장·게임 이탈/오류 팝업을 일괄 정리한다. 사용자의 기존 방향과 충돌하는 항목이므로 이번에는 변경하지 않았다.
5. **P1 뒤로가기/선택권**: 전역 writeLocks의 back 차단과 dismissible=false 보상창을 보완하고 SDK×/시스템back/긴요청/실패에서도 이탈이 되는지 확인한다. 보상확인 단일CTA 자체만으로 전면위반이라고 단정하지 않는다.
6. **P1 실기기/콘솔**: 작은 화면·안전 영역·키보드·핀치·신고/공유·시스템back·2초 반응·메모리·콘텐츠 승인과 콘솔 자료를 새QR로 확인한다.

## 상태 기준

코드확인=소스/번들에서 근거를 확인했으나 실기기 승인 아님. 부분=일부 구현됐거나 경계 미검증. 미충족=구체적인 누락/불일치. 확인필요=실기기·콘솔·운영 증거 부족. 미사용=해당 기능을 제공하지 않음.

{"확인필요":18,"코드확인":19,"부분":17,"미사용":36,"미충족":4}. 공식 체크리스트78개와 추가16개를 대조했다.

## 전체 대응표

| ID | 점검 항목 | 판정 | 현재 증거·남은 확인 |
|---|---|---|---|
| C01 | 앱 실행 | 확인필요 | 새 .ait는 생성됐지만 운영DB0008·Render익명인증 미반영. 실제 시작 불가 상태 |
| C02 | 소개 기능 | 확인필요 | 콘솔 소개/앱 내 기능 등록 내용은 미조회. 화면 구현과 광고/소개 범위 대조 필요 |
| C03 | 등록 스킴 | 확인필요 | bridge.ts의 intoss://aimi/?invite=...; 콘솔 등록 스킴 진입 미검증 |
| C04 | 스킴 복귀 | 확인필요 | context.tsx navigationTrail/parentRoute; 실제 QR·Android 복귀 필요 |
| N01 | 공식 내비게이션 | 코드확인 | apps/miniapp/src/lib/toss/bridge.ts:105-137; app/context.tsx:159-167,271-280; app/App.tsx:203 |
| N02 | 뒤로가기 | 부분 | context.tsx:128-166 writeLocks가 켜지면 back 차단. 서버 응답 지연 중 행동 재검증 |
| N03 | 브랜드 일치 | 확인필요 | withTitle:false. 콘솔 국문명/정사각 로고는 미확인 |
| N04 | 내비게이션 로고 | 코드확인 | withTitle:false. 자체 BrandLogo는 본문 header에 위치; 네이티브 영역 삽입 없음 |
| N05 | 홈 버튼 | 미사용 | withHomeButton:false |
| N06 | 기능 버튼 | 코드확인 | 추가 SDK accessory 버튼 없음. 공지는 본문 header |
| N07 | 뒤로가기 중복 | 코드확인 | App.tsx:203 browserRuntime에서만 자체 topbar 표시 |
| N08 | 더보기 | 확인필요 | SDK 기본 ⋯ 신고/공유를 실기기에서 확인해야 함 |
| N09 | 닫기 동작 | 확인필요 | SDK closeView/네이티브× 실제 동작 미검증. 바쁜 상태와 dialog 포함 |
| N10 | 첫 화면 복귀 | 부분 | parentRoute(/)=null→exit 구현. 홈 withBackButton:false이므로 노출/Android 종료 대조 필요 |
| I01 | 식별자 연결 | 부분 | anonymous.ts 구현·local DB 통과. 운영 컬럼 없음/서버구버전 |
| I02 | 기록 보존 | 부분 | 내부UUID·wallet·prototype_states; local DB 재접속 검증, 운영 미검증 |
| I03 | 종료 후 복원 | 부분 | localStorage session + 익명 자동갱신; 실제 Toss 재실행/기기 변경 미검증 |
| S01 | SDK 호출량 | 부분 | 인증 single flight/한 번 갱신, SafeArea resize/pageshow 등 실제 호출량 미측정 |
| S02 | 중복 호출 | 부분 | 날짜경계 timer/focus/visibility 중복 여지; 모델 목록·상세 중복조회. 지연 조사 보고서 참조 |
| S03 | 재시도 제어 | 코드확인 | bridge.ts 새 코드1회; client.ts 401복구1회; optimizer poll 최대90회·간격 증가 |
| S04 | 외부 코드 실행 | 코드확인 | 앱 source에 eval/new Function 없음; 단순 문자열/JSON API·정적 bundle. SDK내부 전체정적보안분석은 별도 |
| S05 | 외부 앱 임베드 | 코드확인 | iframe/WebView중첩 없음. location.href=/는 같은 origin 재진입 |
| S06 | CSR | 코드확인 | main.tsx createRoot/App, Vite 정적 sources/index.html 확인 |
| S07 | 웹소켓 | 미사용 | 직접 WebSocket/Realtime 사용 없음 |
| S08 | HTTPS | 코드확인 | client.ts 운영 base https://aimi-online-api.onrender.com; localhost는 개발 분기 |
| S09 | 민감정보 저장 | 부분 | 세션/anon HMAC·OAuth AES-GCM. 사용자가 입력할 개인정보·AI 요청 보관 범위와 운영 방침 추가 검토 |
| S10 | 전송 보호 권고 | 코드확인 | 서버HTTPS·DB원격TLS검증·토스mTLS 코드 구현; 실제 인증서 동작 별도 |
| B01 | Android 백 | 확인필요 | graniteEvent backEvent→back 구현. 실기기/요청대기/중단 게임 검증 필요 |
| B02 | 배율 제스처 | 코드확인 | AIT index.html min/max1.0 + scale-lock.ts. 지도 기능 없음. 실제 iOS/Android 재검증 필요 |
| B03 | 라이트 테마 | 코드확인 | bundle.json navigationBar.theme=light; 자체 라이트 팔레트 |
| B04 | 컴포넌트 동작 | 확인필요 | 프런트 단위검증 존재. 이번 작업은 실제 Toss 전체 화면 QA 미수행 |
| B05 | 반응 시간 | 확인필요 | 2초 기준 실기기 측정 없음. 전역 writeLocks/perform 재조회·catalog loading 위험 |
| B06 | 필수 외부 링크 | 미사용 | 사용자 화면의 출처는 텍스트. 외부 이동을 전제로 한 핵심 기능 없음 |
| B07 | 공유 스킴 | 코드확인 | bridge.ts intoss://aimi/ + getTossShareLink; 웹공유 분기는 Toss에서 미사용 |
| B08 | 문구 | 부분 | 주요 해요체/CTA 점검 존재. 생성되는 AI 문구·모델 설명은 고정 검수만으로 보장 불가 |
| B09 | 콘텐츠 적합성 | 부분 | 10일 이미지 시각 검수 기록 존재. 사용자 AI 입력/산출물의 금지콘텐츠 대응 운영 확인 필요 |
| B10 | 권한 동의 | 코드확인 | AIT permissions=[]; 위치/카메라/알림 권한 요청 없음 |
| B11 | 권한 거절 | 미사용 | 선택 기기권한 사용 없음 |
| B12 | 네트워크 | 확인필요 | full model catalog·약4.19MB 폰트·이미지 존재. 실기기 통신량/동시 사용자 부하 미측정 |
| B13 | 메모리 | 확인필요 | Canvas 게임/이미지·catalog 실제 기기 장시간 관찰 필요 |
| U01 | 진입 인터럽트 | 코드확인 | 처음은 로딩/시작 화면. 로그인·광고·알림 자동 바텀시트 없음 |
| U02 | 강제 전환 | 부분 | ChallengeRewardPopup dismissible=false/취소·닫기 없음. 네이티브×와 선택권 확인 필요 |
| U03 | 이탈 경로 | 부분 | back이 writeLocks와 dialog에 막힘. 네이티브×는 호스트 검증 필요 |
| U04 | CTA 예측 | 부분 | 주요 CTA 문구검사 통과. 보상 확인·예산 사용 설명 존재. 팝업 버튼 규칙 충돌은 UX01 |
| U05 | 자사 외부 유도 | 코드확인 | 토스 경로에서 Vercel 링크/다운로드 유도 없음. 웹코드 발급 UI는 webDemoRuntime 전용 |
| U06 | 전면 광고 | 미사용 | 광고 SDK 호출 없음 |
| U07 | 광고 클릭 유도 | 미사용 | 광고 없음 |
| L01 | 로그인 소개 | 미사용 | 새 .ait는 OAuth가 아닌 공식 익명 식별. legacy 서버 경로만 보존 |
| L02 | OAuth 약관 | 미사용 | 새 .ait에 TossAuth.login 호출 없음 |
| L03 | OAuth 재동의 | 미사용 | 동일 위. 기존 OAuth운영 유지 시 별도 검증 대상 |
| L04 | OAuth 해제 데이터 | 미사용 | 동일 위. 기존 legacy callback 삭제 정책은 별도 개선 검토 |
| L05 | 기타 로그인 | 코드확인 | Toss공식 익명 API 사용. 접속코드/공유테스트 UI는 배포 경로에서 분기됨 |
| P01 | 음악 중단 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P02 | 금액 대조 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P03 | 결제 승인 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P04 | 복귀 반영 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P05 | 취소 복귀 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P06 | 실패 안내 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P07 | 환불 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P08 | 구매 내역 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| P09 | 기기 복원 | 미사용 | IAP 미사용. EP는 앱 내 획득 재화이며 현금 결제/환전 기능 없음 |
| T01 | 음악 중단 | 미사용 | TossPay 미사용 |
| T02 | 금액 대조 | 미사용 | TossPay 미사용 |
| T03 | 실패 안내 | 미사용 | TossPay 미사용 |
| T04 | 직전 취소 | 미사용 | TossPay 미사용 |
| T05 | 수단 제한 | 미사용 | TossPay 미사용 |
| T06 | 결제창 취소 | 미사용 | TossPay 미사용 |
| A01 | 음악 중단 | 미사용 | 인앱 광고 미사용 |
| A02 | SSP 정책 | 미사용 | 인앱 광고 미사용 |
| A03 | 실제 광고 | 미사용 | 인앱 광고 미사용 |
| A04 | 예상 시점 | 미사용 | 인앱 광고 미사용 |
| A05 | 광고 안정성 | 미사용 | 인앱 광고 미사용 |
| A06 | 사전 로딩 | 미사용 | 인앱 광고 미사용 |
| A07 | 종료 복귀 | 미사용 | 인앱 광고 미사용 |
| A08 | 음악 복원 | 미사용 | 인앱 광고 미사용 |
| A09 | 시청 보상 | 미사용 | 인앱 광고 미사용 |
| A10 | 배너 위치 | 미사용 | 인앱 광고 미사용 |
| A11 | 스크롤 배너 | 미사용 | 인앱 광고 미사용 |
| AI01 | AI 사전 고지 | 미충족 | 시작·Optimizer 입력·Recommendations 입력 어디에도 생성형AI 활용을 명확히 설명하는 고지가 없음 |
| AI02 | 개선문 표시 | 부분 | AI에 입력할 질문/선택 팁 설명은 있으나 개선문·확장문 바로 옆 AI 작성 표시 없음. 팁0개면 작성주체 안내도 사라짐 |
| AI03 | 추천 표시 | 코드확인 | 추천 설명 h2에 AI 제안. 가격/후보 선정은 코드 계산임을 구분함 |
| AI04 | 이미지 표시 | 미충족 | ChallengeArt는 img alt=챌린지 예시 이미지. 미션·선택·결과·해설 모두 공통 AI 라벨 없음. 모델명은 AI 표시 대체로 보기 어려움 |
| AI05 | 정적 AI 콘텐츠 | 확인필요 | 생성된 정원 그림·오늘의 팁·에셋별 제작 이력을 확인한 뒤 AI 산출물 노출 범위 확정 필요 |
| UX01 | 팝업 닫기 | 미충족 | 현재 왼쪽 실행/오른쪽 취소. 공식 UX문구·위치와 충돌. UI_LAYOUT_AND_INTERACTION_RULES.md 기존 규칙 자체 수정 필요 |
| UX02 | 플로팅 탭 | 부분 | 4개·둥근 떠있는 bottom-nav 구현. 제공 형태와 실기기 대조 미수행 |
| UX03 | TDS 사용 | 코드확인 | TDS Provider·주요 TDSButton 유지. web 분리로 Toss 의존성이 제거된 것은 아님. 모든 자체UI가 금지라는 근거는 없음 |
| UX04 | 안전 영역 | 부분 | safe-area.ts/SDK상하좌우·CSS보정 존재. 사진으로 드러났던 모든 기기 이슈 해소 판정은 실제 새 QR 필요 |
| BR01 | 콘솔 로고 | 확인필요 | 600×600·배경 포함 콘솔 로고 미확인. 본문 투명 로고와 별도 자료 |
| BR02 | 브랜드 이름 | 확인필요 | appName=aimi. 콘솔 국문명·영문명·로고 일치 미확인 |
| OP01 | 실제 인증 배포 | 미충족 | Render live a91d1fd/dep-dbqffi67bikc739hs1q0. DB는0007까지·toss_anon_key 없음. 새 .ait의 인증 경로와 불일치 |
| OP02 | 승인 콘텐츠 | 확인필요 | remote.ts는 approved 또는 명시 preview만 허용. 실제10일 releases 검수 상태/기간은 이번 조회 안 함 |
| OP03 | 토스 API 한도 | 부분 | 일회용 코드 재발급 제한은 있음. 사용자/앱 전체 QPM 집계·부하 검증 없음. Gemini 시간당20회와 별개 |
| OP04 | 고객 안내 | 확인필요 | 앱에 개인정보/약관/문의 UI 경로 미발견. 콘솔 필수정보·처리방침·AI외부전송 안내 확인 필요; 독립 법률판정은 아님 |
| OP05 | 게임 분류 | 확인필요 | 요청대로 비게임을 가정한 점검. 조작형게임3종/EP수집 실제기능을 숨기지 않고 별도 분류 확인 필요 |

## AI 노출별 권고

| 위치 | 현재 상태 | 필요한 조정 |
|---|---|---|
| 개선기 입력 | 개선 기능 설명만 있음 | 사용 전에 AI 활용 고지 |
| 개선안·확장안 | AI 입력용 질문이라는 설명/팁만 있음 | 결과 바로 옆 AI 작성 라벨, 복사/편집 구분 |
| 모델 추천 입력 | 업무·출력 선택 UI | 업무 분석에 AI 사용 고지 |
| 추천 결과 | AI 제안 있음 | 유지, 코드 비용 계산과 구분 |
| 미션 목표·선택·조합·결과·해설 | 공통 img·일부 목표 이미지 caption | 공통 이미지 라벨; alt만으로 시각 표시 대체 금지 |
| 오늘의 팁·정원 에셋 | 제작자/AI여부 고지 없음 | 제작 이력별 적용 판단 |

## 해석 주의

- ‘AI를 사용한다’는 사전 고지와 ‘이 결과가 AI 산출물’이라는 표시는 서로 별도다. 팁에 AI라고 쓰거나 모델 상세 링크만 두는 것으로 모든 산출물의 표시가 충족되지는 않는다.
- 익명 인증은 공식 기능이다. 체크리스트의 기타로그인 금지를 이유로 이를 비공식 로그인으로 단정하지 않는다. 새 번들에는 자체 비밀번호/OAuth 대체 로그인 UI를 제공하지 않는다. 웹 접속코드 문자열이 JS에 남아 있다는 사실과 실제 토스 노출은 구분한다.
- 앱의 own API 조회 횟수/Gemini20회·48시간 제한과 토스 partner API QPM은 다른 범위다. 모든 state polling을 ‘토스 서버 API20회’로 계산하지 않았다.
- 폰트 교체·전체 화면 TDS 전환이 필수라는 근거는 이번 자료에서 확인하지 못했다. PDF 스타일을 유지하면서 필수 UX/AI 고지를 보완할 수 있다. 공식 floating tab 형태는 별도 기준이다.
- 출처 외부 링크가 전부 금지는 아니다. 현재는 텍스트 출처여서 외부 이동 문제가 없고, 필요한 타사 정보 링크는 정책상 허용 범위를 따로 확인한다.
- 기존 인수 문서의 ‘TDS 미설치’ 문장은 현재 package.json/Provider/Button과 달라 오래된 기록이다. 라이브러리 설치 자체를 전체 UX 준수로 간주하지도 않았다.
- 게임 분류/법률 심사 판정은 별개다. 비게임 가정으로 체크했으며 비게임 승인 보장은 하지 않는다.

## 공식 출처 (2026-11-13 검색 확인)

- [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame): C/N/I/S/B/U/L/P/T/A 대응표. 항목은 짧은 자체 라벨로 요약했으며 원문은 링크에서 확인한다.
- [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/guide/undefined.md): AI01~05·호출 안정성·외부 이동·콘텐츠/개인정보 운영.
- [UI/UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md): UX01~04·BR01~02.
- [TDS 안내](https://developers-apps-in-toss.toss.im/design/components.md): 라이선스와 Provider/컴포넌트 범위 확인.
- [익명 인증 코드](https://developers-apps-in-toss.toss.im/guide/authentication/anonymous-key-auth-code): 공식 사용자 식별과 mTLS.
- [WebView 속성](https://developers-apps-in-toss.toss.im/documentation/integration/props): 3.x 지원 속성 확인. pinch 차단은 실제 HTML/제스처 코드로 확인.
- [게임물 분류 관련 토스 공지](https://toss.im/apps-in-toss/blog/update-26-08-12): 등록 명칭과 실제 기능 구분.

앱 코드·DB·Render 설정·배포·AIT파일은 변경하지 않았다. 이번 산출물은 보고서와 검사JSON이다.
