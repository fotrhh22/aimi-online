# 모델 수명주기·작업 유형 전수 감사

보고 기준: 2026-11-11 00:08:10 Asia/Seoul. 정책 model-availability-v1.

공개 메타데이터254개 전부 조회 성공. 완성·이미지·영상 생성 요청0회. 실제 계정의 호출 성공이나 품질을 검증한 기록은 아니다.

## 현재 적용 결과

| 분야 | 원본 후보 | 현재 기본 목록 | 상태 조건 통과* |
|---|---:|---:|---:|
| 텍스트 | 156 | 144 | 125 |
| 이미지 | 61 | 45 | 43 |
| 영상 | 33 | 25 | 25 |
| 음악·오디오 | 4 | 0 | 0 |

* 상태 통과는 추천 확정 개수가 아니다. 분야별 지원·품질·비용 조건을 추가 검사해 최대3개만 추천한다.

최신 사용자 결정으로 텍스트·이미지·영상만 제공한다. 음악·음성·대화형 오디오·전사·임베딩·검색 재정렬·구조화 판단은 목록과 추천에서 제외한다. 사용자 요청이 이 분야라면 UNSUPPORTED_OUTPUT으로 안내하며 텍스트 모델로 대신 추천하지 않는다.

## 주요 결정

- 이미지45개는 고정된 1차 검토 후보다. 참조 필수5개·SVG6개(겹침2개), 공식 종료1개·제공자 없음1개·제품 연결 보류5개를 중복 없이 합쳐16개 제외했다. 실제 생성 성공 검수45개라는 뜻이 아니다.
- 공식 API 종료와 별도 제공자의 호스팅은 구분한다. GPT Image1 등 공식 종료는 기본 목록에서 보류하며, 공개 가중치가 있는 Mistral Small3.0의 다른 제공자가 존재한다는 기록도 보존한다.
- 영상 편집2개(FLUX Video Edit/Runway Aleph2), 업스케일1개, 사진 기반 아바타1개는 용도가 다르므로 제외한다. 종료됐다는 뜻은 아니다.
- Seedance2.0/2.0Fast, Gemini Omni1.2Flash, Lyria3ProPreview는 수집 응답의 모든 경로가 비활성 상태다. 영구 종료와 혼동하지 않고 제공 상태 보류로 기록한다.
- GPT Audio/Audio Mini는 대화형 오디오이며 음악 생성과 구분했다. 최신 사용자 결정에 따라 음악을 포함한 모든 오디오 자체를 제외한다.
- 폐기 예정·가입 제한·Deprecated는 안내와 함께 탐색할 수 있지만 신규 추천에서 제외한다. 날짜만 있는 폐기 안내는 한국 날짜 시작부터 보수적으로 보류한다. 이 시각을 제공자의 실제 전세계 종료 시각으로 단정하지 않는다.
- Seedance1.5Pro는 수집 당시 한국11/10에는 예정이었고 한국11/11부터 보류한다. 이로 인해 영상26개가 현재25개로 줄었다.
- DeepSeek 공식 deepseek-chat 별칭 종료를 별도 호스팅된 V3 전체 종료로 확대 해석하지 않는다. API ID와 제공자 경로를 개별 확인했다.

## 검증 범위·출처

OpenAI·Google·Anthropic·Mistral·Kimi 공식 상태 표와 DeepSeek·Runway·xAI·Cohere 관련 공식 문서를 대조했다. 그 외에는 기존 모델별 공급사 제품 근거를 재사용하고 공개 제공자 경로를 확인했다. 전 공급사의 모든 종료 공지를 빠짐없이 조사했다거나 목록에 남은 전 모델의 실제 호출을 완료했다고 표현하지 않는다.

공식 출처의 검토 시점은 content/policies/lifecycle-sources-v1.json에 별도 고정한다. 엔드포인트 재수집만으로 공식 공지 검토 시점을 새로 바꾸지 않는다. 7일 지난 감사·미감사 신규 ID·미래 검토 시점·제공자0개는 신규 추천에서 보류한다.

## 검증 결과

타입 검사·빌드·자동 테스트73개 통과. 제공 상태 정책·45개 제한·날짜 경과·감사 신선도·미감사 모델·미지원 출력의 대체 추천 차단을 검증했다. 실제 미리보기 API 응답은 http-smoke.json에 기록한다. 브라우저 검증과 생성/완성 호출은 생략했다. 원격DB/Render/토스·Git commit/push는 실행하지 않았다.

