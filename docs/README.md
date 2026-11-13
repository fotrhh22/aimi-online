# AIMI 문서

**현재 서비스는 앱인토스 배포 완료 상태다.** 현재 코드와 정책은 아래 문서에서 확인한다.

처음 작업할 때는 [구현·운영 상태](current/IMPLEMENTATION_STATUS.md) → [실제 구조](current/PROJECT_STRUCTURE.md) → [로컬 개발](current/DEVELOPMENT.md)을 읽는다. 배포 변경은 [운영 업데이트](current/DEPLOYMENT.md)를 따른다.

## 현재 기준

- [AIMI 뒤로가기·내부 왕복 정책](current/BACK_NAVIGATION_POLICY.md)
- [에셋·챌린지·날짜별 운영 설계](current/CONTENT_AND_ASSET_OPERATIONS.md)
- [AIMI 운영 유지보수·배포](current/DEPLOYMENT.md)
- [AIMI 로컬 개발](current/DEVELOPMENT.md)
- [챌린지 보상 확인 지급 (2026-11-11, 로컬 구현)](current/EP_ECONOMY_POLICY.md)
- [시도별 게임 배치 보강 (2026-11-11)](current/GAME_RANDOMIZATION_V12.md)
- [게임 점수·완주·보상 정책 v1](current/GAME_SCORING_AND_REWARDS.md)
- [정원 자유 배치](current/GARDEN_FREE_PLACEMENT.md)
- [AIMI 현재 구현·운영 상태](current/IMPLEMENTATION_STATUS.md)
- [키워드 퍼즐 v4 — 조합별 결과·개수 힌트](current/KEYWORD_PUZZLE_V4.md)
- [모델 수명주기·작업 유형 전수 감사](current/MODEL_LIFECYCLE_AUDIT.md)
- [출력 분야 직접 선택·분야별 분석 (2026-11-11)](current/MULTIMODAL_RECOMMENDATION.md)
- [AIMI 현재 구조](current/PROJECT_STRUCTURE.md)
- [출력 분야 직접 선택·분야별 분석 (2026-11-11)](current/RECOMMENDATION_POLICY.md)
- [AIMI 운영 업데이트 점검](current/RELEASE_READINESS.md)
- [> **현재 운영 인증 기준.** 앱인토스 배포 완료 후에도 토스 익명 인증 코드 교환·mTLS·서버 세션을 사용한다. 이전 웹 시연의 접속 코드 인증은 종료됐으며 현재 사용자 진입 방식이 아니다.](current/TOSS_ANONYMOUS_AUTH.md)
- [앱인토스 최종 산출물·UI/UX 인수 계약](current/TOSS_DELIVERY_AND_ACCEPTANCE.md)
- [앱인토스 공식 구현 자료](current/TOSS_REFERENCES.md)
- [공통 UI 선행 정의와 의존 관계](current/UI_COMPONENT_CONTRACTS.md)
- [> 2026-11-13 공식 비게임 정책 반영: 팝업의 기존 왼쪽 실행/오른쪽 취소 규칙을 폐기한다. 왼쪽은 배경 없는 ‘닫기’, 오른쪽은 진한 실행 버튼이다. 거래 중에도 닫기/뒤로가기/네이티브×를 막지 않으며 완료 여부는 서버 기록에서 재조회한다. 보상 확인창을 닫아도 pending 보상은 유지하고 홈·해설에서 다시 받을 수 있다. 본문 세로 CTA의 위 실행/아래 텍스트 규칙은 유지한다.](current/UI_LAYOUT_AND_INTERACTION_RULES.md)

## 과거 기록

[기록 목록](archive/README.md) · [운영 이력](archive/RELEASE_HISTORY.md)

초기 계획·날짜별 감사·UX 보강 과정·종료된 Vercel 시연 자료는 archive에 보관한다. 실제 정책과 충돌하면 과거 기록을 현재 지시로 적용하지 않는다. 상세 초기 폴더 설명도 archive로 통합했다.
