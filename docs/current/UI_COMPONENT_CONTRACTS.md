# 공통 UI 선행 정의와 의존 관계

작성: 2026-11-08. PDF v17과 design/DESIGN_SYSTEM.md가 시각 기준이다. 이 문서는 구현 계약이며 컴포넌트가 이미 구현됐다는 뜻은 아니다.

## 계층과 책임

1. 디자인 토큰: design/tokens.json과 실제 tokens.css의 값/이름을 대조해 단일 원본을 정한다. 색·간격·타이포·모서리·레이어를 CSS 변수/타입으로 제공한다. 두 파일을 수작업으로 따로 변경하지 않는다.
2. ui 기본: Stack, Inline, Text, Button, IconButton, Surface, TextInput, TextTabs, Modal, BottomSheet, AppShell, BottomNav, AsyncState.
3. 도메인 조합: EPBalance, MissionSummary, KeywordSelector, OrderedKeywords, ModelRow, ModelMetrics, PromptResult, GardenScene, ProductCard, PurchaseDialog, OwnedCharacterPicker, GameHUD, GameResultDialog.
4. 기능 화면: 위 조합을 사용하고 라우팅·서버 상태·임시 편집을 연결한다. 공통 컴포넌트에 API 호출·EP 산식·오늘 날짜 계산을 넣지 않는다.

새 패키지/대규모 라이브러리부터 만들지 않고 miniapp/src/ui에서 시작한다. TDS가 제공하는 적합한 기본 요소는 공식 API 확인 후 래핑하고 AIMI 색/간격을 맞춘다.

## 먼저 고정할 시각·동작 계약

| 대상 | 계약 |
|---|---|
| 간격 | line box 끝 기준 8/12/16/24px, 카드 내부16, 버튼 사이8, 일반 좌우24 |
| CTA/터치 | 주 CTA 높이56·반경16, 작은 아이콘/키워드도 터치 영역 확보 |
| 화면 | 375×812는 기준 캔버스, 실제 높이 고정 금지. safe area·키보드·하단 CTA/탭 가림 처리 |
| 팝업/시트 | 실제 이전 화면 블러·어두운 딤 없음, 성능 부족 시 밝은 불투명 대체. 제목/본문/행동 슬롯, 초점 이동·닫기·복귀 계약 |
| 비동기 | idle/loading/success/empty/error/limit를 화면별로 매핑. 중복 누름 방지, 서버 확정 전 잔액·횟수 확정 표시 금지 |
| 내비게이션 | 홈/미션/정원/소셜, SDK 상단 내비게이션 중복 금지. 미저장 이탈 확인 |
| 정원 | 약327×300 장면 기준으로 비율 유지, 고정 장식4슬롯+중앙 캐릭터1명, 자유 배치 없음 |
| 상품 | 2열 카드, 구매 팝업에 위치/현재 장착/가격/구매 후 잔액. 구매 후 자동 장착 없음 |
| 캐릭터 | 탭에는 착용 중1명, 상자 선택 시 다른 보유품 팝업. 선택은 draft, 정원 저장으로 확정 |
| 개선기 | 밑줄 텍스트 탭, 결과 우하단 편집/복사, 원문 개선과 확장/추가 가정 분리 |
| 추천 | 모델명 왼쪽·제조사 오른쪽, 등급 선택 시트, 100토큰 USD·출처·갱신일·결측 N/A |

## 개발 속도를 위한 사용법

컴포넌트마다 props/상태/행동 이벤트와 정상·긴 문구·로딩·비활성·오류 예제를 먼저 만든다. 별도 도구 도입 없이 개발 전용 UI preview 경로에서 확인할 수 있다. 기능 화면은 컴포넌트 내부 CSS 복사 대신 variants와 slots를 사용한다. 모든 화면을 하나의 거대 범용 컴포넌트로 합치지 않는다.

선행 완료 순서: 토큰 → 화면/버튼/텍스트/팝업 → 상품/정원/개선/추천 조합 → 전체 라우팅 → 실제 API. 작은 viewport, 긴 한국어, 스크롤/키보드, 초점/터치를 대표 화면에서 먼저 확인하고 화면별 예외만 추가 검수한다. 디자인 미리보기와 실제 API 동작 완료를 구분한다.

## 앱인토스 인수 기준

TOSS_DELIVERY_AND_ACCEPTANCE.md를 함께 따른다. Phase1에서 실제 TDS/Provider 호환성을 검증하고 공식 지원 요소를 공통 ui에 래핑한다. 공식 플로팅 탭/SDK 내비게이션/이탈 경로/safe area/명확한 CTA가 우선이다. PDF 취소 표기는 실제 다이얼로그의 닫기와 편집 취소를 구분해 적용한다. 현재는 준수 계약이며 TDS 설치/전환은 아직 아니다.