## 파일·실행

- content/catalog/model-availability.json:254행의 개별 상태·근거·제공자·정책.
- content/catalog/image-candidates-45.json:고정 이미지 후보 ID45개.
- content/policies/lifecycle-sources-v1.json:공식 검토 출처와 시점.
- data/model-sources/lifecycle/2026-11-10/:공개 전체 원본·개별 엔드포인트254개·수집 결과. 수집은 한국11/10, 최종 보고·반영은11/11.
- npm run models:audit:collect:공개 상태 재수집. 공급사 공지 검토를 자동으로 완료하지 않는다.
- npm run models:audit:build:검토된 공지+공개 상태로 정책 재생성.
- npm run models:audit:report:현재 날짜 기준 적용 결과·전체 결정표 갱신.

## 전체254개 결정표

| 분야 | 모델 | 상태 | 현재 노출 | 상태상 신규 추천 | 안내일 | 이슈·근거 |
|---|---|---|---|---|---|---|
| audio | google/lyria-3-clip-preview | out-of-scope | 제외 | 보류 | — | excluded_output_scope · [제공자 검사](https://openrouter.ai/api/v1/models/google/lyria-3-clip-preview-20260330/endpoints) |
| audio | google/lyria-3-pro-preview | unavailable | 제외 | 보류 | — | no_active_provider_path, excluded_output_scope · [제공자 검사](https://openrouter.ai/api/v1/models/google/lyria-3-pro-preview-20260330/endpoints) |
| audio | openai/gpt-audio | scheduled | 제외 | 보류 | 2027-01-20 | official_shutdown_notice, conversational_audio_not_music, excluded_output_scope · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-audio/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| audio | openai/gpt-audio-mini | scheduled | 제외 | 보류 | 2027-01-20 | official_shutdown_notice, conversational_audio_not_music, excluded_output_scope · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-audio-mini/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| image | black-forest-labs/flux-3-image | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux-3-image/endpoints) |
| image | black-forest-labs/flux-3-image-klein | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux-3-image-klein/endpoints) |
| image | black-forest-labs/flux.2-flex | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux.2-flex/endpoints) |
| image | black-forest-labs/flux.2-klein-4b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux.2-klein-4b/endpoints) |
| image | black-forest-labs/flux.2-max | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux.2-max/endpoints) |
| image | black-forest-labs/flux.2-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/black-forest-labs/flux.2-pro/endpoints) |
| image | bytedance-seed/seedream-4.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-4.5/endpoints) |
| image | bytedance-seed/seedream-5-0-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-5-0-flash/endpoints) |
| image | bytedance-seed/seedream-5-0-lite | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-5-0-lite/endpoints) |
| image | bytedance-seed/seedream-5-0-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-5-0-pro/endpoints) |
| image | google/gemini-2.5-flash-image | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/google/gemini-2.5-flash-image/endpoints) |
| image | google/gemini-3-pro-image | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/google/gemini-3-pro-image/endpoints) |
| image | google/gemini-3.1-flash-image | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/google/gemini-3.1-flash-image/endpoints) |
| image | google/gemini-3.1-flash-lite-image | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/google/gemini-3.1-flash-lite-image/endpoints) |
| image | google/gemini-nano-banana-2.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/google/gemini-nano-banana-2.1/endpoints) |
| image | krea/k3-edit | held | 제외 | 보류 | — | reference_required · [제공자 검사](https://openrouter.ai/api/v1/images/models/krea/k3-edit/endpoints) |
| image | krea/krea-2-large | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/krea/krea-2-large/endpoints) |
| image | krea/krea-2-medium | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/krea/krea-2-medium/endpoints) |
| image | krea/krea-2-medium-turbo | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/krea/krea-2-medium-turbo/endpoints) |
| image | meta/muse-image | unavailable | 제외 | 보류 | — | no_endpoint · [제공자 검사](https://openrouter.ai/api/v1/images/models/meta/muse-image/endpoints) |
| image | microsoft/mai-image-2.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/microsoft/mai-image-2.5/endpoints) |
| image | microsoft/mai-image-2.5-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/microsoft/mai-image-2.5-pro/endpoints) |
| image | microsoft/mai-image-2.6 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/microsoft/mai-image-2.6/endpoints) |
| image | microsoft/mai-image-2.6-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/microsoft/mai-image-2.6-flash/endpoints) |
| image | openai/gpt-5-image | held | 제외 | 보류 | — | combined_product_unconfirmed · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-5-image/endpoints) |
| image | openai/gpt-5-image-mini | scheduled | 제외 | 보류 | 2026-12-01 | openrouter_expiration, combined_product_unconfirmed · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-5-image-mini/endpoints) |
| image | openai/gpt-5.4-image-2 | held | 제외 | 보류 | — | combined_product_unconfirmed · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-5.4-image-2/endpoints) |
| image | openai/gpt-image-1 | retired | 제외 | 보류 | 2026-10-23 | official_shutdown_notice, official_retired · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-1/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| image | openai/gpt-image-1-mini | scheduled | 표시 | 보류 | 2026-12-01 | openrouter_expiration, official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-1-mini/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| image | openai/gpt-image-2 | scheduled | 표시 | 보류 | 2027-02-10 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-2/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| image | openai/gpt-image-2.5-flare | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-2.5-flare/endpoints) |
| image | openai/gpt-image-2.5-sunburst | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-2.5-sunburst/endpoints) |
| image | openai/gpt-image-2.6-flare | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-2.6-flare/endpoints) |
| image | openai/gpt-image-2.6-sunburst | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/openai/gpt-image-2.6-sunburst/endpoints) |
| image | qwen/qwen-image-2.1-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-2.1-pro/endpoints) |
| image | qwen/qwen-image-2.1-turbo | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-2.1-turbo/endpoints) |
| image | qwen/qwen-image-3 | held | 제외 | 보류 | — | product_mapping_unconfirmed · [제공자 검사](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-3/endpoints) |
| image | qwen/qwen-image-3-pro | held | 제외 | 보류 | — | product_mapping_unconfirmed · [제공자 검사](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-3-pro/endpoints) |
| image | recraft/recraft-v3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v3/endpoints) |
| image | recraft/recraft-v4 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4/endpoints) |
| image | recraft/recraft-v4-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-pro/endpoints) |
| image | recraft/recraft-v4-pro-vector | held | 제외 | 보류 | — | svg_only · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-pro-vector/endpoints) |
| image | recraft/recraft-v4-styles | held | 제외 | 보류 | — | reference_required · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles/endpoints) |
| image | recraft/recraft-v4-styles-pro | held | 제외 | 보류 | — | reference_required · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-pro/endpoints) |
| image | recraft/recraft-v4-styles-pro-vector | held | 제외 | 보류 | — | reference_and_svg · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-pro-vector/endpoints) |
| image | recraft/recraft-v4-styles-vector | held | 제외 | 보류 | — | reference_and_svg · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-vector/endpoints) |
| image | recraft/recraft-v4-vector | held | 제외 | 보류 | — | svg_only · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-vector/endpoints) |
| image | recraft/recraft-v4.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1/endpoints) |
| image | recraft/recraft-v4.1-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-flash/endpoints) |
| image | recraft/recraft-v4.1-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-pro/endpoints) |
| image | recraft/recraft-v4.1-pro-vector | held | 제외 | 보류 | — | svg_only · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-pro-vector/endpoints) |
| image | recraft/recraft-v4.1-utility | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-utility/endpoints) |
| image | recraft/recraft-v4.1-utility-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-utility-pro/endpoints) |
| image | recraft/recraft-v4.1-vector | held | 제외 | 보류 | — | svg_only · [제공자 검사](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-vector/endpoints) |
| image | sourceful/riverflow-v2-fast | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2-fast/endpoints) |
| image | sourceful/riverflow-v2-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2-pro/endpoints) |
| image | sourceful/riverflow-v2.5-fast | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.5-fast/endpoints) |
| image | sourceful/riverflow-v2.5-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.5-pro/endpoints) |
| image | sourceful/riverflow-v2.6-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.6-pro/endpoints) |
| image | tencent/hy-image-v3.5-preview | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/tencent/hy-image-v3.5-preview/endpoints) |
| image | x-ai/grok-imagine-image-2.0 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/images/models/x-ai/grok-imagine-image-2.0/endpoints) |
| text | anthropic/claude-fable-5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-5-fable-20260609/endpoints) |
| text | anthropic/claude-fable-5.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-fable-5.1-20260831/endpoints) |
| text | anthropic/claude-haiku-5.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-haiku-5.5-20261007/endpoints) |
| text | anthropic/claude-opus-4.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-4.5-opus-20251124/endpoints) |
| text | anthropic/claude-opus-4.6 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-4.6-opus-20260205/endpoints) |
| text | anthropic/claude-opus-4.7 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-4.7-opus-20260416/endpoints) |
| text | anthropic/claude-opus-4.8 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-4.8-opus-20260528/endpoints) |
| text | anthropic/claude-opus-5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-opus-5-20260723/endpoints) |
| text | anthropic/claude-opus-5.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-opus-5.5-20260921/endpoints) |
| text | anthropic/claude-sonnet-4.6 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-4.6-sonnet-20260217/endpoints) |
| text | anthropic/claude-sonnet-5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-sonnet-5-20260630/endpoints) |
| text | anthropic/claude-sonnet-5.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/anthropic/claude-sonnet-5.5-20260928/endpoints) |
| text | cohere/command-a | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/cohere/command-a-03-2025/endpoints) |
| text | cohere/command-a-plus | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/cohere/command-a-plus-05-2026/endpoints) |
| text | cohere/north-mini-code:free | unavailable | 제외 | 보류 | — | no_endpoint · [제공자 검사](https://openrouter.ai/api/v1/models/cohere/north-mini-code-20260617/endpoints) |
| text | deepseek/deepseek-chat | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-chat-v3/endpoints) |
| text | deepseek/deepseek-chat-v3-0324 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-chat-v3-0324/endpoints) |
| text | deepseek/deepseek-chat-v3.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-chat-v3.1/endpoints) |
| text | deepseek/deepseek-v3.1-terminus | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v3.1-terminus/endpoints) |
| text | deepseek/deepseek-v4-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-20260423/endpoints) |
| text | deepseek/deepseek-v4-flash-0731 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-flash-20260731/endpoints) |
| text | deepseek/deepseek-v4-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-pro-20260423/endpoints) |
| text | deepseek/deepseek-v4-pro-0813 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-pro-20260813/endpoints) |
| text | deepseek/deepseek-v4.1-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash-20260910/endpoints) |
| text | deepseek/deepseek-v4.1-flash-1017 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash-20261017/endpoints) |
| text | google/gemini-2.5-flash | scheduled | 표시 | 보류 | 2026-12-01 | official_scheduled · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-2.5-flash/endpoints) · [검토 근거](https://ai.google.dev/gemini-api/docs/deprecations) |
| text | google/gemini-2.5-flash-lite | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-2.5-flash-lite/endpoints) |
| text | google/gemini-2.5-pro | scheduled | 표시 | 보류 | 2026-12-01 | official_scheduled · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-2.5-pro/endpoints) · [검토 근거](https://ai.google.dev/gemini-api/docs/deprecations) |
| text | google/gemini-3-flash-preview | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3-flash-preview-20251217/endpoints) |
| text | google/gemini-3.1-flash-lite | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.1-flash-lite-20260507/endpoints) |
| text | google/gemini-3.1-flash-lite-preview | retired | 제외 | 보류 | 2026-05-25 | official_retired · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.1-flash-lite-preview-20260303/endpoints) · [검토 근거](https://ai.google.dev/gemini-api/docs/deprecations) |
| text | google/gemini-3.1-pro-preview | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.1-pro-preview-20260219/endpoints) |
| text | google/gemini-3.5-flash | redirected | 제외 | 보류 | — | official_redirected · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.5-flash-20260519/endpoints) · [검토 근거](https://ai.google.dev/gemini-api/docs/deprecations) |
| text | google/gemini-3.5-flash-lite | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.5-flash-lite-20260721/endpoints) |
| text | google/gemini-3.6-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.6-flash-20260721/endpoints) |
| text | google/gemini-3.8-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-3.8-flash-20260902/endpoints) |
| text | google/gemini-4-argon | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-4-argon-20261013/endpoints) |
| text | google/gemma-4-26b-a4b-it | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemma-4-26b-a4b-it-20260403/endpoints) |
| text | google/gemma-4-31b-it | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemma-4-31b-it-20260402/endpoints) |
| text | ibm-granite/granite-4.2-8b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/ibm-granite/granite-4.2-8b-20260831/endpoints) |
| text | inclusionai/ling-3.0-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/inclusionai/ling-3.0-flash-20260723/endpoints) |
| text | inclusionai/ling-3.0-tiny | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/inclusionai/ling-3.0-tiny-20260806/endpoints) |
| text | inclusionai/ling-3.1-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/inclusionai/ling-3.1-flash-20261002/endpoints) |
| text | meta-llama/llama-4-maverick | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta-llama/llama-4-maverick-17b-128e-instruct/endpoints) |
| text | meta-llama/llama-4-scout | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta-llama/llama-4-scout-17b-16e-instruct/endpoints) |
| text | meta/muse-spark-1.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta/muse-spark-1.1-20260709/endpoints) |
| text | meta/muse-spark-1.2 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta/muse-spark-1.2-20260805/endpoints) |
| text | meta/muse-spark-1.3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta/muse-spark-1.3-20260902/endpoints) |
| text | meta/muse-spark-open | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta/muse-spark-open-20261015/endpoints) |
| text | meta/muse-wonder | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/meta/muse-wonder-20261012/endpoints) |
| text | microsoft/phi-4 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/microsoft/phi-4/endpoints) |
| text | minimax/minimax-m2.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/minimax-m2.5-20260211/endpoints) |
| text | minimax/minimax-m2.7 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/minimax-m2.7-20260318/endpoints) |
| text | minimax/minimax-m3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/minimax-m3-20260531/endpoints) |
| text | minimax/minimax-m3.1-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/minimax-m3.1-flash-20261019/endpoints) |
| text | mistralai/mistral-large-4-0 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/mistralai/mistral-large-4-0-20261006/endpoints) |
| text | mistralai/mistral-medium-3 | deprecated | 표시 | 보류 | — | official_deprecated · [제공자 검사](https://openrouter.ai/api/v1/models/mistralai/mistral-medium-3/endpoints) · [검토 근거](https://docs.mistral.ai/models/mistral-medium-3-25-05) |
| text | mistralai/mistral-medium-3-5 | deprecated | 표시 | 보류 | — | official_deprecated · [제공자 검사](https://openrouter.ai/api/v1/models/mistralai/mistral-medium-3.5-20260430/endpoints) · [검토 근거](https://docs.mistral.ai/models/mistral-medium-3-5-26-04) |
| text | mistralai/mistral-small-24b-instruct-2501 | retired | 제외 | 보류 | 2025-11-30 | official_retired · [제공자 검사](https://openrouter.ai/api/v1/models/mistralai/mistral-small-24b-instruct-2501/endpoints) · [검토 근거](https://docs.mistral.ai/models/mistral-small-3-0-25-01) |
| text | mistralai/mistral-small-2603 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/mistralai/mistral-small-2603/endpoints) |
| text | moonshotai/kimi-k2 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k2/endpoints) |
| text | moonshotai/kimi-k2-0905 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k2-0905/endpoints) |
| text | moonshotai/kimi-k2-thinking | deprecated | 표시 | 보류 | — | official_deprecated · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k2-thinking-20251106/endpoints) · [검토 근거](https://platform.kimi.ai/docs/models) |
| text | moonshotai/kimi-k2.5 | deprecated | 표시 | 보류 | 2026-11-18 | openrouter_expiration, official_deprecated · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k2.5-0127/endpoints) · [검토 근거](https://platform.kimi.ai/docs/models) |
| text | moonshotai/kimi-k2.6 | restricted | 표시 | 보류 | — | official_restricted · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k2.6-20260420/endpoints) · [검토 근거](https://platform.kimi.ai/docs/models) |
| text | moonshotai/kimi-k2.7-code | restricted | 표시 | 보류 | — | official_restricted · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k2.7-code-20260612/endpoints) · [검토 근거](https://platform.kimi.ai/docs/models) |
| text | moonshotai/kimi-k3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k3-20260715/endpoints) |
| text | moonshotai/kimi-k3.1-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/moonshotai/kimi-k3.1-pro-20261023/endpoints) |
| text | nvidia/nemotron-3-super-120b-a12b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/nvidia/nemotron-3-super-120b-a12b-20230311/endpoints) |
| text | nvidia/nemotron-3-ultra-550b-a55b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/nvidia/nemotron-3-ultra-550b-a55b-20260604/endpoints) |
| text | nvidia/nemotron-3.5-lightning | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/nvidia/nemotron-3.5-lightning-20260807/endpoints) |
| text | nvidia/nemotron-3.5-super-vl | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/nvidia/nemotron-3.5-super-vl-20261015/endpoints) |
| text | openai/gpt-4-turbo:batch | retired | 제외 | 보류 | 2026-10-23 | no_endpoint, official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4-turbo/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-4.1 | scheduled | 표시 | 보류 | 2027-01-14 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4.1-2025-04-14/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-4.1-mini | scheduled | 표시 | 보류 | 2027-01-14 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4.1-mini-2025-04-14/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-4.1-nano | retired | 제외 | 보류 | 2026-10-23 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4.1-nano-2025-04-14/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-4o | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4o/endpoints) |
| text | openai/gpt-4o-2024-05-13 | retired | 제외 | 보류 | 2026-10-23 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4o-2024-05-13/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-4o-2024-08-06 | scheduled | 표시 | 보류 | 2027-01-14 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4o-2024-08-06/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-4o-mini | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-4o-mini/endpoints) |
| text | openai/gpt-5 | scheduled | 표시 | 보류 | 2026-12-11 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5-2025-08-07/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5-mini | scheduled | 표시 | 보류 | 2026-12-11 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5-mini-2025-08-07/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5-nano | scheduled | 표시 | 보류 | 2026-12-11 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5-nano-2025-08-07/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.1 | scheduled | 표시 | 보류 | 2027-04-01 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.1-20251113/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.1-codex | retired | 제외 | 보류 | 2026-07-23 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.1-codex-20251113/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.1-codex-mini | retired | 제외 | 보류 | 2026-07-23 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.1-codex-mini-20251113/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.2 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.2-20251211/endpoints) |
| text | openai/gpt-5.2-codex | retired | 제외 | 보류 | 2026-07-23 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.2-codex-20260114/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.3-codex | scheduled | 표시 | 보류 | 2027-04-01 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.3-codex-20260224/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.4 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.4-20260305/endpoints) |
| text | openai/gpt-5.4-mini | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.4-mini-20260317/endpoints) |
| text | openai/gpt-5.4-nano | scheduled | 표시 | 보류 | 2027-04-01 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.4-nano-20260317/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/gpt-5.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.5-20260423/endpoints) |
| text | openai/gpt-5.6-luna | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.6-luna-20260709/endpoints) |
| text | openai/gpt-5.6-sol | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.6-sol-20260709/endpoints) |
| text | openai/gpt-5.6-terra | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-5.6-terra-20260709/endpoints) |
| text | openai/gpt-6-astra | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-6-astra-20260903/endpoints) |
| text | openai/gpt-6-luna | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-6-luna-20260922/endpoints) |
| text | openai/gpt-6-sol | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-6-sol-20260922/endpoints) |
| text | openai/gpt-6.1-sol | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-6.1-sol-20260929/endpoints) |
| text | openai/gpt-6.1-terra | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-6.1-terra-20261026/endpoints) |
| text | openai/gpt-oss-120b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-oss-120b/endpoints) |
| text | openai/gpt-oss-20b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/openai/gpt-oss-20b/endpoints) |
| text | openai/o3 | scheduled | 표시 | 보류 | 2026-12-11 | official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/o3-2025-04-16/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/o3-mini:batch | retired | 제외 | 보류 | 2026-10-23 | no_endpoint, official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/o3-mini-2025-01-31/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | openai/o4-mini:batch | retired | 제외 | 보류 | 2026-10-23 | no_endpoint, official_shutdown_notice · [제공자 검사](https://openrouter.ai/api/v1/models/openai/o4-mini-2025-04-16/endpoints) · [검토 근거](https://developers.openai.com/api/docs/deprecations) |
| text | qwen/qwen-2.5-72b-instruct | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen-2.5-72b-instruct/endpoints) |
| text | qwen/qwen3-14b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-14b-04-28/endpoints) |
| text | qwen/qwen3-235b-a22b-2507 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-235b-a22b-07-25/endpoints) |
| text | qwen/qwen3-30b-a3b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-30b-a3b-04-28/endpoints) |
| text | qwen/qwen3-32b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-32b-04-28/endpoints) |
| text | qwen/qwen3-coder-30b-a3b-instruct | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-coder-30b-a3b-instruct/endpoints) |
| text | qwen/qwen3-coder-next | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-coder-next-2025-02-03/endpoints) |
| text | qwen/qwen3-next-80b-a3b-instruct | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-next-80b-a3b-instruct-2509/endpoints) |
| text | qwen/qwen3-vl-235b-a22b-instruct | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-vl-235b-a22b-instruct/endpoints) |
| text | qwen/qwen3-vl-30b-a3b-instruct | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3-vl-30b-a3b-instruct/endpoints) |
| text | qwen/qwen3.5-122b-a10b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.5-122b-a10b-20260224/endpoints) |
| text | qwen/qwen3.5-27b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.5-27b-20260224/endpoints) |
| text | qwen/qwen3.5-35b-a3b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.5-35b-a3b-20260224/endpoints) |
| text | qwen/qwen3.5-397b-a17b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.5-397b-a17b-20260216/endpoints) |
| text | qwen/qwen3.5-9b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.5-9b-20260310/endpoints) |
| text | qwen/qwen3.6-27b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.6-27b-20260422/endpoints) |
| text | qwen/qwen3.6-35b-a3b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.6-35b-a3b-20260415/endpoints) |
| text | qwen/qwen3.6-plus | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.6-plus-04-02/endpoints) |
| text | qwen/qwen3.7-max | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.7-max-20260520/endpoints) |
| text | qwen/qwen3.7-plus | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.7-plus-20260602/endpoints) |
| text | qwen/qwen3.8-2.4t-a95b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.8-2.4t-a95b-20260812/endpoints) |
| text | qwen/qwen3.8-27b | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.8-27b-20260814/endpoints) |
| text | qwen/qwen3.8-max-0902 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/qwen/qwen3.8-max-20260902/endpoints) |
| text | rekaai/reka-flash-3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/rekaai/reka-flash-3/endpoints) |
| text | stepfun/step-3.5-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/stepfun/step-3.5-flash/endpoints) |
| text | stepfun/step-3.7-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/stepfun/step-3.7-flash-20260528/endpoints) |
| text | stepfun/step-5-preview | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/stepfun/step-5-preview-20261008/endpoints) |
| text | tencent/hy3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/tencent/hy3-20260706/endpoints) |
| text | thinkingmachines/inkling | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/thinkingmachines/inkling-20260715/endpoints) |
| text | thinkingmachines/inkling-small | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/thinkingmachines/inkling-small-20260730/endpoints) |
| text | upstage/solar-mini4 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/upstage/solar-mini4-20260922/endpoints) |
| text | upstage/solar-pro4 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/upstage/solar-pro4-20260810/endpoints) |
| text | x-ai/grok-4.20 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-4.20-20260309/endpoints) |
| text | x-ai/grok-4.3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-4.3-20260430/endpoints) |
| text | x-ai/grok-4.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-4.5-20260708/endpoints) |
| text | x-ai/grok-4.6 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-4.6-20260810/endpoints) |
| text | x-ai/grok-4.7 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-4.7-20260916/endpoints) |
| text | xiaomi/mimo-v2.6-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash-20260921/endpoints) |
| text | xiaomi/mimo-v2.6-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-pro-20260921/endpoints) |
| text | z-ai/glm-4.5-air | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-4.5-air/endpoints) |
| text | z-ai/glm-4.5v | scheduled | 표시 | 보류 | 2026-12-31 | openrouter_expiration · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-4.5v/endpoints) |
| text | z-ai/glm-4.6 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-4.6/endpoints) |
| text | z-ai/glm-4.6v | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-4.6-20251208/endpoints) |
| text | z-ai/glm-4.7 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-4.7-20251222/endpoints) |
| text | z-ai/glm-4.7-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-4.7-flash-20260119/endpoints) |
| text | z-ai/glm-5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-5-20260211/endpoints) |
| text | z-ai/glm-5.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-5.1-20260406/endpoints) |
| text | z-ai/glm-5.2 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-5.2-20260616/endpoints) |
| text | z-ai/glm-5.3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-5.3-20260816/endpoints) |
| text | z-ai/glm-5.3-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/z-ai/glm-5.3-flash-20260826/endpoints) |
| video | alibaba/happyhorse-1.0 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/alibaba/happyhorse-1.0-20260624/endpoints) |
| video | alibaba/happyhorse-1.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/alibaba/happyhorse-1.1-20260624/endpoints) |
| video | alibaba/wan-2.6 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/alibaba/wan-2.6-20260327/endpoints) |
| video | alibaba/wan-2.7 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/alibaba/wan-2.7-20260414/endpoints) |
| video | alibaba/wan-3.0 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/alibaba/wan-3.0-20260824/endpoints) |
| video | alibaba/wan-3.0-prime | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/alibaba/wan-3.0-prime-20260827/endpoints) |
| video | black-forest-labs/flux-3-video | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/black-forest-labs/flux-3-video-20260804/endpoints) |
| video | black-forest-labs/flux-video-edit | specialized | 제외 | 보류 | — | specialized_video_workflow · [제공자 검사](https://openrouter.ai/api/v1/models/black-forest-labs/flux-video-edit-20260910/endpoints) · [검토 근거](https://openrouter.ai/black-forest-labs/flux-video-edit) |
| video | black-forest-labs/flux-video-upscale | specialized | 제외 | 보류 | — | specialized_video_workflow · [제공자 검사](https://openrouter.ai/api/v1/models/black-forest-labs/flux-video-upscale-20260819/endpoints) · [검토 근거](https://openrouter.ai/black-forest-labs/flux-video-upscale) |
| video | bytedance/seedance-1-5-pro | scheduled | 제외 | 보류 | 2026-11-11 | openrouter_expiration · [제공자 검사](https://openrouter.ai/api/v1/models/bytedance/seedance-1-5-pro-20260320/endpoints) |
| video | bytedance/seedance-2.0 | unavailable | 제외 | 보류 | — | no_active_provider_path · [제공자 검사](https://openrouter.ai/api/v1/models/bytedance/seedance-2.0-20260414/endpoints) |
| video | bytedance/seedance-2.0-fast | unavailable | 제외 | 보류 | — | no_active_provider_path · [제공자 검사](https://openrouter.ai/api/v1/models/bytedance/seedance-2.0-fast-20260414/endpoints) |
| video | bytedance/seedance-2.0-mini | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/bytedance/seedance-2.0-mini-20260811/endpoints) |
| video | bytedance/seedance-2.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/bytedance/seedance-2.5-20260807/endpoints) |
| video | google/gemini-omni-1.1-flash | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-omni-1.1-flash-20260911/endpoints) |
| video | google/gemini-omni-1.2-flash | unavailable | 제외 | 보류 | — | no_active_provider_path · [제공자 검사](https://openrouter.ai/api/v1/models/google/gemini-omni-1.2-flash-20261105/endpoints) |
| video | google/veo-3.1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/veo-3.1-20260320/endpoints) |
| video | google/veo-3.1-fast | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/veo-3.1-fast-20260320/endpoints) |
| video | google/veo-3.1-lite | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/google/veo-3.1-lite-20260331/endpoints) |
| video | heygen/avatar-iv | specialized | 제외 | 보류 | — | specialized_video_workflow · [제공자 검사](https://openrouter.ai/api/v1/models/heygen/avatar-iv-20260625/endpoints) · [검토 근거](https://openrouter.ai/heygen/avatar-iv) |
| video | heygen/heygen-video-1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/heygen/heygen-video-1-20260930/endpoints) |
| video | kwaivgi/kling-v3.0-pro | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/kwaivgi/kling-v3.0-pro-20260429/endpoints) |
| video | kwaivgi/kling-v3.0-std | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/kwaivgi/kling-v3.0-std-20260429/endpoints) |
| video | kwaivgi/kling-video-o1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/kwaivgi/kling-video-o1-20260420/endpoints) |
| video | minimax/hailuo-2.3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/hailuo-2.3-20260420/endpoints) |
| video | minimax/hailuo-3 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/hailuo-03-20260730/endpoints) |
| video | minimax/hailuo-3-max | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/minimax/hailuo-3-max-20260901/endpoints) |
| video | runway/aleph-2 | specialized | 제외 | 보류 | — | specialized_video_workflow · [제공자 검사](https://openrouter.ai/api/v1/models/runway/aleph-2-20260729/endpoints) · [검토 근거](https://openrouter.ai/runway/aleph-2) |
| video | runway/gen-4.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/runway/gen-4.5-20260729/endpoints) |
| video | tbc/mischief-1 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/tbc/mischief-1-20261023/endpoints) |
| video | x-ai/grok-imagine-video | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-imagine-video-20260512/endpoints) |
| video | x-ai/grok-imagine-video-1.5 | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-imagine-video-1.5-20260719/endpoints) |
| video | x-ai/grok-imagine-video-1.5-lite | available | 표시 | 허용 | — | 공개 경로 확인 · [제공자 검사](https://openrouter.ai/api/v1/models/x-ai/grok-imagine-video-1.5-lite-20261001/endpoints) |
