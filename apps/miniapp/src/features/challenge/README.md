# 목표/키워드/조합/판정 결과

기능 화면·도메인 컴포넌트·조회/행동 연결. 공통 ui/lib와 contracts에 의존하며 다른 feature의 내부 파일 직접 참조는 피한다. 세부 하위 폴더는 실제 코드가 필요할 때 생성한다.

상태: 2026-11-08 구조 준비. 실제 기능은 IMPLEMENTATION_STATUS.md를 확인한다.

실제 v1 구현 위치는 docs/PROTOTYPE_V1.md를 따른다. home/screens.tsx(홈/미션), garden/screens.tsx(정원/상점/소셜/계정), challenge/screens.tsx, optimizer/screens.tsx(개선/추천/상세)에 조합되어 있다.
