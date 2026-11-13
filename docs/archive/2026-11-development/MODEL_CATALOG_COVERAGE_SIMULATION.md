# 모델 목록 200~300개 확보 시뮬레이션

2026-11-09. 앱·DB·배포는 변경하지 않았다. 신규 OpenRouter 공개 목록461행과 기존2026-11-08 AA 원본726행을 대조했다. AA를 새로 수집하지 않아 시점 차이가 있다.

## 최종 확정 결정 · 156개 (2026-11-10)

사용자가253개안을 대체해156개안을 확정했다. 기본 정보·입출력 가격·입출력 modality/지원 옵션·context/max output·AA 출력 속도 값 존재를 선정 조건으로 둔다. AA 종합/분야별 성능7개는 null을 허용한다. 캐시 읽기 가격은 선택값이며 선정 필수 조건에서 제외한다. 제품군은 별도 정책 검수 대상이다.

`output/model-audit/selected-156.json`에156개 대표 endpoint와 후보AA ID/설정명, 기준일, 필드 보유 건수를 기록했다. AA 성능 하나 이상54개, 전부 존재44개, 전부 결측102개다. 출력 속도156개는 동일 제품/설정 대조가 필요한 후보 기준이며 기존 검수 완료 연결은10개다. 다른 설정의 속도/점수를 한 모델의 확정값처럼 섞지 않는다. 후보 연결을 추천 근거로 자동 승격하지 않는다.

후속 UI 적용을 완료해 런타임 snapshot도156개로 변경했다. 고정 계약은 content/catalog/model-selection-156.json이다. AA 측정303개를 프로필별로 표시하고 기존 검수10개와 참고 후보146개를 구분한다. 설정/버전 매핑 및 제품군 검수는 계속 필요하다. 이전253/300개 파일은 비교 기록으로 보존한다.

## 이전 확정 결정 · 253개 (2026-11-10)

사용자가 캐시 가격을 포함한253개안을 확정했다. 아래300개 권장안은 이전 비교안이며 최종 선택은253개다. `output/model-audit/selected-253.json`에 대표 endpoint 원문과 후보AA ID, 정확한 변수별 보유 건수를 저장했다. 앱 런타임 목록/DB/운영 발행은 이번 결정 기록 단계에서 변경하지 않았다.

필수 OpenRouter 필드는 아래12개에 `pricing.input_cache_read`를 더한13개다. 모두253개에서 존재한다. AA 연결 후보144개, 속도·중앙값 지연127개, 종합 성능45개다. 기존 검수 완료 매핑은 이253개 안에서9개다. AA 조건별 수치는 후보 기준이며 최종 연결 검수 결과가 아니다.

분야별 후보: 재무48/전략50/법률48/의료43/공학45/경제48. AA 가격 후보: 입력135/출력135/캐시읽기124/캐시쓰기26. Performance v3 평균3개는 각각131개, 벤치마크 총비용/과제당비용은 각각45개다. 후보 설정별 결측을 다른 설정에서 채우지 않는다.

## 이전 비교안 결론

목록은 OpenRouter 기준300개로 구성하고 AA 수치는 선택 정보로 저장한다. 캐시 읽기 가격까지 모든 모델의 필수값으로 요구하면253개 구성이 가능하다. AA 속도/품질을 전 모델의 필수값으로 요구하면 현 대조 규칙의 후보수가200에 못 미친다.

운영 검수 완료 AA 매핑은 여전히10개다. 새 이름 대조 결과는 후보이며 버전/추론 설정/측정 제공자 검수 완료로 간주하지 않는다. 아래 AA 수치 보유 개수는 현재 대조 규칙에 대한 낙관적 시뮬레이션이며 모든 가능한 수동 매핑의 상한은 아니다.

## 정리 방법과 개수

