# AIMI 개발 에이전트 규칙

## 기준 문서

START_HERE.md → docs/DEVELOPMENT_SPEC.md → design/DESIGN_SYSTEM.md → design/reference/AIMI_UX_Light.pdf. 현재 진행 상태는 docs/IMPLEMENTATION_STATUS.md를 갱신한다.

## 범위

- 앱인토스 온라인 미니앱. 기존 부모 폴더의 캠페인·프린터·자전거·토큰 확장 프로그램과 별개다.
- 작업·실행·의존성·출력은 이 폴더 안에 둔다. 부모 web/server/.env나 배포 설정을 재사용·수정하지 않는다.
- 게임: 길 건너기, Temple Run형, 크롬 다이노형. 하루 한 종류, 최대 5회. 이미지 챌린지 제출도 별도 최대 5회.
- 챌린지: 최신 키워드 퍼즐 v3는 정답 집합 정확 일치, 자유 입력 없음. 모델 선택/단어별 비용 없이 제출당30예산. 첫 실패 정답 수, 두 번째 실패부터 선택 오답, 예산상 재도전 불가 또는 성공 시 정답·원문·팁 공개. docs/KEYWORD_PUZZLE_V3.md를 따른다. 과거 예시의 모델 등급별 임계값 정책은 legacy 경로만 유지한다.
- 실제 토큰·전력·탄소·영수증·피트니스·OCR·Chrome 확장·게임 테마 판매 제외.
- 정원은 드래그 자유 배치. packages/contracts/src/garden.ts와 docs/GARDEN_FREE_PLACEMENT.md를 따른다. 고정 슬롯 제한은 삭제했으며 legacy slots는 이전 데이터 읽기 전용이다.
- EP는 정원 아이템·캐릭터 구매용. 한 캐릭터만 정원과 세 게임에서 사용.
- 추천은 Small/Medium/High + 공개 지표, 코드로 최대3개 선정. 챌린지의 저/고성능 2등급과 구분.
- 토스 로그인·자체 친구 관계·미니앱 딥링크 공유. 외부 다운로드 유도 없음.

## 구현

- 현재 v1 화면은 API 상태를 사용한다. 기본 개발 메모리 저장소의125EP 초기값와 실제 PostgreSQL 지갑/원장을 구분하며 운영에서 자동 fallback하지 않는다.
- API 입력/출력은 공유 타입·스키마로 맞춘다. DB·Gemini·토스 서버 비밀 키는 클라이언트 금지.
- SDK 3.x의 apps-in-toss.config.ts를 사용한다. 과거 granite.config.ts 예제를 무검증으로 적용하지 않는다.
- 공식 TDS 전환 시 API·Provider·버전 확인. 현재 사용자 정의 CSS를 TDS 공식 컴포넌트라 부르지 않는다.
- UI 간격·색상은 토큰 사용. 실제 토스 내비게이션과 자체 뒤로가기/닫기 중복 금지.
- 모바일 터치·키보드·스크롤·다이얼로그 접근성을 확인. 날짜 경계는 Asia/Seoul 서버 시간.
- 기능마다 적절한 검증을 실행. 거래·판정은 핵심 경계 테스트, 문구만 바꾸면 불필요한 테스트 추가 금지.
- 외부 서비스 생성·프로덕션 배포는 사용자 요청이 있을 때 진행. 이번 준비 폴더를 생성했다고 배포 완료로 표현하지 않는다.

## 앱인토스 산출물·공식 UX 준수

- docs/TOSS_DELIVERY_AND_ACCEPTANCE.md를 구현/최종 인수 기준으로 따른다. 공식 필수 가이드와 PDF가 충돌하면 공식 기준을 적용하고 차이를 기록한다.
- Phase1에서 실제 SDK/TDS 패키지·Provider 호환성을 확인하고 공통 UI에 적용한다. CSS 미리보기를 준수 완료로 표현하지 않는다.
- 최종 .ait+Render API+Supabase migration/콘텐츠+CI/수집+인수 기록을 제공한다. .ait 생성/업로드/실기기/심사/출시는 별도 상태다.
- 만점 결과의 챌린지 단일 CTA와 무관하게 SDK 닫기/시스템 뒤로가기·앱 이탈 경로는 항상 동작해야 한다.
