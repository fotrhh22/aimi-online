# 게임 직접 플레이·참고 구현과 모델 API 조사

2026-11-09. 게임은 사용자 브라우저의 http://127.0.0.1:5180 에서 테스트 계정 play_review로 직접 플레이했다. 연습 모드로 점프/방향키를 입력했다. 가속 시계·자동 승리·코드로 결과 주입은 사용하지 않았다. 코드 검토와 실제 관찰은 아래에서 구분한다. 이 문서는 개선 완료 보고가 아니다.

## 직접 플레이 결과

| 게임 | 실제 조작/관찰 | 판단 |
|---|---|---|
| Dino | 첫 판 조작 전 종료. 다음 판에서 장애물 접근 시 Space로 점프, 3~5점의 전후 화면 관찰. 장애물이 플레이어 왼쪽으로 지나가지 않고 없어졌다가 오른쪽에서 새로 등장 | 느린 접근과 주기 초기화가 보인다. 점프 성공의 통과감이 없고 화면 대부분이 비어 있다 |
| Temple Run | 좌우 방향키로 여러 장애물 회피, 화면상21점까지 관찰 | 조작은 되지만 바닥·나무·캐릭터 달리기가 정지. 회피 후 다음 장애물까지 여유가 크고 속도감/패턴 변화가 부족 |
| 길 건너기 | 좌우 한 칸과 전진3회, 차도에서 기다려 충돌 종료(3점) | 한 칸이 크다. 차도는 따라 움직이지만 캐릭터와 차량의 겹침을 읽기 어렵고 충돌 순간 피드백 없이 결과 팝업으로 전환 |

이번 직접 관찰은 짧은 플레이이며 만점 난이도나 모든 seed를 평가한 것은 아니다. 화면 확인에 사용한 브라우저는 약399×669 CSS px의 세로 화면이다. 터치 실기기의 입력 지연 검증은 별도다.

## 현재 코드로 확인한 원인

대상: apps/miniapp/src/games/shared/GameScreen.tsx, packages/game-core/src/index.ts.

- Dino: x를 playerX + (1-phase/90)×(w+40-playerX)로 계산한다. 30Hz의90tick마다 phase가0으로 돌아가므로 장애물이 캐릭터 x까지만 오고 왼쪽으로 통과하지 않는다. 점프가 장애물을 삭제하는 로직은 없다. 점프 후 사라져 보이는 현상은 주기 리셋과 일치한다. 약399px 화면에서 접근 속도는 약114px/s, 주기3초다. 이는 현재 구현값이며 업계 표준이라는 뜻이 아니다.
- Temple Run: 나무 위치와 도로는 tick에 무관한 정적 도형이다. 단일 장애물의 위치/크기만 바꾸고3초마다 리셋한다. 실제 카메라 전진 좌표·도로 세그먼트·다중 장애물·달리기 프레임이 없다. 모든 점수 구간의 장애물 간격도 같다.
- 길 건너기: 가로 tile은 w/5(399px에서 약80px), 세로는70px 고정이다. 차량은 car×tile+4에서 폭tile-8로 그려 중심이 car+0.5가 되지만 판정은 lane과car를 비교한다. 캐릭터 중심은 lane+0.5여서 그리기와 판정 기준이 반 칸 다르다. 이동 시 실제 row/lane을 즉시 변경하고 화면만 보간하기 때문에 보이는 위치와 판정의 시점도 달라질 수 있다.

따라서 속도 상수만 다시 조정하는 것으로 충분하지 않다. 같은 월드 좌표에서 표시/충돌/이동 보간을 정의해야 한다.

## GitHub 참고 구현과 적용 범위

