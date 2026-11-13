# 이미지 챌린지10일 전수 검수 결과

2026-11-11. Codex가 실제10개 이미지를 직접 열고114개 조건·기존 후보462개를 대조했다. 기존 이미지를 재생성/편집하지 않고 관찰 가능한 정답·키워드와 학습 해설을 새 v3 콘텐츠로 작성했다. 이번 검수자는 AI이며 사람 검수·운영 발행·원격 DB 반영 완료를 의미하지 않는다.

## 전체 요약

|Day|정답 수 이전→수정|후보 수 이전→수정|주요 판단|
|---|---|---|---|
|day-01|8→7|32→21|c06 제외|
|day-02|9→9|39→26|c09: 3D 캐릭터풍|
|day-03|11→11|40→30|c04: 금속 느낌|
|day-04|9→9|37→25|보이는 정답 유지·대상별 후보 구분|
|day-05|10→10|35→28|c07: 발이 지면에서 떨어진 / c10: 픽셀아트|
|day-06|9→9|43→27|c01: 오리 모양 / c04: 원형 받침|
|day-07|14→13|57→36|c13 제외|
|day-08|13→13|50→38|보이는 정답 유지·대상별 후보 구분|
|day-09|12→12|45→35|c02: 주요 산장 한 채|
|day-10|19→17|84→48|c16 제외 / c18 제외 / c12: 로봇의 화면 오른쪽 / c15: 물을 뿌리고 있다|

기존 정답114개 중4개 모호한 조건을 제외해110개를 사용한다. 후보는462개에서314개로 정리했다. 각 Day의 모든 기존 후보에 유지/제외/대체 이유를 review.json으로 남겼다. 무관한 추가 장면 오답과 과일을 용기·동물로 쓰는 부적절한 후보 등을 제거했고, 색/개수가 어느 대상에 적용되는지 공개 레이블과 선택 문장에 명시했다.

## 제작 기록 보존

기존 generated-10d-v2는 수정하지 않았다. 새 버전의 authored_prompt도 당시 요청을 그대로 보존했다. 정답 프롬프트는 검수 후 장면 설명인 answer_prompt를 사용하며 실제 생성 요청은 별도 펼침 영역에 표시한다. 기존 진행 중인 v2는 버전 조회로 보존한다.

모든10일의 원본 생성 파일/표시 이미지의 RGBA 픽셀이 동일하다. 요청 모델·prompt도 보존한 manifest와 일치한다. 응답의 responseModel 필드는10개 모두 null이므로 실제 모델명은 요청/실행 메타데이터 기준이지 공급사 응답으로 독립 검증된 버전명이 아니다. 근거: content/challenges/reviewed-10d-v3/generation-evidence.json.

## day-01

![day-01 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-01.png)

붉은 사과 두 개가 가로로 놓이고 흰 종이 바탕과 수채화 번짐이 보인다. 시점은 정면에 가까워 내려다보기 정답은 부적절하다. 잎의 초록색과 과육 표면의 밝은 얼룩은 사과 주색과 구분한다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-01-c01|사과|사과|confirmed|
|day-01-c02|두 개|두 개|confirmed|
|day-01-c03|빨간색|빨간색|confirmed|
|day-01-c04|가로로 나란히|가로로 나란히|confirmed|
|day-01-c05|흰색 배경|흰색 배경|confirmed|
|day-01-c06|위에서 내려다본|채점/후보 제외|excluded_ambiguous|
|day-01-c07|화면 중앙|화면 중앙|confirmed|
|day-01-c08|수채화|수채화|confirmed|

**정답 키워드**

사과 · 사과 두 개 · 사과 색: 빨간색 · 가로로 나란히 · 흰색 배경 · 화면 중앙 · 수채화

**검수 후 정답 프롬프트**

흰색 배경의 화면 중앙에 빨간 사과 두 개를 가로로 나란히 놓은 수채화.

**당시 생성 원문**

빨간색 사과 두 개를 흰색 배경 위에 가로로 나란히 놓은 수채화. 위에서 내려다본 장면이며 사과는 화면 중앙에 배치한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-01/review.json).

## day-02

![day-02 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-02.png)

