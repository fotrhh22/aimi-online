# 모델 제품군156개 재검토 결과

2026-11-10. 외부 모델 추가/제외 없이 기존156개를 검토하고 앱에 model-groups-v3를 반영했다. 아래 등급은 제작사 자료를 해석한 AIMI 제품군 정책이며 제작사가 발급한 공통 성능 등급이 아니다.

|등급|이전|변경 후|비중|
|---|---:|---:|---:|
|Small|20|32|20.5%|
|Medium|125|53|34.0%|
|High|11|71|45.5%|

## 판단 기준과 제한

- Small은 경량·효율 지향, Medium은 범용·균형 지향, High는 상위/전체 기능 제품군이다. 가격·AA 순위·추론 강도·이름 정규식으로 등급을 나누지 않는다. 공개된 총/활성 파라미터는 보조 자료로만 사용한다.
- 같은 계열에서도제품 목적을 확인했다. 예: Solar Mini4는Small, Solar Pro4는Medium, Step3.5Flash는High다.
- 구형 상위 제품은 단지 출시 시점이 오래됐다고Small로 낮추지 않았다. 그래서여러 출시세대와 고정 버전이 포함된 이번목록의High 비중이 최초가설30~40개보다 높다. 현재최고 성능순위/동일세대동등성 보장을 뜻하지 않는다. 실제 품질은 별도추천 필터에서 검사한다.
- 150개는 읽은 제작사 개별/제품군자료로 AIMI 판단을 검토했다. 이 중 제품군 페이지에 근거한 판단은 해당 버전의공식등급 인증이 아니라 추론이다. 각 행의근거와보관본 해시를JSON에기록했다. Meta5개는일차제품설명 부족으로추가확인 상태다. NVIDIA Super VL1개는접근제한/내용미확보로기존정책을유지하고근거보강상태다.
- Small32개는모두자료검토, Medium53개는52개자료검토+1개기존정책유지, High71개는66개자료검토+5개확인대기다.
- AA매핑과제품군검수는별개다. AA검수완료는기존10개이며기존일반업무추천은Small3/Medium2/High2개다. 이번제품군검토만으로새AA값을검증된추천근거로승격하지않았다.
- 타입검사·단위60개·전체빌드통과. 브라우저검증·실제LLM호출·외부DB/배포는수행하지않았다.

## 모델별 검토표

