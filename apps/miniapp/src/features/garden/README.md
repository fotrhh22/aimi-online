# 정원·수집함·상점

실제 구현은 screens.tsx와 docs/GARDEN_FREE_PLACEMENT.md를 따른다. 아이템 수량 구매/재구매, 남은 수량×N, instanceId별 자유 드래그/개별 회수/저장을 지원한다. 고정 슬롯은 이전 데이터 읽기 전용이다. 캐릭터는 종류당1개 소유하고 정원과 게임에 함께 적용한다.

공용 계약은 packages/contracts/src/garden.ts와 PurchaseInput/GardenInput, 서버 검증은 apps/api/src/modules/domain.ts에 있다. API와 클라이언트를 함께 갱신한다. 현재 검증·운영 제한은 docs/IMPLEMENTATION_STATUS.md를 확인한다.