흰 토끼 한 마리의 귀부터 발까지 보이고 목에 노란 목도리가 감겨 있다. 눈이 덮인 지형과 입체적인 캐릭터 표현이 보인다. 사진과 렌더링을 제작 기법으로 양분하는 후보는 제외한다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-02-c01|토끼|토끼|confirmed|
|day-02-c02|한 마리|한 마리|confirmed|
|day-02-c03|흰색|흰색|confirmed|
|day-02-c04|목도리|목도리|confirmed|
|day-02-c05|노란색|노란색|confirmed|
|day-02-c06|두르고 있다|두르고 있다|confirmed|
|day-02-c07|설원|설원|confirmed|
|day-02-c08|전신|전신|confirmed|
|day-02-c09|3D 렌더|3D 캐릭터풍|revised_to_observed|

**정답 키워드**

토끼 · 토끼 한 마리 · 토끼 털 색: 흰색 · 목도리 · 목도리 색: 노란색 · 토끼와 목도리: 두르고 있다 · 설원 · 전신 · 3D 캐릭터풍

**검수 후 정답 프롬프트**

밝은 설원에서 흰색 토끼 한 마리가 노란색 목도리를 두르고 있다. 토끼의 전신이 보이는 3D 캐릭터풍 장면.

**당시 생성 원문**

밝은 설원에서 흰색 토끼 한 마리가 노란색 목도리를 두르고 있다.  
토끼의 전신을 보여주는 3D 렌더로 표현한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-02/review.json).

## day-03

![day-03 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-03.png)

왼쪽에 파란 로봇 한 대가 전신으로 서 있고 한 손을 들고 있다. 검은 별 하늘·모래와 파도·픽셀 형태가 분명하다. 금속은 반사 음영의 표현으로 한정한다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-03-c01|로봇|로봇|confirmed|
|day-03-c02|한 대|한 대|confirmed|
|day-03-c03|파란색|파란색|confirmed|
|day-03-c04|금속|금속 느낌|revised_to_observed|
|day-03-c05|서 있다|서 있다|confirmed|
|day-03-c06|한쪽 손을 들고 있다|한쪽 손을 들고 있다|confirmed|
|day-03-c07|해변|해변|confirmed|
|day-03-c08|검은 하늘|검은 하늘|confirmed|
|day-03-c09|전신|전신|confirmed|
|day-03-c10|화면 왼쪽|화면 왼쪽|confirmed|
|day-03-c11|픽셀아트|픽셀아트|confirmed|

**정답 키워드**

로봇 · 로봇 한 대 · 로봇 몸 색: 파란색 · 금속 느낌 · 서 있다 · 한쪽 손을 들고 있다 · 해변 · 검은 하늘 · 전신 · 화면 왼쪽 · 픽셀아트

**검수 후 정답 프롬프트**

파란색 금속 느낌의 로봇 한 대가 해변에 서 있다.  
로봇은 한쪽 손을 들고 있다.  
검은 하늘에 별이 빛나고 로봇의 전신은 화면 왼쪽에 보인다.  
픽셀아트로 표현한다.

**당시 생성 원문**

파란색 금속 로봇 한 대가 해변에 서 있다.  
로봇은 한쪽 손을 들고 있다. 배경에는 별이 빛나는 검은 하늘을 보여준다.  
로봇의 전신을 화면 왼쪽에 배치한다.  
장면을 픽셀아트로 표현한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-03/review.json).

## day-04

![day-04 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-04.png)

중앙의 보라 화분 안에서 녹색 선인장 한 개가 자라며 전체 배경은 노란색이다. 자연스러운 가시·광택·그림자가 있는 사진풍이다. 화분 하단의 어두운 음영을 별도의 주색으로 채점하지 않는다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-04-c01|선인장|선인장|confirmed|
|day-04-c02|한 개|한 개|confirmed|
|day-04-c03|초록색|초록색|confirmed|
|day-04-c04|보라색|보라색|confirmed|
|day-04-c05|화분|화분|confirmed|
|day-04-c06|안에|안에|confirmed|
|day-04-c07|노란색 배경|노란색 배경|confirmed|
|day-04-c08|화면 중앙|화면 중앙|confirmed|
|day-04-c09|사진풍|사진풍|confirmed|