1. Dino 우선 참고: [Chromium 공식 dino_game](https://github.com/chromium/chromium/tree/main/components/neterror/resources/dino_game).
   - [obstacle.ts](https://github.com/chromium/chromium/blob/main/components/neterror/resources/dino_game/obstacle.ts): deltaTime 기반 x 이동, 화면 밖으로 완전히 나간 뒤 제거, 속도에 따른 간격 계산.
   - trex.ts: 점프 상태/중력/착지. horizon.ts: 장애물 목록과 배경. game_config.ts: 가속/속도 상한/모바일 계수.
   - AIMI에는 장애물 목록·연속 통과·가속 구조를 이식하는 것이 적합하다. Chromium 페이지/DOM 의존성까지 통째로 넣지 않는다. 소스 사용 시 각 파일의 BSD 고지와 [LICENSE](https://github.com/chromium/chromium/blob/main/LICENSE)를 유지한다.
   - [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner)은 독립 실행 구조를 비교하는 보조 자료다. 최신 기준은 Chromium으로 잡는다.
2. Temple Run의 전진 연출: [jakesgordon/javascript-racer](https://github.com/jakesgordon/javascript-racer).
   - [common.js](https://github.com/jakesgordon/javascript-racer/blob/master/common.js)의 project는 cameraZ와 물체 worldZ의 차이로 화면 크기/좌표를 투영한다. v1.straight.html의 도로 세그먼트 갱신을 참고한다.
   - Canvas2D의 유사3D 원근·도로 반복·주변 scenery 이동을 적용하고 AIMI의3레인 회피 규칙을 결합한다. 실제3D 도입 없이 전진감을 만들 수 있다는 설계 판단이다.
   - 오래된 교육용 코드이고 README도 모바일 성능 미최적화를 명시한다. 그대로 배포하지 않는다. 코드 MIT와 별개로 동봉 음악/OutRun 예시 그래픽은 재사용 대상에서 제외하고 AIMI 에셋을 사용한다.
3. 길 건너기 좌표/보간: [SepraDC/crossy-js](https://github.com/SepraDC/crossy-js).
   - 직접 읽은 src/constants.ts는 tileSize42와 min/maxTileIndex를 한 곳에 둔다. src/animatePlayer.ts는0.3초의 이동 보간과 hop을, src/hitTest.ts는 표시 물체의 bounding box 충돌을 사용한다.
   - Three.js 렌더러 도입은 요구하지 않는다. 공용 tile 크기·중심 앵커·이동 시작/완료·충돌 범위를 Canvas2D와 서버의 결정적 시뮬레이션에 맞게 적용한다. README의 MIT 안내와 실제 복사 파일/에셋 라이선스를 대조한다.
4. 엔진 후보: [Phaser 공식 예제 저장소](https://github.com/phaserjs/examples).
   - 객체 pooling/입력/카메라/애니메이션 구조의 보조 자료. 이 문제는 현재 장면/좌표 설계에도 있으므로 Phaser를 설치하는 것만으로 해결된다고 판단하지 않는다.

## 실제 개선 순서 제안

1. 공용 좌표/시간/충돌과 화면 디버그 hitbox부터 정의한다. 현재 v2를 별도 legacy로 보존하고 새 규칙은 v3로 발급하여 기존 플레이 replay가 달라지지 않게 한다.
2. Dino를 장애물별 worldX/생성시점/제거시점으로 바꾼다. 화면 왼쪽 밖까지 이동하고 점프 전/중/착지 및 접근 간격을 실제 플레이로 조정한다. 속도·점프 체공시간·간격을 함께 조정한다.
3. 길 건너기는36~48px 정도의 논리 tile을 초기 실험값으로 삼아 화면 안의 더 촘촘한 격자를 만든다. 컬럼 수 변경은 서버 규칙도 함께 버전 변경한다. 차량/통나무/캐릭터의 중심 좌표와 hop 중 충돌 판정을 일치시킨다.
4. Temple Run은 거리 기반 도로 세그먼트·바닥 표식·옆 나무·캐릭터 달리기를 함께 움직인다. 이후 점수 구간별 가속·다중 패턴을 추가하고 최소1개 회피 경로와 입력 여유를 보장한다. 난이도 수치는 플레이 테스트로 정하며 업계 표준이라고 부르지 않는다.
5.100점 상한·EP 상한·결과 단일 챌린지 CTA는 유지한다. 게임별 여러 seed/모바일 크기/충돌 직전·직후의 영상과 실플레이 후에만 개선 완료로 판단한다.

## 모델 API 조사: 수집 가능한 것과 현재 버리는 것

전체461개는 OpenRouter 공개 API를 이번에 직접 조회한 수다. 앱의 기존 snapshot도461개다. 전체 표시를 복원했으며 자료 없는 모델은 등급 미분류로 표시한다. 등급 상자 아래 패널 하나만 펼치는 UX는 유지한다.10개는 AA API 제공 한도가 아니라 현재 수작업으로 검수한 AA↔OpenRouter 매핑 수다.

[AA 공식 데이터 규칙](https://artificialanalysis.ai/data-api/docs)은 Coding Index/Agentic Index의 발행 중단으로 두 필드를 항상 null로 반환한다고 명시한다. 무료 플랜만의 누락이 아니며 유료 전환으로 복원된다고 안내하면 안 된다. 이 점에서 이전 설명을 정정한다.

현재 저장된 AA free 응답의726행을 조사한 실제 유효 점수 수:

| 필드 | 유효 행 수 |
|---|---:|
| Intelligence Index |109|
| Finance & Accounting |120|
| Strategy & Operations |124|
| Legal |120|
| Healthcare & Medical |94|
| Engineering |109|
| Economics |120|
| Coding / Agentic |0 / 0|

이 행들은 모델·추론 설정 변형을 포함하므로461개에 그대로 일대일 연결할 수 없다. 모델명만 비슷하다고 매핑하거나 설정별 최고 점수를 기본 모델 값으로 옮기지 않는다.

[AA API reference](https://artificialanalysis.ai/data-api/docs/reference) 및 저장된 실제 응답 기준:

- 무료: 위 종합/6분야 지표, 출시일·제작사, 입력/출력/캐시 읽기·쓰기 가격, 출력 속도, 첫 토큰·첫 실제 답변 토큰·전체 응답 지연, Performance v3 headline 평균. 미측정 값은 null이다.
- 현재 어댑터는 Intelligence/Coding·출력속도·첫 토큰만 선택하고6분야 지표/답변 지연/전체 지연/캐시 가격/Performance v3를 버린다. 이는 데이터 부족과 별개로 계약을 확장하면 보존할 수 있는 값이다.
- Pro+: 개별 벤치마크, 백분위/작업별 성능, 컨텍스트·파라미터·modality·라이선스·openrouter_api_id 등. 필드별 권한/실제 비어 있는 값은 별도 확인해야 한다. Coding Index가 다시 제공된다는 뜻은 아니다.
- v3 평균과 기존 median은 측정 조건/집계가 다르므로 한 숫자처럼 섞지 않는다. 각 출처·버전·관측시각·prompt preset을 보존한다.

[OpenRouter 모델 API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)는 이번 익명 GET에서도461개를 반환했다. 실제 root 필드에서 기존 어댑터가 보존하지 않는 canonical_slug, hugging_face_id, created, description, default_parameters, supported_voices, knowledge_cutoff, expiration_date, links, endpoints, reasoning을 확인했다. architecture에는 입력/출력 modality·tokenizer·instruct_type, top_provider에는 context/max output/is_moderated, supported_parameters에는 모델별 지원 옵션이 있다. pricing은 항목별로 다르며 확인한 응답에는 input_cache_read도 있다.

문서의 서버측 정렬/필터 옵션과 endpoint 상세는 추가 활용 후보이나, 목록 응답에 없는 품질/속도 점수가 실제로 다 제공된다고 가정하지 않는다. 설명·파라미터 지원을 품질 평가 점수로 바꾸지도 않는다.

## 후속 데이터 적용 제안

- 목록은 전체 표시, 추천은 근거 검증이라는 두 조건을 분리한다. 점수가 없는 모델은 숨기지 않는다.
- 먼저6분야 지표·캐시 비용·지원 기능·지연을 선택 필드로 공용 계약/정규화/상세 UI에 보존한다. 값이 있는 카드만 보여준다.
- AA 매핑 검수를 확대하되 모델 버전·추론 설정별로 근거를 기록한다.109개 점수를 전부 자동 검증했다고 취급하지 않는다.
- 코드 업무는 폐기된 Coding Index 의존 정책을 재설계한다. 실제 사용할 수 있는 개별 벤치마크나 자체 고정 평가 없이 종합 지표를 코드 평가로 이름만 바꾸지 않는다.
- 이번에는 API 조사와 전체 모델 표시 복구까지만 수행했다. 추가 지표 저장·UI 카드·새 수집 Actions·유료 endpoint 연결은 구현하지 않았다.
