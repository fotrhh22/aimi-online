# 156개 모델 제품군 분류 보강 계획

2026-11-10. 1~3단계를 실행했고 기존156개에 고정분류표를 적용했다. 결과는 MODEL_GROUP_REVIEW_RESULTS.md와 content/policies/model-groups-v3.json을 따른다. Small32/Medium53/High71이며150개자료검토·5개추가확인·1개기존정책유지다. AA추천적격성확대와외부모델교체는수행하지않았다. 아래내용은당초계획이다.

## 현재 문제

Small20개(정책3/임시17), Medium125개(정책4/임시121), High11개(정책3/임시8). 총156개다. model-groups.ts는 정책10개 외에 일부 제조사 명칭 정규식만 사용하고 나머지를 모두Medium에 넣는다. 따라서 현재 분포는 실제 제품군 분포를 반영한 검수 결과가 아니다.

## 1. 기존156개부터 재검수

- 모델/버전별로 제품군·근거 URL·근거 발췌·판정 이유·검수일·정책 버전을 등록한다.
- 우선순위는 임시Medium121개, 이어서 임시Small/High25개, 마지막으로 기존정책10개도 같은 기준으로 재검토한다.
- 제작사의 명시적 제품군 설명을1차 근거로, 모델카드와 OpenRouter 설명을 교차 확인한다.
- Small은 경량·효율 지향, Medium은 균형 지향, High는 상위 범용 수행 능력 지향 제품군이다. Low/Medium/High 추론 강도와 분리한다.
- 가격·현재 AA 순위·문자열 mini/flash/pro/large만으로 분류하지 않는다. 파라미터 수는 공개된 경우 보조 근거로 쓰며 MoE 총/활성 파라미터를 혼동하지 않는다.
- 복잡한 추론을 지원하는 소형 모델을 그 이유만으로High에 넣지 않는다. 과거 대형 제품을 단지 구형이라는 이유만으로Small로 바꾸지 않는다. 출시 세대/업무 품질은 추천 필터의 별도 조건이다.

## 2. 재검수 우선 후보

현재 OpenRouter snapshot의 제품 설명을 기준으로 만든 조사 대기열이며 분류 확정표가 아니다.

|방향|현재Medium인 후보|조사 단서|
|---|---|---|
|Small|microsoft/phi-4|Microsoft가Small Language Model로 소개|
|Small|z-ai/glm-4.5-air|경량 제품 변형 설명|
|Small|upstage/solar-mini4|compact/cost-efficient 제품 설명|
|High|moonshotai/kimi-k3.1-pro|flagship 제품 설명|
|High|google/gemini-4-argon|flagship reasoning 제품 설명|
|High|mistralai/mistral-large-4-0|상위 범용 멀티모달 제품군|
|High|meta/muse-wonder|frontier 제품 설명|
|High|x-ai/grok-4.7|flagship 제품 설명|

같은 모델군의 일괄 이름 규칙보다 개별 버전 확정표를 우선한다. 현재Cohere Command A+처럼 명시 정책과제품 설명을 다시 대조할 항목도 포함한다. flagship이라는 표현 하나만으로 모든 제작사의 모델을High로 승인하지 않는다.

## 3. 비율 목표

우선156개를 유지하고 실제로Small/High에 속할 후보를 찾아 Medium기본값 쏠림을 해소한다. 탐색 UX를 위한 가설은Small30~40개, High30~40개, Medium나머지76~96개다. 비율을 맞추기 위한 등급 변경이나 확정된 최종 개수로 해석하지 않는다. 첫 검수 후 실제 분포를 보고 이 가설을 재평가한다.

검수 근거가 없는 모델은 검토 중 상태를 유지하고 기존Medium기본값을 균형형 검수 완료로 승격하지 않는다. 미확인 모델이계속Medium에 몰리면 내부reviewStatus로 별도 집계하고 UI의 임시 표시를 유지한다.

## 4. 그래도 부족할 때만 후보 확장

확정156개 밖의OpenRouter canonical모델 가운데Small/High후보를 조사한다. 속도/AA매핑 필수 조건 때문에 빠진 경량 모델을 데이터 부족 이유로 누락한 것은 아닌지 살펴본다. 총156개를 유지하려면 검수된 새 후보와 오래된/중복 가치가 낮은 목록 항목의 교체안을 제시한다. 새 후보에 AA속도 측정이 없다면 현재 선정 조건 변경이 필요하므로 임의 대체하지 않는다. batch/free·다른 추론 강도를 별도 모델로 부풀리지 않는다.

## 5. 목록 분류와 추천 적격성

제품군 확정만으로 추천 후보에 추가하지 않는다. AA측정 프로필의 버전·추론 설정 대응을 검수하고 업무별품질/지원 기능/가격 조건을 통과해야 한다. 현재검수 AA매핑은10개이고, 156개 안에종합 점수가 있는 제품 후보는49개다. 추천 확대 작업은 이49개를 우선 조사한다. 성능 null은 낮은 점수가 아니며, 높은 제품군으로 분류됐다는 이유로 품질 근거를 만들어내지 않는다.

## 적용 순서와 검증

1. 기준/근거 필드를 문서와계약에 고정한다.
2. 모델별 제품군 검수표156행을 만든다.
3. 검수 결과의 세등급 분포·변경 근거를 보고한다.
4. 고정분류표를코드에 반영하고제품군 정책 버전을 올린다.
5. AA매핑 검수된 모델만추천 적격성을 갱신한다.
6. 가격·순위·목록순서가 바뀌어도제품군이 유지되는지, 후보가 해당등급에만 표시되는지 확인한다.

자료: 현재content/fixtures/models.json 및 packages/recommender/src/model-groups.ts. 공식 검수 참고: [Microsoft Phi-4](https://www.microsoft.com/en-us/research/wp-content/uploads/2025/01/WEF-2025_Leave-Behind_Phi-4.pdf), [Mistral Models](https://docs.mistral.ai/models). 동적 모델 문서는 버전별로 근거를 별도 보관해야 한다.