|모델 ID|이전→이후|근거 검토 상태|AIMI 판단|제작사 자료|
|---|---|---|---|---|
|openai/gpt-6.1-terra|Medium → Medium|자료 검토|제작사가 효율과 처리 능력의 균형을 지향하는 제품으로 소개해 균형형으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-6.1-terra)|
|moonshotai/kimi-k3.1-pro|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K3.1-Pro)|
|minimax/minimax-m3.1-flash|Medium → Medium|자료 검토|M3.1 Flash의 복합 작업과 실행 효율 지향을 함께 검토한 균형형 판단이에요.|[근거](https://huggingface.co/MiniMaxAI/MiniMax-M3.1-Flash)|
|deepseek/deepseek-v4.1-flash-1017|Medium → Medium|자료 검토|V4 Flash의 범용 처리·추론과 실행 효율 지향을 함께 고려한 균형형이에요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017)|
|meta/muse-spark-open|Medium → High|추가 확인|Muse의 상위 멀티모달 추론·장기 작업 포지션을 바탕으로 한 제안이에요. 버전별 제작사 근거 보강이 필요해요.|제작사 근거 추가 확인|
|nvidia/nemotron-3.5-super-vl|Medium → Medium|기존 정책·근거 보강|기존 정책의 균형형 포지션을 유지했어요. 제작사 문서의 추가 접근·근거 보강이 필요해요.|제작사 근거 추가 확인|
|google/gemini-4-argon|Medium → High|자료 검토|Argon·Pro의 복잡한 문제 해결 지향을 반영한 상위 제품군이에요.|[근거](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-argon)|
|meta/muse-wonder|Medium → High|추가 확인|Muse의 상위 멀티모달 추론·장기 작업 포지션을 바탕으로 한 제안이에요. 버전별 제작사 근거 보강이 필요해요.|제작사 근거 추가 확인|
|stepfun/step-5-preview|High → High|자료 검토|제작사의 대표 상위 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/stepfun-ai/Step-5-Preview)|
|anthropic/claude-haiku-5.5|Small → Small|자료 검토|Haiku 계열의 고빈도·낮은 지연 지향을 반영한 경량형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|mistralai/mistral-large-4-0|Medium → High|자료 검토|Mistral Large의 상위 범용 멀티모달 제품 포지션을 반영했어요.|[근거](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B)|
|inclusionai/ling-3.1-flash|Medium → Medium|자료 검토|범용 추론과 실행 효율을 함께 지향하는 제품으로 보아 균형형으로 판단했어요.|[근거](https://huggingface.co/inclusionAI/Ling-3.1-flash)|
|openai/gpt-6.1-sol|Medium → Medium|자료 검토|제작사가 효율과 처리 능력의 균형을 지향하는 제품으로 소개해 균형형으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-6.1-sol)|
|anthropic/claude-sonnet-5.5|Medium → Medium|자료 검토|Sonnet 계열의 속도와 처리 능력 균형 지향을 반영했어요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|upstage/solar-mini4|Medium → Small|자료 검토|제작사가 소형·효율 지향 제품으로 소개해 경량형으로 분류했어요.|[근거](https://console.upstage.ai/ko/docs/models/solar-mini-4)|
|cohere/command-a-plus|Medium → High|자료 검토|Command A 계열의 상위 기업용 범용·추론 제품 포지션을 반영해 상위형으로 재검토했어요.|[근거](https://docs.cohere.com/docs/models)|
|openai/gpt-6-luna|Medium → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-6-luna)|
|openai/gpt-6-sol|Medium → Medium|자료 검토|제작사가 효율과 처리 능력의 균형을 지향하는 제품으로 소개해 균형형으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-6-sol)|
|anthropic/claude-opus-5.5|High → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|xiaomi/mimo-v2.6-flash|Medium → Medium|자료 검토|Flash의 범용 처리와 실행 효율을 고려한 균형형 판단이에요.|[근거](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Flash-RL)|
|xiaomi/mimo-v2.6-pro|High → High|자료 검토|Pro의 상위 범용·복합 작업용 제품 포지션을 반영했어요.|[근거](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL)|
|x-ai/grok-4.7|Medium → High|자료 검토|해당 세대 Grok의 대표 범용 추론·코드 제품 포지션을 반영했어요. 추론 강도 High와는 달라요.|[근거](https://docs.x.ai/developers/models/grok-4.7)|
|deepseek/deepseek-v4.1-flash|Medium → Medium|자료 검토|V4 Flash의 범용 처리·추론과 실행 효율 지향을 함께 고려한 균형형이에요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash)|
|openai/gpt-6-astra|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-6-astra)|
|qwen/qwen3.8-max-0902|Medium → High|자료 검토|Max 또는 이에 대응하는 공개 상위 제품 포지션을 확인해 분류했어요.|[근거](https://www.alibabacloud.com/help/en/model-studio/text-generation-model/)|
|meta/muse-spark-1.3|Medium → High|추가 확인|Muse의 상위 멀티모달 추론·장기 작업 포지션을 바탕으로 한 제안이에요. 버전별 제작사 근거 보강이 필요해요.|제작사 근거 추가 확인|
|google/gemini-3.8-flash|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|anthropic/claude-fable-5.1|Medium → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|ibm-granite/granite-4.2-8b|Small → Small|자료 검토|소형 밀집 구조와 실용적인 기업·에이전트 배포 포지션을 함께 검토해 경량형으로 판단했어요.|[근거](https://huggingface.co/ibm-granite/granite-4.2-8b)|
|z-ai/glm-5.3-flash|Medium → Medium|자료 검토|특화 비전 처리 또는 효율 지향 변형으로 보아 균형형으로 판단했어요.|[근거](https://huggingface.co/zai-org/GLM-5.3-Flash)|
|z-ai/glm-5.3|Medium → High|자료 검토|해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요.|[근거](https://huggingface.co/zai-org/GLM-5.3)|
|qwen/qwen3.8-27b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.8-27B)|
|qwen/qwen3.8-2.4t-a95b|Medium → High|자료 검토|Max 또는 이에 대응하는 공개 상위 제품 포지션을 확인해 분류했어요.|[근거](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B)|
|deepseek/deepseek-v4-pro-0813|Medium → High|자료 검토|전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813)|
|x-ai/grok-4.6|Medium → High|자료 검토|해당 세대 Grok의 대표 범용 추론·코드 제품 포지션을 반영했어요. 추론 강도 High와는 달라요.|[근거](https://docs.x.ai/developers/models/grok-4.6)|
|nvidia/nemotron-3.5-lightning|Small → Small|자료 검토|높은 처리량·작은 실행 규모를 지향하는 Lightning 제품군으로 분류했어요.|[근거](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16)|
|upstage/solar-pro4|Medium → Medium|자료 검토|업무용 범용 처리와 실행 효율을 함께 지향해 균형형으로 분류했어요. Pro라는 이름만으로 상위형에 넣지 않았어요.|[근거](https://console.upstage.ai/ko/docs/models/solar-pro-4)|
|inclusionai/ling-3.0-tiny|Medium → Small|자료 검토|응답성과 작은 실행 규모를 지향하는 Tiny 제품 포지션을 반영했어요.|[근거](https://huggingface.co/inclusionAI/Ling-3.0-tiny)|
|meta/muse-spark-1.2|Medium → High|추가 확인|Muse의 상위 멀티모달 추론·장기 작업 포지션을 바탕으로 한 제안이에요. 버전별 제작사 근거 보강이 필요해요.|제작사 근거 추가 확인|
|deepseek/deepseek-v4-flash-0731|Medium → Medium|자료 검토|V4 Flash의 범용 처리·추론과 실행 효율 지향을 함께 고려한 균형형이에요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731)|
|thinkingmachines/inkling-small|Small → Small|자료 검토|제작사가 더 작고 효율적인 제품 변형으로 소개한 점을 반영했어요.|[근거](https://huggingface.co/thinkingmachines/Inkling-Small)|
|anthropic/claude-opus-5|High → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|inclusionai/ling-3.0-flash|Medium → Small|자료 검토|제작사가 이전 대형 제품 대비 실행 효율·운영 배포를 강조한 제품으로 소개해 경량형으로 판단했어요.|[근거](https://huggingface.co/inclusionAI/Ling-3.0-flash)|
|google/gemini-3.6-flash|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|google/gemini-3.5-flash-lite|Small → Small|자료 검토|Flash-Lite의 경량·고빈도 처리 지향을 반영했어요.|[근거](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite?hl=en)|
|thinkingmachines/inkling|Medium → Medium|자료 검토|범용 멀티모달·개발자 활용 범위를 확인해 균형형으로 판단했어요. 큰 MoE 총 규모만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/thinkingmachines/Inkling)|
|moonshotai/kimi-k3|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K3)|
|meta/muse-spark-1.1|Medium → High|추가 확인|Muse의 상위 멀티모달 추론·장기 작업 포지션을 바탕으로 한 제안이에요. 버전별 제작사 근거 보강이 필요해요.|제작사 근거 추가 확인|
|openai/gpt-5.6-luna|Medium → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.6-luna)|
|openai/gpt-5.6-terra|Medium → Medium|자료 검토|제작사가 효율과 처리 능력의 균형을 지향하는 제품으로 소개해 균형형으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.6-terra)|
|openai/gpt-5.6-sol|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.6-sol)|
|x-ai/grok-4.5|Medium → High|자료 검토|해당 세대 Grok의 대표 범용 추론·코드 제품 포지션을 반영했어요. 추론 강도 High와는 달라요.|[근거](https://docs.x.ai/developers/models/grok-4.5)|
|tencent/hy3|Medium → Medium|자료 검토|범용 추론·에이전트 처리 포지션을 바탕으로 균형형으로 판단했어요. 상위 제품군이라는 단정은 보류했어요.|[근거](https://huggingface.co/tencent/Hy3)|
|anthropic/claude-sonnet-5|Medium → Medium|자료 검토|Sonnet 계열의 속도와 처리 능력 균형 지향을 반영했어요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|cohere/north-mini-code:free|Medium → Small|자료 검토|제작사가 로컬 실행 가능한 작은 활성 규모의 코드 모델로 소개해 경량형으로 분류했어요. 무료 여부는 기준이 아니에요.|[근거](https://huggingface.co/CohereLabs/North-Mini-Code-1.0)|
|z-ai/glm-5.2|Medium → High|자료 검토|해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요.|[근거](https://huggingface.co/zai-org/GLM-5.2)|
|moonshotai/kimi-k2.7-code|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K2.7-Code)|
|anthropic/claude-fable-5|Medium → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|nvidia/nemotron-3-ultra-550b-a55b|Medium → High|자료 검토|Ultra의 상위 추론·오케스트레이션 포지션을 반영했어요.|[근거](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16)|
|qwen/qwen3.7-plus|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://www.alibabacloud.com/help/en/model-studio/text-generation-model/)|
|minimax/minimax-m3|High → High|자료 검토|대규모 복합 생산성·에이전트 작업을 지향하는 기반 모델 포지션을 반영했어요.|[근거](https://huggingface.co/MiniMaxAI/Minimax-M3)|
|stepfun/step-3.7-flash|Medium → Medium|자료 검토|효율 지향 멀티모달 작업용 제품으로 보아 균형형으로 판단했어요.|[근거](https://huggingface.co/stepfun-ai/Step-3.7-Flash)|
|anthropic/claude-opus-4.8|High → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|qwen/qwen3.7-max|Medium → High|자료 검토|Max 또는 이에 대응하는 공개 상위 제품 포지션을 확인해 분류했어요.|[근거](https://www.alibabacloud.com/help/en/model-studio/text-generation-model/)|
|google/gemini-3.5-flash|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|google/gemini-3.1-flash-lite|Small → Small|자료 검토|Flash-Lite의 경량·고빈도 처리 지향을 반영했어요.|[근거](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite?hl=en)|
|x-ai/grok-4.3|Medium → High|자료 검토|해당 세대 Grok의 대표 범용 추론·코드 제품 포지션을 반영했어요. 추론 강도 High와는 달라요.|[근거](https://docs.x.ai/developers/models/grok-4.3)|
|mistralai/mistral-medium-3-5|Medium → Medium|자료 검토|Mistral Medium의 범용·기업 작업 균형 지향을 반영했어요.|[근거](https://docs.mistral.ai/models)|
|qwen/qwen3.6-35b-a3b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.6-35B-A3B)|
|qwen/qwen3.6-27b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.6-27B)|
|openai/gpt-5.5|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.5)|
|deepseek/deepseek-v4-pro|Medium → High|자료 검토|전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro)|
|deepseek/deepseek-v4-flash|Medium → Medium|자료 검토|V4 Flash의 범용 처리·추론과 실행 효율 지향을 함께 고려한 균형형이에요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash)|
|moonshotai/kimi-k2.6|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K2.6)|
|anthropic/claude-opus-4.7|High → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|z-ai/glm-5.1|Medium → High|자료 검토|해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요.|[근거](https://huggingface.co/zai-org/GLM-5.1)|
|google/gemma-4-26b-a4b-it|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://huggingface.co/google/gemma-4-26B-A4B-it)|
|google/gemma-4-31b-it|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://huggingface.co/google/gemma-4-31B-it)|
|qwen/qwen3.6-plus|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://www.alibabacloud.com/help/en/model-studio/text-generation-model/)|
|x-ai/grok-4.20|Medium → High|자료 검토|해당 세대 Grok의 대표 범용 추론·코드 제품 포지션을 반영했어요. 추론 강도 High와는 달라요.|[근거](https://docs.x.ai/developers/models/grok-4.20)|
|minimax/minimax-m2.7|Medium → High|자료 검토|대규모 복합 생산성·에이전트 작업을 지향하는 기반 모델 포지션을 반영했어요.|[근거](https://huggingface.co/MiniMaxAI/MiniMax-M2.7)|
|openai/gpt-5.4-nano|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.4-nano)|
|openai/gpt-5.4-mini|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.4-mini)|
|mistralai/mistral-small-2603|Small → Small|자료 검토|Mistral Small의 낮은 지연·효율 지향을 반영했어요.|[근거](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603)|
|nvidia/nemotron-3-super-120b-a12b|Medium → Medium|자료 검토|복합 에이전트 처리와 실행 효율을 함께 지향하는 Super 제품군이에요.|[근거](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8)|
|qwen/qwen3.5-9b|Medium → Small|자료 검토|동일 계열의 소형 밀집 구조와 효율 지향 설계를 함께 검토해 경량형으로 판단했어요. AIMI의 제품군 해석이에요.|[근거](https://huggingface.co/Qwen/Qwen3.5-9B)|
|openai/gpt-5.4|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.4)|
|google/gemini-3.1-flash-lite-preview|Small → Small|자료 검토|Flash-Lite의 경량·고빈도 처리 지향을 반영했어요.|[근거](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite?hl=en)|
|qwen/qwen3.5-35b-a3b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.5-35B-A3B)|
|qwen/qwen3.5-27b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.5-27B)|
|qwen/qwen3.5-122b-a10b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.5-122B-A10B)|
|openai/gpt-5.3-codex|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.3-codex)|
|google/gemini-3.1-pro-preview|High → High|자료 검토|Argon·Pro의 복잡한 문제 해결 지향을 반영한 상위 제품군이에요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|anthropic/claude-sonnet-4.6|Medium → Medium|자료 검토|Sonnet 계열의 속도와 처리 능력 균형 지향을 반영했어요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|qwen/qwen3.5-397b-a17b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3.5-397B-A17B)|
|minimax/minimax-m2.5|Medium → High|자료 검토|대규모 복합 생산성·에이전트 작업을 지향하는 기반 모델 포지션을 반영했어요.|[근거](https://huggingface.co/MiniMaxAI/MiniMax-M2.5)|
|z-ai/glm-5|Medium → High|자료 검토|해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요.|[근거](https://huggingface.co/zai-org/GLM-5)|
|anthropic/claude-opus-4.6|High → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|qwen/qwen3-coder-next|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-Coder-Next)|
|stepfun/step-3.5-flash|Medium → High|자료 검토|제작사가 가장 강력한 공개 기반 모델·상위 추론용으로 소개해 상위형으로 판단했어요. Flash라고 경량형으로 처리하지 않았어요.|[근거](https://huggingface.co/stepfun-ai/Step-3.5-Flash)|
|moonshotai/kimi-k2.5|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K2.5)|
|z-ai/glm-4.7-flash|Medium → Small|자료 검토|제작사가 경량 배포용 선택지로 소개한 모델이에요. Flash라는 이름이 아닌 배포 목적을 확인했어요.|[근거](https://huggingface.co/zai-org/GLM-4.7-Flash)|
|openai/gpt-5.2-codex|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.2-codex)|
|z-ai/glm-4.7|Medium → High|자료 검토|해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요.|[근거](https://huggingface.co/zai-org/GLM-4.7)|
|google/gemini-3-flash-preview|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|openai/gpt-5.2|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.2)|
|z-ai/glm-4.6v|Medium → Medium|자료 검토|특화 비전 처리 또는 효율 지향 변형으로 보아 균형형으로 판단했어요.|[근거](https://huggingface.co/zai-org/GLM-4.6V)|
|anthropic/claude-opus-4.5|High → High|자료 검토|Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.|[근거](https://platform.claude.com/docs/en/models/overview)|
|openai/gpt-5.1|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.1)|
|openai/gpt-5.1-codex|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.1-codex)|
|openai/gpt-5.1-codex-mini|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5.1-codex-mini)|
|moonshotai/kimi-k2-thinking|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K2-Thinking)|
|qwen/qwen3-vl-30b-a3b-instruct|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct)|
|z-ai/glm-4.6|Medium → High|자료 검토|해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요.|[근거](https://huggingface.co/zai-org/GLM-4.6)|
|qwen/qwen3-vl-235b-a22b-instruct|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct)|
|deepseek/deepseek-v3.1-terminus|Medium → High|자료 검토|전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus)|
|qwen/qwen3-next-80b-a3b-instruct|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct)|
|moonshotai/kimi-k2-0905|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905)|
|deepseek/deepseek-chat-v3.1|Medium → High|자료 검토|전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V3.1)|
|z-ai/glm-4.5v|Medium → Medium|자료 검토|특화 비전 처리 또는 효율 지향 변형으로 보아 균형형으로 판단했어요.|[근거](https://huggingface.co/zai-org/GLM-4.5V)|
|openai/gpt-5|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-5)|
|openai/gpt-5-mini|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5-mini)|
|openai/gpt-5-nano|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-5-nano)|
|openai/gpt-oss-120b|Medium → Medium|자료 검토|공개 모델의 범용 추론·자체 배포 포지션을 반영한 균형형이에요. 큰 총 파라미터 수만으로 상위형에 넣지 않았어요.|[근거](https://developers.openai.com/api/docs/models/gpt-oss-120b)|
|openai/gpt-oss-20b|Medium → Small|자료 검토|제작사가 낮은 지연과 로컬 실행을 지향하는 작은 공개 모델로 소개한 점을 반영했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-oss-20b)|
|qwen/qwen3-coder-30b-a3b-instruct|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct)|
|z-ai/glm-4.5-air|Medium → Small|자료 검토|제작사가 경량 변형으로 명시한 Air 제품군이에요. 총 파라미터 수만으로 등급을 정하지 않았어요.|[근거](https://huggingface.co/zai-org/GLM-4.5-Air)|
|google/gemini-2.5-flash-lite|Small → Small|자료 검토|Flash-Lite의 경량·고빈도 처리 지향을 반영했어요.|[근거](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite?hl=en)|
|qwen/qwen3-235b-a22b-2507|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507)|
|moonshotai/kimi-k2|Medium → High|자료 검토|해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.|[근거](https://huggingface.co/moonshotai/Kimi-K2-Instruct)|
|google/gemini-2.5-flash|Medium → Medium|자료 검토|Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|google/gemini-2.5-pro|High → High|자료 검토|Argon·Pro의 복잡한 문제 해결 지향을 반영한 상위 제품군이에요.|[근거](https://ai.google.dev/gemini-api/docs/models?hl=en)|
|mistralai/mistral-medium-3|Medium → Medium|자료 검토|Mistral Medium의 범용·기업 작업 균형 지향을 반영했어요.|[근거](https://docs.mistral.ai/models)|
|qwen/qwen3-30b-a3b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-30B-A3B)|
|qwen/qwen3-14b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-14B)|
|qwen/qwen3-32b|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen3-32B)|
|openai/o3|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/o3)|
|openai/o4-mini:batch|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/o4-mini)|
|openai/gpt-4.1|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-4.1)|
|openai/gpt-4.1-mini|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-4.1-mini)|
|openai/gpt-4.1-nano|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-4.1-nano)|
|meta-llama/llama-4-maverick|Medium → High|자료 검토|Scout 대비 상위 범용 멀티모달 제품 포지션을 반영했어요.|[근거](https://www.llama.com/models/llama-4/)|
|meta-llama/llama-4-scout|Medium → Medium|자료 검토|범용 멀티모달 처리와 실행 효율 지향을 반영한 균형형이에요.|[근거](https://www.llama.com/models/llama-4/)|
|deepseek/deepseek-chat-v3-0324|Medium → High|자료 검토|전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V3-0324)|
|cohere/command-a|Medium → High|자료 검토|해당 세대의 대표 범용·기업용 Command 제품군으로 보아 상위형으로 분류했어요.|[근거](https://docs.cohere.com/docs/models)|
|rekaai/reka-flash-3|Medium → Small|자료 검토|제작사가 작은 모델로 설명한 실행 효율 지향 제품이에요.|[근거](https://huggingface.co/RekaAI/reka-flash-3)|
|openai/o3-mini:batch|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/o3-mini)|
|mistralai/mistral-small-24b-instruct-2501|Small → Small|자료 검토|Mistral Small의 낮은 지연·효율 지향을 반영했어요.|[근거](https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501)|
|microsoft/phi-4|Medium → Small|자료 검토|제작사가 Small Language Model로 소개한 제품이에요. 추론 기능이 있어도 경량 제품군은 유지해요.|[근거](https://huggingface.co/microsoft/phi-4)|
|deepseek/deepseek-chat|Medium → High|자료 검토|전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요.|[근거](https://huggingface.co/deepseek-ai/DeepSeek-V3)|
|qwen/qwen-2.5-72b-instruct|Medium → Medium|자료 검토|범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.|[근거](https://huggingface.co/Qwen/Qwen2.5-72B-Instruct)|
|openai/gpt-4o-2024-08-06|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-4o)|
|openai/gpt-4o-mini|Small → Small|자료 검토|고빈도·효율 지향의 경량 제품군으로 분류했어요.|[근거](https://developers.openai.com/api/docs/models/gpt-4o-mini)|
|openai/gpt-4o|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-4o)|
|openai/gpt-4o-2024-05-13|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-4o)|
|openai/gpt-4-turbo:batch|Medium → High|자료 검토|해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.|[근거](https://developers.openai.com/api/docs/models/gpt-4-turbo)|