**정답 키워드**

선인장 · 선인장 한 개 · 선인장 색: 초록색 · 화분 색: 보라색 · 화분 · 선인장 위치: 안에 · 노란색 배경 · 화면 중앙 · 사진풍

**검수 후 정답 프롬프트**

노란색 배경의 화면 중앙에 보라색 화분이 있다. 화분 안에 초록색 선인장 한 개가 보이는 사진풍 장면.

**당시 생성 원문**

노란색 배경의 화면 중앙에 보라색 화분을 놓는다.  
화분 안에 초록색 선인장 한 개가 있는 사진풍 장면을 만든다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-04/review.json).

## day-05

![day-05 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-05.png)

주황 여우 한 마리와 투명 헬멧, 크레이터가 있는 달 지면, 검은 하늘의 지구가 보인다. 발은 지면과 떨어져 있다. 모든 외곽과 지표가 픽셀 단위로 보인다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-05-c01|여우|여우|confirmed|
|day-05-c02|한 마리|한 마리|confirmed|
|day-05-c03|주황색|주황색|confirmed|
|day-05-c04|우주 헬멧|우주 헬멧|confirmed|
|day-05-c05|쓰고 있다|쓰고 있다|confirmed|
|day-05-c06|달 표면|달 표면|confirmed|
|day-05-c07|점프하고 있다|발이 지면에서 떨어진|revised_to_observed|
|day-05-c08|검은 하늘|검은 하늘|confirmed|
|day-05-c09|지구|지구|confirmed|
|day-05-c10|평면 만화|픽셀아트|revised_to_observed|

**정답 키워드**

여우 · 여우 한 마리 · 여우 털 색: 주황색 · 우주 헬멧 · 여우와 헬멧: 쓰고 있다 · 달 표면 · 발이 지면에서 떨어진 · 검은 하늘 · 지구 · 픽셀아트

**검수 후 정답 프롬프트**

달 표면 위에서 주황색 여우 한 마리가 우주 헬멧을 쓰고 발이 지면에서 떨어진 채 공중에 있다. 검은 하늘에 지구가 보이는 픽셀아트 장면.

**당시 생성 원문**

달 표면에 주황색 여우 한 마리가 등장한다. 여우는 우주 헬멧을 쓰고 있다.  
여우는 두 발이 땅에서 떨어진 모습으로 점프하고 있다.  
검은 하늘에 지구가 보이는 평면 만화 장면으로 표현한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-05/review.json).

## day-06

![day-06 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-06.png)

노란 종이 오리 옆면과 붉은 원형 받침, 푸른 종이 바탕, 겹친 종이 가장자리와 섬유 질감이 보인다. 인형/구형 공이라는 해석은 정답 강제에서 제외한다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-06-c01|오리 인형|오리 모양|revised_to_observed|
|day-06-c02|한 개|한 개|confirmed|
|day-06-c03|노란색|노란색|confirmed|
|day-06-c04|공|원형 받침|revised_to_observed|
|day-06-c05|빨간색|빨간색|confirmed|
|day-06-c06|위에|위에|confirmed|
|day-06-c07|파란색 배경|파란색 배경|confirmed|
|day-06-c08|옆면|옆면|confirmed|
|day-06-c09|종이 콜라주|종이 콜라주|confirmed|

**정답 키워드**

오리 모양 · 오리 모양 한 개 · 오리 모양 색: 노란색 · 원형 받침 · 원형 받침 색: 빨간색 · 오리 모양과 받침: 위에 · 파란색 배경 · 옆면 · 종이 콜라주

**검수 후 정답 프롬프트**

표현 방식: 종이 콜라주.  
주요 대상: 노란색 오리 모양 한 개.  
받침 대상: 빨간색 원형 받침.  
관계: 오리 모양을 원형 받침 위에 놓는다.  
배경: 파란색 배경.  
관점: 오리의 옆면이 보이도록 구성한다.

**당시 생성 원문**

표현 방식: 종이 콜라주.  
주요 대상: 노란색 오리 인형 한 개.  
받침 대상: 빨간색 공.  
관계: 오리 인형을 공 위에 놓는다.  
배경: 파란색 배경.  
관점: 오리 인형의 옆면이 보이도록 구성한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-06/review.json).

