# 글꼴 점검·게임 속도 수정

2026-11-09. 로컬 코드와 Chrome 검사. 원격 배포·DB 변경 없음.

## 글꼴

- 전체 src의 font/font-family/Canvas 텍스트 경로와 SVG 에셋 9개를 확인했다. Canvas fillText/strokeText 호출 및 SVG text 요소는 없다. 게임 HUD는 DOM이다.
- PDF 제작 원본 Regular/Bold를 사용한다. TDS Provider의 기본 글꼴 주입보다 우선하도록 처리하고 사전 로딩·font-display:block을 적용했다. 파일 로드 실패·미지원 문자에서 브라우저 비상 대체까지 없다고 주장하지 않는다.
- 실제 Chrome DevTools CSS.getPlatformFontsForNode로 57개 검사지점, 텍스트 요소 1,838개를 확인했다. 재방문 포함 수치이며 서로 다른 PDF 화면 수가 아니다. 렌더링된 face는 AISlopRegular/AISlopBold뿐이며 대체 검출은 0건이다.
- 로그인·홈·팁·출석·두 상점·구매·정원 편집·캐릭터 선택·소셜·친구 방문/추가·미션 전/중/성공/실패·챌린지·개선/확장/편집/팁·추천/목록/상세·계정/탈퇴·세 게임 준비/HUD/일시정지를 검사했다. 일부 미션 상태는 브라우저 응답 fixture로 재현했다.
- 검사 도구: tools/qa/font-audit.mjs, font-audit-extra.mjs, game-pacing.mjs. 근거는 tmp/qa/font-audit-report.json, font-audit-extra-report.json, game-pacing-report.json.

## 속도·판정

| 항목 | 변경 전 | 새 플레이 v2 |
|---|---|---|
| 길 건너기 차량 한 칸 | 0.433초·순간 이동 | 1.2~1.4초·연속 이동 |
| 길 건너기 전진 최소 간격 | 0.2초 | 0.3초, 좌우도 동일 간격 |
| Dino 장애물 | 210px/초, 간격 1.8초 | 375px 화면 약 108px/초, 간격 3초 |
| Dino 점프 | 0.733초 | 0.933초 |
| 러너 장애물 접근 | 1.8초 | 3초 |
| 좌우 이동 | 매 tick 가능 | 최소 0.3초, 화면 보간 이동 |

- Dino는 화면 폭 비례 속도, 처음 3초 접근 시간, 마지막 0.2초 접촉 구간과 실제 점프 높이로 판정한다. 러너도 화면의 플레이어 위치와 접촉 구간을 맞췄다. 반복 keydown은 무시한다.
- 업계 공통 속도 표준은 없다. Chromium의 화면 폭 보정·일반/느린 모드 분리를 참고하여 AIMI 초급값으로 조정했다. 원작 수치를 그대로 복제한 것은 아니다.
- 참고: https://chromium.googlesource.com/chromium/src/+/refs/tags/98.0.4758.55/components/neterror/resources/offline.js
- 30Hz·100점·러너 18tick/점·보상 상한은 유지한다. 렌더링 FPS로 속도를 더하지 않는다.
- 새 게임은 prototype-game-v2. 기존 v1 세션/로그는 legacy-v1.ts로 재생한다. 기존 활성 게임은 이전 규칙으로 끝낸 뒤 새 플레이부터 적용된다.

## 검증

- 타입 검사·전체 빌드·단위 테스트 19개 통과.
- 모바일 기능 흐름 8개 그룹 통과.
- 세 게임 실제 시간 2초 플레이·일시정지·서버 결과 저장 통과.
- 가속 브라우저 시계와 격리 로컬 시간 fixture로 Dino 100점·서버 재생·완주 단일 CTA 통과. 실제 시간 완주 테스트와 구분한다.
- 최종 조작감과 난이도는 사용자 플레이 피드백으로 추가 조정한다.
