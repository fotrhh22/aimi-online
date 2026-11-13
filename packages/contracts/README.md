# 공유 계약

`src/index.ts`는 기존 보상·지갑·멱등성 Zod 계약을 유지하고 `prototype.ts`의 게임/챌린지/정원/온라인AI 입력 스키마와 공유 DTO를 내보낸다. 미니앱과 API가 사용하며 비밀·DB 연결·DOM·렌더러를 포함하지 않는다.

빌드: `npm run build:shared` (저장소 루트). 콘텐츠 생성기는 별도 개발이며 향후 공유 계약은 `src/content` 경계를 따른다. v1 샘플/실제 연동 구분과 실제 구현 위치는 `docs/archive/2026-11-development/PROTOTYPE_V1.md` 참조.