## day-07

![day-07 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-07.png)

곰이 자전거의 화면 왼쪽에 서 있고 노란 우산 손잡이를 잡고 있다. 빨간 프레임의 자전거와 나무·관목·산책로, 수채화 번짐이 보인다. 정확한 카메라 높이는 강제하지 않는다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-07-c01|곰|곰|confirmed|
|day-07-c02|한 마리|한 마리|confirmed|
|day-07-c03|갈색|갈색|confirmed|
|day-07-c04|우산|우산|confirmed|
|day-07-c05|노란색|노란색|confirmed|
|day-07-c06|들고 있다|들고 있다|confirmed|
|day-07-c07|자전거|자전거|confirmed|
|day-07-c08|빨간색|빨간색|confirmed|
|day-07-c09|왼쪽에|왼쪽에|confirmed|
|day-07-c10|서 있다|서 있다|confirmed|
|day-07-c11|공원|공원|confirmed|
|day-07-c12|전신|전신|confirmed|
|day-07-c13|눈높이|채점/후보 제외|excluded_ambiguous|
|day-07-c14|수채화|수채화|confirmed|

**정답 키워드**

곰 · 곰 한 마리 · 곰 털 색: 갈색 · 우산 · 우산 색: 노란색 · 곰과 우산: 들고 있다 · 자전거 · 자전거 색: 빨간색 · 자전거 기준 곰: 왼쪽에 · 서 있다 · 공원 · 전신 · 수채화

**검수 후 정답 프롬프트**

배경은 공원, 표현은 수채화다.  
주요 동물은 갈색 곰 한 마리다.  
곰은 노란색 우산을 들고 서 있다.  
곰 옆에는 빨간색 자전거가 있다.  
곰은 자전거의 왼쪽에 있고 전신이 보인다.

**당시 생성 원문**

공원을 배경으로 한 수채화 장면이다.  
주요 동물은 갈색 곰 한 마리다.  
곰의 소품은 우산이다.  
우산은 노란색이다.  
곰은 그 우산을 들고 있다.  
곰 옆에는 빨간색 자전거가 있다.  
곰은 자전거 왼쪽에 서 있다.  
곰의 전신이 보이는 눈높이 구도로 구성한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-07/review.json).

## day-08

![day-08 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-08.png)

해바라기 꽃머리 세 개, 노란 꽃잎·녹색 줄기, 물과 줄기가 비쳐 보이는 꽃병 한 개, 왼쪽의 파란 책과 나무 무늬 탁자가 보인다. 배경 상단은 흰색이다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-08-c01|사진풍|사진풍|confirmed|
|day-08-c02|흰색 배경|흰색 배경|confirmed|
|day-08-c03|나무|나무|confirmed|
|day-08-c04|투명한 유리|투명한 유리|confirmed|
|day-08-c05|꽃병|꽃병|confirmed|
|day-08-c06|한 개|한 개|confirmed|
|day-08-c07|해바라기|해바라기|confirmed|
|day-08-c08|세 송이|세 송이|confirmed|
|day-08-c09|노란색|노란색|confirmed|
|day-08-c10|초록색|초록색|confirmed|
|day-08-c11|책|책|confirmed|
|day-08-c12|파란색|파란색|confirmed|
|day-08-c13|왼쪽|왼쪽|confirmed|

**정답 키워드**

사진풍 · 흰색 배경 · 나무 · 투명한 유리 · 꽃병 · 꽃병 한 개 · 해바라기 · 해바라기 세 송이 · 해바라기 꽃잎 색: 노란색 · 해바라기 줄기 색: 초록색 · 책 · 책 표지 색: 파란색 · 꽃병 기준 책: 왼쪽

**검수 후 정답 프롬프트**

흰색 배경의 나무 탁자 위에 투명한 유리 꽃병 한 개가 있다. 꽃병에는 노란색 꽃잎과 초록색 줄기의 해바라기 세 송이가 꽂혀 있다. 꽃병 왼쪽에는 파란색 책이 놓인 사진풍 장면.

**당시 생성 원문**

