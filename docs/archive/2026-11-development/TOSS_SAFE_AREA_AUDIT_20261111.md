# 토스 안전 영역 전수 점검

2026-11-11. 실제 아이폰 캡처에서 상태바와 본문 제목, 토스 우측 메뉴와 예산 표시가 겹친 문제를 대상으로 조사했다. 사용자가 게임 결과는 의도한 페이지임을 확인했으므로 팝업 변경은 제외했다.

## 원인

기존 bridge는 하단 inset만 읽어 `--safe-bottom`에 저장했으나 화면은 CSS env를 직접 참조했다. 상단/좌우 읽기·변경 구독이 없었다. 투명 native navigation 아래에 본문 공간을 확보하지 않아 페이지 제목과 테스트 안내가 상태바/메뉴 뒤에서 시작했다. 결과 컴포넌트는 공통 페이지 제목 외에 같은 뜻의 제목을 반복했다.

## 적용 범위

|대상|수정|
|---|---|
|공통 app-shell, 홈/미션/챌린지/개선기/추천/상점/정원/소셜/계정 페이지|상단 SDK 안전 영역+네이티브 메뉴48px, 좌우 안전 영역|
|로딩·로그인|같은 안전 영역 직접 적용|
|하단 탭·CTA·토스트|하단 SDK/CSS 안전 영역 단일 기준|
|게임3종|게임 컨테이너 자체 안전 영역, HUD/일시정지/진행바/조작부 중복 inset 제거|
|테스트 안내|홈 헤더 아래 간단한 한 줄, 상세 한도는 계정 페이지|
|게임 결과|공통 ‘게임 결과’ 제목만 표시, 만점 제목은 유지|
|키보드|입력 중 키보드가 열린 경우 하단 탭 숨김|
|공통 Modal·시트·성공 보상 팝업|이번 수정 제외|

SDK값과 env값은 max로 병합해 중복 덧셈하지 않는다. resize/orientation/pageshow 및 SDK 구독 변경을 반영한다. SDK가 없는 로컬 환경은 CSS env fallback을 사용한다. 높이 고정으로 본문을 자르지 않으며 일반 페이지 스크롤을 유지한다.

## 검증

- `npm run typecheck --workspace @aimi/miniapp` 통과.
- `node tools/qa/safe-area-runtime.mjs`: SDK 초기 읽기, 네 방향 변경, 잘못된 수치, 키보드, 구독/리스너 해제, 로컬 분리 통과.
- `node tools/qa/host-safe-area.mjs`: 실제 공통 CSS를 사용하는 격리된 HTML fixture21개(7가지 컨테이너 ×320/393/480px). 상단59px+native48px, 하단34px 조건에서 수평 넘침/상단/CTA/탭 좌표 검사 통과. output/qa/host-safe-area/report.json에 기록.
- 이 fixture는 실제 앱 전체 화면/실제 토스 WebView의 대체 검증이 아니다. 네이티브 메뉴·OS 키보드의 실제 수치는 새 QR로 실기기 확인해야 한다.
- `npm run ait:build:test` 성공. output/releases/toss-ui-test/AIMI_UI_TEST_SAFE_AREA.ait를 새 버전으로 업로드한다. 이미 열어 둔 QR은 이전 번들을 계속 사용할 수 있다.
- API/DB/로그인 방식/EP/진행 상태는 변경하지 않았다. Render 재배포 불필요.

공식 근거: https://developers-apps-in-toss.toss.im/documentation/common/screen/safe-area 및 SDK SafeArea.get/subscribe, navigationBar의 transparentBackground 설정.
