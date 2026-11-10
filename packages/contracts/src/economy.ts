/** User-approved economy policy. Gameplay budget is separate from spendable EP. */
export const ECONOMY_POLICY = Object.freeze({
  version: "aimi-economy-v3",
  attendance: 3,
  tip: 1,
  // Coin opportunities are seeded per play; EP requires physical collection.
  coinCountMin: 4,
  coinCountMax: 7,
  epCapPerPlay: 7,
  epCapPerDay: 15,
  challengeBase: 10,
  challengeBonusCap: 5,
  challengeSavingRate: 0.1,
  dailyMaximum: 34,
});
export function challengeRewardEP(budget: number, cost: number) {
  return (
    ECONOMY_POLICY.challengeBase +
    Math.min(
      ECONOMY_POLICY.challengeBonusCap,
      Math.floor(
        Math.max(0, budget - cost) * ECONOMY_POLICY.challengeSavingRate,
      ),
    )
  );
}
export const SHOP_PRICES: Record<string, number> = {
  seed: 0,
  bunny: 140,
  bear: 140,
  cloud: 180,
  plant: 60,
  fence: 80,
  flower: 30,
  bench: 100,
  "carrot-bed": 60,
  "strawberry-bed": 70,
  "pumpkin-bed": 80,
  "tomato-trellis": 90,
  "mushroom-patch": 50,
  "herb-crate": 60,
  "apple-tree": 100,
  "lemon-tree": 100,
  "cherry-tree": 100,
  "round-shrub": 60,
  "little-pond": 180,
  "garden-rocks": 40,
  "watering-can": 35,
  wheelbarrow: 90,
  "milk-can": 40,
  "hay-bale": 40,
  "harvest-basket": 40,
  "wood-sign": 35,
  "picnic-mat": 60,
  "parasol-table": 150,
  hammock: 150,
  "bird-house": 80,
  "weather-vane": 90,
  "garden-lamp": 50,
  greenhouse: 240,
  "garden-well": 200,
  windmill: 250,
  "wood-bridge": 180,
  "mushroom-house": 220,
  "garden-fountain": 240,
  chick: 120,
  duck: 130,
  cat: 160,
  puppy: 160,
  hamster: 140,
  squirrel: 250,
  fox: 280,
  frog: 150,
  raccoon: 280,
  hedgehog: 300,
};
export function shopPrice(id: string) {
  const price = SHOP_PRICES[id];
  if (!Number.isSafeInteger(price) || price < 0)
    throw new Error("MISSING_SHOP_PRICE: " + id);
  return price;
}

/** Keyword puzzle v3: one submitted attempt, no per-keyword/model fee. */
export const PUZZLE_ATTEMPT_COST = 30;