- 텍스트 출력 및 유효한 입력/출력 가격을 갖춘 OpenRouter461행.
- canonical_slug 동일 항목을 묶어375개. free/batch/라우팅 변형86행 제거. 서로 다른 세대·mini/pro 등을 한 제품군이라고 합치지 않는다.
- 자동 라우팅/다중모델 오케스트레이션9개 제외: openrouter/*7개, nvidia/switchyard, typesafe/jev-router. 나머지366개는 context/max output/입출력 modality/지원 파라미터가 모두 존재한다.
- AA 매칭은 제작사 별칭 일치와 slug/이름 동일성으로 후보를 만들고 추론 강도 표기가 다른 행은 설정 검수 대상으로 남긴다. 서로 다른 AA 설정의 점수를 골라 합치거나 결측을 보충하지 않는다.
- 동일 canonical 모델의 대표는 일반 endpoint를 우선 선택한다. 가격이0인 endpoint를 임의의 무제한 무료 상품으로 간주하지 않는다. variants 목록은 분석 파일에 보존한다.

|조건|개수|
|---|---:|
|정리된 OpenRouter 공통 필드 모델|366|
|캐시 읽기 가격도 존재|253|
|AA ID/제품명 매칭 후보|186|
|AA 속도/지연4개 + OpenRouter 가격|156|
|AA 속도/지연4개 + AA 입출력 가격|156|
|위6개 + AA 캐시 읽기 가격|127|
|AA 종합 점수 + OpenRouter 가격|49|
|AA 종합 또는 분야별 점수가 하나 이상|54|
|AA 수치14개 전부 존재(중단 지표 제외)|41|

AA 조합은 반드시 같은 AA 행에서 동시에 충족해야 한다. 위 수치는 검수 후 감소하거나 새 별칭/설정 매핑 검토로 달라질 수 있다.

## 권장300개 선택

검수 기존10개, AA 수치 보유 후보, 캐시 가격 보유, AA ID 매칭 후보를 우선하고 동점이면 최신 OpenRouter created/ID로 선택했다. 발행 목록이 아닌 시뮬레이션 파일이다.

- 공통 필드300/300.
- 캐시 읽기 가격253/300.
- AA 매칭 후보186/300, 그중 속도/지연 후보156/300.
- 종합 점수 후보49/300, 종합/분야별 하나 이상54/300.
- 기존 검수 매핑10/300. 나머지 후보를 추천 근거로 자동 승격하지 않는다.

253개 캐시 필수안은 속도/지연 후보127, 종합 점수 후보45, AA 매칭 후보144, 기존 검수9개다. 따라서 모델 수와 AA 정보 커버리지를 함께 최대화하려면300개 + 캐시 선택 항목 구성이 유리하다.

## 필수 원본 필드 (300개안)

OpenRouter의 다음12개 경로를 저장한다.

```
id
canonical_slug
name
description
created
context_length
top_provider.max_completion_tokens
architecture.input_modalities
architecture.output_modalities
supported_parameters
pricing.prompt
pricing.completion
```

`created`는 OpenRouter 등록 시각이지 모델 출시일이 아니다. 제작사 표시는 id prefix/name에서 출처를 명시해 별도로 정규화하며 추론 API 제공자와 혼동하지 않는다. supported_parameters가 빈 배열인 것은 결측과 다르다. 기능별 지원 여부는 이 배열과 modality에서 파생하며 전 모델에 tools/JSON이 있다고 가정하지 않는다.

가격은 USD/토큰이며 100만 토큰당 표시는1,000,000을 곱한다. AA 가격으로 결측 보충하지 않는다. `pricing.input_cache_read`를13번째 필수 필드로 추가하면253개안이다. `top_provider.max_completion_tokens`는 OpenRouter가 제공한 대표 제공자 값이며 모든 endpoint의 동일 한도를 보장하지 않는다.

## 선택 AA 필드

```
intelligence_index_version                 # 응답 최상위 메타데이터
id
slug
name
release_date
model_creator.id
model_creator.name

evaluations.artificial_analysis_intelligence_index
evaluations.artificial_analysis_finance_and_accounting_index
evaluations.artificial_analysis_strategy_and_ops_index
evaluations.artificial_analysis_legal_index
evaluations.artificial_analysis_healthcare_and_medical_index
evaluations.artificial_analysis_engineering_index
evaluations.artificial_analysis_economics_index

performance.median_output_tokens_per_second
performance.median_time_to_first_token_seconds
performance.median_time_to_first_answer_token_seconds
performance.median_end_to_end_response_time_seconds

pricing.price_1m_input_tokens
pricing.price_1m_output_tokens
pricing.price_1m_cache_hit_tokens
pricing.price_1m_cache_write_tokens

performance_v3.mean_output_tokens_per_second
performance_v3.mean_time_to_first_token_seconds
performance_v3.mean_time_to_first_answer_token_seconds

artificial_analysis_intelligence_index_cost.total_cost
artificial_analysis_intelligence_index_cost.cost_per_task.total_cost
```

AA 가격은 USD/100만 토큰이다. 비용 비교에는 동일 OpenRouter 경로의 prompt/completion을 사용하고 AA 가격은 별도 출처 참고값으로 구분한다. 벤치마크 수행 비용은 앱의 요청당 요금이 아니다.

Coding/Agentic Index는 제공 중단으로 선정 필수 조건에서 제외한다. null을0점/0초/무료로 바꾸지 않는다.

## 앱 내부 감사용 필드 제안

```
model_group
model_group_policy_version
model_group_review_status
openrouter_fetched_at
aa_fetched_at
aa_mapping_status
aa_profiles[].aa_model_id
aa_profiles[].reasoning_effort
aa_profiles[].measurement_conditions
aa_profiles[].mapping_reviewed_at
aa_profiles[].mapping_evidence
recommendation_eligible
recommendation_exclusion_reason
```

위 항목은 API 원문이 아닌 AIMI 자체 관리 필드 제안이다. model_group은 가격/점수로 추정하지 않는다. AA profile은 실제 확인한 설정에만 연결한다。

## 재현·산출물

`node tools/model-sync/audit-coverage.mjs`

- output/model-audit/openrouter-current.json: 이번 공개 API 원본.
- output/model-audit/coverage.json: 모델별 후보 AA ID/설정명/필드 유무/대표 endpoint와 집계.
- output/model-audit/selected-300.json: 300개 선택 시뮬레이션. 발행/검증 완료 매핑이 아니다.

出典: [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties), [AA API reference](https://artificialanalysis.ai/data-api/docs/reference).