사진풍 장면. 흰색 배경의 나무 탁자 위에 투명한 유리 꽃병 한 개가 있다.  
꽃병 안에 해바라기 세 송이를 꽂는다.  
해바라기의 꽃잎은 노란색이고 줄기는 초록색이다.  
꽃병의 왼쪽에는 파란색 책 한 권을 놓는다.  
꽃병과 책은 전체가 보이고 배경의 흰색 영역은 깨끗하게 유지한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-08/review.json).

## day-09

![day-09 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-09.png)

전경에 큰 산장 한 채와 빨간 눈 덮인 지붕·노란 창문빛이 보인다. 뒤의 침엽수와 하늘의 주황 열기구 두 대가 명확하다. 멀리 작은 건물들이 있어 한 채의 범위를 주요 산장으로 명시한다. 표면에는 붓자국 표현이 있다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-09-c01|산장|산장|confirmed|
|day-09-c02|한 채|주요 산장 한 채|revised_to_observed|
|day-09-c03|빨간색|빨간색|confirmed|
|day-09-c04|눈 덮인|눈 덮인|confirmed|
|day-09-c05|노란빛|노란빛|confirmed|
|day-09-c06|소나무|소나무|confirmed|
|day-09-c07|산장 뒤|산장 뒤|confirmed|
|day-09-c08|파란 하늘|파란 하늘|confirmed|
|day-09-c09|열기구|열기구|confirmed|
|day-09-c10|두 대|두 대|confirmed|
|day-09-c11|주황색|주황색|confirmed|
|day-09-c12|유화|유화|confirmed|

**정답 키워드**

산장 · 주요 산장 한 채 · 산장 지붕 색: 빨간색 · 눈 덮인 · 노란빛 · 소나무 · 산장 뒤 · 파란 하늘 · 열기구 · 열기구 두 대 · 열기구 풍선 색: 주황색 · 유화

**검수 후 정답 프롬프트**

눈 덮인 풍경을 유화로 표현한다.  
전경의 주요 산장은 한 채이며 지붕은 빨간색이다.  
산장 창문에서는 노란빛이 나온다.  
산장 뒤에는 소나무가 있다.  
파란 하늘에는 열기구 두 대가 떠 있다.  
두 열기구의 풍선 부분은 주황색이다.

**당시 생성 원문**

눈 덮인 산장을 중심으로 주변 풍경이 보이는 유화 장면을 만든다.  
산장은 한 채이며 지붕은 빨간색이다.  
산장의 창문에서는 노란빛이 새어 나온다.  
산장 뒤에는 소나무가 있다.  
맑은 파란 하늘에 열기구 두 대가 떠 있다.  
두 열기구의 풍선 부분은 주황색이다.  
산장과 열기구는 서로 가리지 않게 배치한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-09/review.json).

## day-10

![day-10 실제 검수 이미지](/Users/hunhokang/Downloads/esg_campaign/aimi-online/apps/miniapp/public/content/challenges/generated-10d-v2/day-10.png)

초록 로봇 한 대가 물뿌리개를 잡고 있고 물줄기/물방울이 나온다. 화면 오른쪽의 보라 화분 두 개에 선인장이 각각 하나씩 있다. 종이 겹침과 온실 프레임이 보이나 지붕 재질과 정확한 물 도착점·카메라 높이는 강제하지 않는다.

|조건|요청한 내용|검수 후 채점 내용|판정|
|---|---|---|---|
|day-10-c01|로봇|로봇|confirmed|
|day-10-c02|한 대|한 대|confirmed|
|day-10-c03|초록색|초록색|confirmed|
|day-10-c04|온실|온실|confirmed|
|day-10-c05|서 있다|서 있다|confirmed|
|day-10-c06|물뿌리개|물뿌리개|confirmed|
|day-10-c07|노란색|노란색|confirmed|
|day-10-c08|들고 있다|들고 있다|confirmed|
|day-10-c09|보라색|보라색|confirmed|
|day-10-c10|화분|화분|confirmed|
|day-10-c11|두 개|두 개|confirmed|
|day-10-c12|오른쪽|로봇의 화면 오른쪽|revised_to_observed|
|day-10-c13|가로로 나란히|가로로 나란히|confirmed|
|day-10-c14|선인장|선인장|confirmed|
|day-10-c15|물을 붓고 있다|물을 뿌리고 있다|revised_to_observed|
|day-10-c16|투명한 유리|채점/후보 제외|excluded_ambiguous|
|day-10-c17|화면 중앙|화면 중앙|confirmed|
|day-10-c18|눈높이|채점/후보 제외|excluded_ambiguous|
|day-10-c19|종이 콜라주|종이 콜라주|confirmed|

**정답 키워드**

로봇 · 로봇 한 대 · 로봇 몸 색: 초록색 · 온실 · 서 있다 · 물뿌리개 · 물뿌리개 색: 노란색 · 로봇과 도구: 들고 있다 · 화분 색: 보라색 · 화분 · 화분 두 개 · 화분 위치: 로봇의 화면 오른쪽 · 가로로 나란히 · 선인장 · 물을 뿌리고 있다 · 화면 중앙 · 종이 콜라주

**검수 후 정답 프롬프트**

초록색 로봇 한 대가 온실 안에 서 있다.  
로봇은 노란색 물뿌리개를 들고 물을 뿌리고 있다.  
로봇의 화면 오른쪽에는 보라색 화분 두 개가 가로로 나란히 있다.  
화분 안에는 선인장이 있다.  
로봇과 화분들이 화면 중앙에 모여 있다.  
종이 콜라주로 표현한다.

**당시 생성 원문**

초록색 로봇 한 대가 온실 안에서 서 있다.  
로봇은 노란색 물뿌리개를 들고 있다.  
로봇의 오른쪽에는 보라색 화분 두 개가 가로로 나란히 놓여 있다.  
각 화분 안에는 선인장이 한 개씩 있다.  
로봇은 화분 쪽으로 물을 붓고 있다.  
물뿌리개에서 화분으로 떨어지는 물줄기가 보인다.  
온실의 지붕은 투명한 유리로 표현한다.  
로봇과 두 화분의 전체 모습이 화면 중앙에 들어오게 한다.  
눈높이에서 본 종이 콜라주로 표현한다.

후보별 전체 판정: [review.json](/Users/hunhokang/Downloads/esg_campaign/aimi-online/content/challenges/reviewed-10d-v3/day-10/review.json).

## 구현과 검증

- 로컬 기본 문제는 reviewed-10d-v3. 기존/원격 활성 버전은 버전별 아카이브로 보존한다. 새 키워드ID는 새 버전에서만 사용한다.
- 종료 전 공개 응답에 정답/원문/해설은 넣지 않는다. 힌트15/제출30 예산과 규칙 채점은 유지한다.
- 일별 작성 포인트20개 + 모델 참고 설명10개. 원문14개 팁의 적용 모델/신규 생성 여부/실제 사용 형식을 대조했다.
- 사용자 요청 범위의 이미지·키워드·해설 검토를 완료해 reviewer_kind=ai, review.status=approved, release_ready=true로 기록했다. 이는 AI 검수이며 별도의 사람 검수라고 표시하지 않는다. published=false는 이번에 원격 발행하지 않았다는 경계다.
- 원격DB/Render/Actions 변경 및 이미지 재생성·유료 API 호출 없음.

## 최종 검증 결과

전체 테스트100개 통과. API/공유 패키지/미니앱 빌드 통과. 검수한114조건·462기존후보의 누락 여부,110정답/314후보의 ID·표시 중복, 정답/힌트/일치율 정합성, 모델 팁 승인/일치 필터,30개 해설의 날짜별 구분, 생성 원문 보존, 앱 이미지와 원본 픽셀 동일성, 진행 중 v2 유지까지 확인했다. Day03/06/07/09/10의 검수 후 예시도 기존의 줄별 지시/항목형/브리프/목록/상세 묘사 형식을 유지하며 UI에서 줄바꿈을 보존한다.

실제 이미지 조회는10장 모두 수행했다. 브라우저 전체 화면 시각 검증은 이번 범위에서 생략했다. 원격 발행이나 기존 메모리 서버 초기화는 하지 않았다. 현재 켜진 서버에서 확인하려면 API 재시작 후 새 로컬 계정/새 도전으로 시작해야 한다. 기존 계정의 시작된 문제는 의도적으로 v2를 유지한다.
